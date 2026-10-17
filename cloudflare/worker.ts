import {DurableObject} from 'cloudflare:workers';
import {MOVES,freshMatch,advanceMatch,nextRound} from '../lib/combat.mjs';
import {createAuth,fighterName} from './auth';

type Player={token:string;name:string;lastChat:number;userId?:string};
type Room={code:string;players:Player[];state:ReturnType<typeof freshMatch>;moves:(string|null)[];ready:string[];expires:number;closed:boolean;deadline?:number;missed?:number[]};
const cleanName=(name:string)=>name.trim().replace(/[<>]/g,'').slice(0,18)||'Fighter';
const newCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(3)),x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
const validToken=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9-]{36}$/.test(s);
const onlineAllowed=(env:Env)=>String(env.ONLINE_PLAY_ENABLED)==='true';

export class FightRoom extends DurableObject<Env>{
 private room:Room|null;
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)');const rows=ctx.storage.sql.exec<{data:string}>('SELECT data FROM room WHERE id=1').toArray();this.room=rows.length?JSON.parse(rows[0].data):null;}
 private persist(){this.ctx.storage.sql.exec('INSERT OR REPLACE INTO room (id,data) VALUES (1,?)',JSON.stringify(this.room));}
 private armTurn(){const r=this.room;if(!r)return;r.deadline=r.players.length===2&&!r.state.roundOver&&!r.closed?Date.now()+15000:0;this.ctx.waitUntil(this.ctx.storage.setAlarm(r.deadline||r.expires));}
 hasUser(userId:string){return !!this.room?.players.some(p=>p.userId===userId)}
 canResume(userId:string,token:string){const r=this.room;return !!r&&!r.closed&&r.expires>Date.now()&&r.players.some(p=>p.userId===userId&&p.token===token)}
 async initialize(code:string,name:string,token:string,userId?:string){if(this.room&&!this.room.closed&&this.room.expires>Date.now())return false;this.room={code,players:[{token,name:cleanName(name),lastChat:0,userId}],state:freshMatch(),moves:[null,null],ready:[],expires:Date.now()+3*60*60*1000,closed:false};this.persist();await this.ctx.storage.setAlarm(this.room.expires);return true;}
 reserve(name:string,token:string,onlineOnly=false,userId?:string){const r=this.room;if(!r||r.closed||r.expires<Date.now()||r.players.length!==1||r.players[0].token===token||(userId&&(!r.players[0].userId||r.players[0].userId===userId)))return false;if(onlineOnly&&!this.ctx.getWebSockets().some(ws=>ws.deserializeAttachment()?.token===r.players[0].token))return false;r.players.push({token,name:cleanName(name),lastChat:0,userId});r.missed=[0,0];this.armTurn();this.persist();return true;}
 private recordResult(){const r=this.room;if(!r?.state.finished||!r.players.every(p=>p.userId))return;this.ctx.waitUntil(this.env.DB.prepare('INSERT OR IGNORE INTO match_result(id,first_user,second_user,first_score,second_score,finished_at) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM user WHERE id IN (?,?))=2').bind(`${r.code}-${r.expires}`,r.players[0].userId,r.players[1].userId,...r.state.scores,Date.now(),r.players[0].userId,r.players[1].userId).run().catch(error=>console.error('Match result save failed',error)));}
 private send(ws:WebSocket,event:string,data?:unknown){try{ws.send(JSON.stringify({event,data}))}catch{}}
 private broadcast(){const r=this.room;if(!r)return;for(const ws of this.ctx.getWebSockets()){const a=ws.deserializeAttachment() as {token:string};const seat=r.players.findIndex(p=>p.token===a.token);if(seat<0)continue;this.send(ws,'match',{code:r.code,players:r.players.map(p=>({name:p.name})),seat,state:r.state,submitted:r.moves[seat]!==null,opponentReady:r.players.length===2&&r.moves[1-seat]!==null,deadline:r.deadline||0,serverTime:Date.now()});}}
 async fetch(request:Request){const r=this.room;if(request.headers.get('Upgrade')!=='websocket')return new Response('WebSocket required',{status:426});const token=new URL(request.url).searchParams.get('token');if(!r||r.closed||r.expires<Date.now()||!r.players.some(p=>p.token===token&&(!p.userId||p.userId===request.headers.get('X-Fighter-Id'))))return new Response('Room expired or invalid session',{status:403});
  for(const old of this.ctx.getWebSockets()){if(old.deserializeAttachment()?.token===token)old.close(1000,'Reconnected elsewhere')}
  const pair=new WebSocketPair();this.ctx.acceptWebSocket(pair[1]);pair[1].serializeAttachment({token,window:Date.now(),count:0});this.recordResult();this.broadcast();return new Response(null,{status:101,webSocket:pair[0]});
 }
 webSocketMessage(ws:WebSocket,raw:string|ArrayBuffer){
  if(!onlineAllowed(this.env)){ws.close(1000,'Online play is paused');this.ctx.waitUntil(this.ctx.storage.deleteAlarm());return}
  if(typeof raw!=='string'||raw.length>2048){ws.close(1009,'Message too large');return}const a=ws.deserializeAttachment() as {token:string;window:number;count:number};const now=Date.now();if(now-a.window>10000){a.window=now;a.count=0}a.count++;ws.serializeAttachment(a);if(a.count>45){this.send(ws,'notice','Easy, champ. Slow down.');return}
  const r=this.room;if(!r||r.closed||r.expires<now)return;const seat=r.players.findIndex(p=>p.token===a.token);if(seat<0)return;
  let msg:{event:string;data?:{move?:string;exchange?:number}|string};try{msg=JSON.parse(raw)}catch{return}if(!msg||typeof msg.event!=='string')return;
  if(msg.event==='move'){const d=msg.data;if(!d||typeof d!=='object'||typeof d.move!=='string'||!MOVES.includes(d.move)||d.exchange!==r.state.exchange||r.players.length!==2||r.state.roundOver||r.moves[seat]!==null)return;r.moves[seat]=d.move;if(r.moves.every(Boolean)){r.state=advanceMatch(r.state,r.moves[0],r.moves[1]);r.moves=[null,null];r.missed=[0,0];this.armTurn();this.recordResult()}this.persist();this.broadcast();}
  else if(msg.event==='next-round'&&r.state.roundOver&&!r.state.finished){if(!r.ready.includes(a.token))r.ready.push(a.token);if(r.ready.length===2){r.state=nextRound(r.state);r.ready=[];r.missed=[0,0];this.armTurn();this.persist();this.broadcast()}else{this.persist();this.send(ws,'notice','Waiting for your opponent to continue…')}}
  else if(msg.event==='chat'&&typeof msg.data==='string'&&now-r.players[seat].lastChat>=900){const text=msg.data.trim().slice(0,180);if(text){r.players[seat].lastChat=now;this.persist();for(const client of this.ctx.getWebSockets())this.send(client,'chat',{name:r.players[seat].name,text})}}
  else if(msg.event==='leave-room'){r.closed=true;r.deadline=0;this.persist();this.ctx.waitUntil(this.ctx.storage.setAlarm(r.expires));for(const client of this.ctx.getWebSockets()){this.send(client,'opponent-left');client.close(1000,'Room closed')}}
 }
 webSocketClose(){if(this.room?.closed)return;for(const client of this.ctx.getWebSockets())this.send(client,'notice','A fighter disconnected. Their seat is held for reconnection.');}
 webSocketError(ws:WebSocket){ws.close(1011,'Connection error')}
 async alarm(){
  const r=this.room;if(!r)return;
  if(!onlineAllowed(this.env)||r.closed||r.expires<=Date.now()){for(const ws of this.ctx.getWebSockets()){this.send(ws,'opponent-left');ws.close(1000,'Room ended')}await this.ctx.storage.deleteAlarm();this.room=null;await this.ctx.storage.deleteAll();return}
  if(r.deadline&&r.deadline<=Date.now()&&!r.state.roundOver&&!r.closed){
   r.missed=r.moves.map((m,i)=>m?0:(r.missed?.[i]||0)+1);
   if(r.missed.every(n=>n>=3)){r.closed=true;for(const ws of this.ctx.getWebSockets()){this.send(ws,'opponent-left');ws.close(1000,'Both fighters inactive')}}
   else{
    r.state=advanceMatch(r.state,r.moves[0]||'recover',r.moves[1]||'recover');r.moves=[null,null];
    const absent=r.missed.findIndex(n=>n>=3);
    if(absent>=0){r.state.hp[absent]=0;r.state.scores[1-absent]=Math.max(r.state.scores[1-absent],r.state.scores[absent]+1);r.state.roundOver=true;r.state.finished=true;for(const ws of this.ctx.getWebSockets())this.send(ws,'notice','Three missed turns. The inactive fighter forfeits the match.')}
    else for(const ws of this.ctx.getWebSockets())this.send(ws,'notice','Time up. A missed move becomes Breathe. Three missed turns forfeit the match.');
    this.recordResult();
   }
   this.armTurn();this.persist();this.broadcast();
  }else{
   // An obsolete deadline must never be rescheduled in the past. This also
   // repairs objects persisted by earlier deployments after a round ended.
   if(r.state.roundOver||r.deadline&&r.deadline<=Date.now()){r.deadline=0;this.persist()}
   await this.ctx.storage.setAlarm(r.deadline||r.expires);
  }
 }
}

