import {DurableObject} from 'cloudflare:workers';
import {MOVES,freshMatch,advanceMatch,nextRound} from '../lib/combat.mjs';

type Player={token:string;name:string;lastChat:number};
type Room={code:string;players:Player[];state:ReturnType<typeof freshMatch>;moves:(string|null)[];ready:string[];expires:number;closed:boolean};
const cleanName=(name:string)=>name.trim().replace(/[<>]/g,'').slice(0,18)||'Fighter';
const newCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(3)),x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
const validToken=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9-]{36}$/.test(s);

export class FightRoom extends DurableObject<Env>{
 private room:Room|null;
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)');const rows=ctx.storage.sql.exec<{data:string}>('SELECT data FROM room WHERE id=1').toArray();this.room=rows.length?JSON.parse(rows[0].data):null;}
 private persist(){this.ctx.storage.sql.exec('INSERT OR REPLACE INTO room (id,data) VALUES (1,?)',JSON.stringify(this.room));}
 async initialize(code:string,name:string,token:string){if(this.room&&!this.room.closed&&this.room.expires>Date.now())return false;this.room={code,players:[{token,name:cleanName(name),lastChat:0}],state:freshMatch(),moves:[null,null],ready:[],expires:Date.now()+3*60*60*1000,closed:false};this.persist();await this.ctx.storage.setAlarm(this.room.expires);return true;}
 reserve(name:string,token:string,onlineOnly=false){const r=this.room;if(!r||r.closed||r.expires<Date.now()||r.players.length!==1||r.players[0].token===token)return false;if(onlineOnly&&!this.ctx.getWebSockets().some(ws=>ws.deserializeAttachment()?.token===r.players[0].token))return false;r.players.push({token,name:cleanName(name),lastChat:0});this.persist();return true;}
 private send(ws:WebSocket,event:string,data?:unknown){try{ws.send(JSON.stringify({event,data}))}catch{}}
 private broadcast(){const r=this.room;if(!r)return;for(const ws of this.ctx.getWebSockets()){const a=ws.deserializeAttachment() as {token:string};const seat=r.players.findIndex(p=>p.token===a.token);if(seat<0)continue;this.send(ws,'match',{code:r.code,players:r.players.map(p=>({name:p.name})),seat,state:r.state,submitted:r.moves[seat]!==null,opponentReady:r.players.length===2&&r.moves[1-seat]!==null});}}
 async fetch(request:Request){const r=this.room;if(request.headers.get('Upgrade')!=='websocket')return new Response('WebSocket required',{status:426});const token=new URL(request.url).searchParams.get('token');if(!r||r.closed||r.expires<Date.now()||!r.players.some(p=>p.token===token))return new Response('Room expired or invalid session',{status:403});
  for(const old of this.ctx.getWebSockets()){if(old.deserializeAttachment()?.token===token)old.close(1000,'Reconnected elsewhere')}
  const pair=new WebSocketPair();this.ctx.acceptWebSocket(pair[1]);pair[1].serializeAttachment({token,window:Date.now(),count:0});this.broadcast();return new Response(null,{status:101,webSocket:pair[0]});
 }
 webSocketMessage(ws:WebSocket,raw:string|ArrayBuffer){
  if(typeof raw!=='string'||raw.length>2048){ws.close(1009,'Message too large');return}const a=ws.deserializeAttachment() as {token:string;window:number;count:number};const now=Date.now();if(now-a.window>10000){a.window=now;a.count=0}a.count++;ws.serializeAttachment(a);if(a.count>45){this.send(ws,'notice','Easy, champ. Slow down.');return}
  const r=this.room;if(!r||r.closed||r.expires<now)return;const seat=r.players.findIndex(p=>p.token===a.token);if(seat<0)return;
  let msg:{event:string;data?:{move?:string;exchange?:number}|string};try{msg=JSON.parse(raw)}catch{return}if(!msg||typeof msg.event!=='string')return;
  if(msg.event==='move'){const d=msg.data;if(!d||typeof d!=='object'||typeof d.move!=='string'||!MOVES.includes(d.move)||d.exchange!==r.state.exchange||r.players.length!==2||r.state.roundOver||r.moves[seat]!==null)return;r.moves[seat]=d.move;if(r.moves.every(Boolean)){r.state=advanceMatch(r.state,r.moves[0],r.moves[1]);r.moves=[null,null]}this.persist();this.broadcast();}
  else if(msg.event==='next-round'&&r.state.roundOver&&!r.state.finished){if(!r.ready.includes(a.token))r.ready.push(a.token);if(r.ready.length===2){r.state=nextRound(r.state);r.ready=[];this.persist();this.broadcast()}else{this.persist();this.send(ws,'notice','Waiting for your opponent to continue…')}}
  else if(msg.event==='chat'&&typeof msg.data==='string'&&now-r.players[seat].lastChat>=900){const text=msg.data.trim().slice(0,180);if(text){r.players[seat].lastChat=now;this.persist();for(const client of this.ctx.getWebSockets())this.send(client,'chat',{name:r.players[seat].name,text})}}
  else if(msg.event==='leave-room'){r.closed=true;this.persist();for(const client of this.ctx.getWebSockets()){this.send(client,'opponent-left');client.close(1000,'Room closed')}}
 }
 webSocketClose(){if(this.room?.closed)return;for(const client of this.ctx.getWebSockets())this.send(client,'notice','A fighter disconnected. Their seat is held for reconnection.');}
 webSocketError(ws:WebSocket){ws.close(1011,'Connection error')}
 async alarm(){for(const ws of this.ctx.getWebSockets()){this.send(ws,'opponent-left');ws.close(1000,'Room expired')}this.room=null;await this.ctx.storage.deleteAll();}
}