// One coordinator for the waiting queue; fights themselves each have their own object.
export class Matchmaker extends DurableObject<Env>{
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS waiting (code TEXT PRIMARY KEY, expires INTEGER NOT NULL)');}
 async find(name:string,token:string,userId?:string):Promise<string>{
  this.ctx.storage.sql.exec('DELETE FROM waiting WHERE expires < ?',Date.now());
  const waiting=this.ctx.storage.sql.exec<{code:string}>('SELECT code FROM waiting LIMIT 30').toArray();
  for(const {code}of waiting){const room=this.env.FIGHT_ROOMS.getByName(code);if(userId&&await room.hasUser(userId))continue;if(await room.reserve(name,token,true,userId)){this.ctx.storage.sql.exec('DELETE FROM waiting WHERE code=?',code);return code}this.ctx.storage.sql.exec('DELETE FROM waiting WHERE code=?',code)}
  let code=newCode();while(!(await this.env.FIGHT_ROOMS.getByName(code).initialize(code,name,token,userId)))code=newCode();
  this.ctx.storage.sql.exec('INSERT INTO waiting(code,expires) VALUES (?,?)',code,Date.now()+3*60*60*1000);return code;
 }
}

export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  if(!onlineAllowed(env)&&(url.pathname==='/api/rooms'||url.pathname.startsWith('/api/ws/')))return Response.json({error:'Online play is paused. Arcade runs on this device.',code:'ONLINE_PAUSED'},{status:503,headers:{'Cache-Control':'no-store'}});
  const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return Response.json({error:'Origin not allowed'},{status:403});
  if(url.pathname.startsWith('/api/auth/')){
   if(/\/(request-password-reset|reset-password)(\/|$)/.test(url.pathname))return Response.json({message:'Password recovery is not available yet.'},{status:503});
   if(request.method==='POST'){
    const group=url.pathname.includes('/sign-in/')?'login':url.pathname.includes('/sign-up/')?'signup':'account';
    const limited=await env.AUTH_LIMITER.limit({key:`${request.headers.get('CF-Connecting-IP')||'local'}:${group}`});if(!limited.success)return Response.json({message:'Too many account attempts. Wait one minute.'},{status:429});
    const text=await limitedBody(request,8192);if(text===null)return Response.json({message:'Request too large'},{status:413});
    request=new Request(request.url,{method:request.method,headers:request.headers,body:text});
   }
   try{const response=await createAuth(env,url.origin).handler(request);response.headers.set('Cache-Control','no-store');return response}catch(error){console.error('Account service error',error);return Response.json({message:'Account service is unavailable. Try again shortly.'},{status:503})}
  }
  if(url.pathname==='/api/account'&&request.method==='GET'){
   const current=await createAuth(env,url.origin).api.getSession({headers:request.headers});if(!current)return Response.json({user:null},{headers:{'Cache-Control':'no-store'}});
   const record=await env.DB.prepare('SELECT COUNT(*) AS played, COALESCE(SUM(CASE WHEN (first_user=? AND first_score>second_score) OR (second_user=? AND second_score>first_score) THEN 1 ELSE 0 END),0) AS wins FROM match_result WHERE first_user=? OR second_user=?').bind(current.user.id,current.user.id,current.user.id,current.user.id).first();
   return Response.json({user:{id:current.user.id,name:fighterName(current.user),email:current.user.email},record},{headers:{'Cache-Control':'no-store'}});
  }
  if(url.pathname==='/api/sponsors'&&request.method==='POST'){
   const limited=await env.AUTH_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'local'});if(!limited.success)return Response.json({error:'Please wait a minute before trying again.'},{status:429});
   const current=await createAuth(env,url.origin).api.getSession({headers:request.headers});if(!current)return Response.json({error:'Sign in to request a sponsor space.'},{status:401});
   try{
    const text=await limitedBody(request,4096);if(text===null)return Response.json({error:'Request too large'},{status:413});
    const data=JSON.parse(text);if(!['left-wall','right-wall'].includes(data.slot)||typeof data.brand!=='string'||!data.brand.trim()||data.brand.length>80||typeof data.email!=='string'||!/^\S+@\S+\.\S+$/.test(data.email)||data.email.length>254||typeof data.website!=='string'||data.website.length>300||typeof data.message!=='string'||data.message.length>1000)throw new Error('Invalid details');
    if(data.website&&new URL(data.website).protocol!=='https:')throw new Error('Use an https website');
    const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO sponsor_request(id,user_id,slot,brand,contact_email,website,message,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,current.user.id,data.slot,data.brand.trim(),data.email,data.website,data.message,Date.now()).run();return Response.json({id},{status:201,headers:{'Cache-Control':'no-store'}});
   }catch{return Response.json({error:'Check your brand, contact email and https website, then retry.'},{status:400})}
  }
  if(/^\/api\/ws\/[A-F0-9]{6}$/.test(url.pathname)){const current=await createAuth(env,url.origin).api.getSession({headers:request.headers});if(!current)return new Response('Sign in required',{status:401});const headers=new Headers(request.headers);headers.set('X-Fighter-Id',current.user.id);return env.FIGHT_ROOMS.getByName(url.pathname.split('/').pop()!).fetch(new Request(request,{headers}));}
  if(url.pathname!=='/api/rooms'||request.method!=='POST')return Response.json({error:'Not found'},{status:404});
  const allowed=await env.ROOM_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'local'});if(!allowed.success)return Response.json({error:'Too many room requests. Wait a minute and try again.'},{status:429});
  if(Number(request.headers.get('content-length')||0)>2048)return Response.json({error:'Request too large'},{status:413});
  let raw='';try{const reader=request.body?.getReader();if(!reader)return Response.json({error:'Request body required'},{status:400});const chunks:Uint8Array[]=[];let bytes=0;while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2048){await reader.cancel();return Response.json({error:'Request too large'},{status:413})}chunks.push(value)}raw=chunks.map(chunk=>new TextDecoder().decode(chunk)).join('')}catch{return Response.json({error:'Invalid request'},{status:400})}
  let data:{action:string;name:string;token:string;code?:string};try{data=JSON.parse(raw)}catch{return Response.json({error:'Invalid request'},{status:400})}
  if(!data||!validToken(data.token)||typeof data.name!=='string'||!data.name.trim())return Response.json({error:'Choose a fighter name first'},{status:400});
  const current=await createAuth(env,url.origin).api.getSession({headers:request.headers});if(!current)return Response.json({error:'Sign in to play online. Practice is always available.'},{status:401});
  data.name=fighterName(current.user);
  const headers={'Cache-Control':'no-store'};
  if(data.action==='resume-room'&&/^[A-F0-9]{6}$/.test(data.code||'')){const code=data.code!;return await env.FIGHT_ROOMS.getByName(code).canResume(current.user.id,data.token)?Response.json({code},{headers}):Response.json({error:'Your previous room has ended.'},{status:404,headers})}
  if(data.action==='find-match'){const code=await env.MATCHMAKER.getByName('public-queue').find(cleanName(data.name),data.token,current.user.id);return Response.json({code},{headers})}
  if(data.action==='create-room'){let code=newCode();while(!(await env.FIGHT_ROOMS.getByName(code).initialize(code,data.name,data.token,current.user.id)))code=newCode();return Response.json({code},{headers})}
  if(data.action==='join-room'&&/^[A-F0-9]{6}$/.test(data.code||'')){const code=data.code!;if(await env.FIGHT_ROOMS.getByName(code).reserve(data.name,data.token,false,current.user.id))return Response.json({code},{headers});return Response.json({error:'Room not found, already full, or you are already in this room. Check your code.'},{status:404,headers})}
  return Response.json({error:'Invalid room action'},{status:400,headers});
 }
} satisfies ExportedHandler<Env>;

async function limitedBody(request:Request,max:number):Promise<string|null>{
 const reader=request.body?.getReader();if(!reader)return '';
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();return null}chunks.push(value)}
 const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength}return new TextDecoder().decode(data);
}