// One coordinator for the waiting queue; fights themselves each have their own object.
export class Matchmaker extends DurableObject<Env>{
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS waiting (code TEXT PRIMARY KEY, expires INTEGER NOT NULL)');}
 async find(name:string,token:string):Promise<string>{
  this.ctx.storage.sql.exec('DELETE FROM waiting WHERE expires < ?',Date.now());
  const waiting=this.ctx.storage.sql.exec<{code:string}>('SELECT code FROM waiting LIMIT 30').toArray();
  for(const {code}of waiting){if(await this.env.FIGHT_ROOMS.getByName(code).reserve(name,token,true)){this.ctx.storage.sql.exec('DELETE FROM waiting WHERE code=?',code);return code}this.ctx.storage.sql.exec('DELETE FROM waiting WHERE code=?',code)}
  let code=newCode();while(!(await this.env.FIGHT_ROOMS.getByName(code).initialize(code,name,token)))code=newCode();
  this.ctx.storage.sql.exec('INSERT INTO waiting(code,expires) VALUES (?,?)',code,Date.now()+120000);return code;
 }
}

export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return Response.json({error:'Origin not allowed'},{status:403});
  if(/^\/api\/ws\/[A-F0-9]{6}$/.test(url.pathname))return env.FIGHT_ROOMS.getByName(url.pathname.split('/').pop()!).fetch(request);
  if(url.pathname!=='/api/rooms'||request.method!=='POST')return Response.json({error:'Not found'},{status:404});
  const allowed=await env.ROOM_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'local'});if(!allowed.success)return Response.json({error:'Too many room requests. Wait a minute and try again.'},{status:429});
  if(Number(request.headers.get('content-length')||0)>2048)return Response.json({error:'Request too large'},{status:413});
  let raw='';try{const reader=request.body?.getReader();if(!reader)return Response.json({error:'Request body required'},{status:400});const chunks:Uint8Array[]=[];let bytes=0;while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2048){await reader.cancel();return Response.json({error:'Request too large'},{status:413})}chunks.push(value)}raw=chunks.map(chunk=>new TextDecoder().decode(chunk)).join('')}catch{return Response.json({error:'Invalid request'},{status:400})}
  let data:{action:string;name:string;token:string;code?:string};try{data=JSON.parse(raw)}catch{return Response.json({error:'Invalid request'},{status:400})}
  if(!data||!validToken(data.token)||typeof data.name!=='string'||!data.name.trim())return Response.json({error:'Choose a fighter name first'},{status:400});
  const headers={'Cache-Control':'no-store'};
  if(data.action==='find-match'){const code=await env.MATCHMAKER.getByName('public-queue').find(cleanName(data.name),data.token);return Response.json({code},{headers})}
  if(data.action==='create-room'){let code=newCode();while(!(await env.FIGHT_ROOMS.getByName(code).initialize(code,data.name,data.token)))code=newCode();return Response.json({code},{headers})}
  if(data.action==='join-room'&&/^[A-F0-9]{6}$/.test(data.code||'')){const code=data.code!;if(await env.FIGHT_ROOMS.getByName(code).reserve(data.name,data.token))return Response.json({code},{headers});return Response.json({error:'Room not found or already full. Check your code.'},{status:404,headers})}
  return Response.json({error:'Invalid room action'},{status:400,headers});
 }
} satisfies ExportedHandler<Env>;
