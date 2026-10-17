// Integration test against `npm run cloudflare:dev`. No cloud account required.
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:8787';
async function enter(action,name,token,code){const r=await fetch(`${base}/api/rooms`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,name,token,code})});return {status:r.status,...await r.json()};}
function connect(code,token){
 const ws=new WebSocket(`${base.replace(/^http/,'ws')}/api/ws/${code}?token=${token}`);const messages=[];const subscribers=new Set();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);messages.push(m);for(const fn of subscribers)fn(m)});
 const next=(predicate,timeout=6000)=>new Promise((resolve,reject)=>{const existing=messages.find(predicate);if(existing)return resolve(existing);const id=setTimeout(()=>{subscribers.delete(fn);reject(new Error('Timed out waiting for room message'))},timeout);const fn=m=>{if(predicate(m)){clearTimeout(id);subscribers.delete(fn);resolve(m)}};subscribers.add(fn)});
 return {ws,messages,next,send:(event,data)=>ws.send(JSON.stringify({event,data}))};
}
const aToken=crypto.randomUUID(),bToken=crypto.randomUUID();
const room=await enter('create-room','Ada',aToken);assert.equal(room.status,200);assert.match(room.code,/^[A-F0-9]{6}$/);
const a=connect(room.code,aToken);await a.next(m=>m.event==='match');
const joined=await enter('join-room','Bayo',bToken,room.code);assert.equal(joined.status,200);
const b=connect(room.code,bToken);await a.next(m=>m.event==='match'&&m.data.players.length===2);await b.next(m=>m.event==='match');
const third=await enter('join-room','Third',crypto.randomUUID(),room.code);assert.equal(third.status,404);
a.send('move',{move:'jab',exchange:0});const pending=await b.next(m=>m.event==='match'&&m.data.opponentReady);assert.equal(pending.data.state.exchange,0);assert.equal(pending.data.state.last,null);assert.equal(JSON.stringify(pending.data).includes('jab'),false);
a.send('move',{move:'heavy',exchange:0});b.send('move',{move:'parry',exchange:0});const result=await a.next(m=>m.event==='match'&&m.data.state.exchange===1);assert.deepEqual(result.data.state.hp,[82,100]);assert.deepEqual(result.data.state.last.moves,['jab','parry']);
b.send('chat','Good hands!');await a.next(m=>m.event==='chat'&&m.data.text==='Good hands!');
a.ws.close();await new Promise(r=>setTimeout(r,100));const recovered=connect(room.code,aToken);const snapshot=await recovered.next(m=>m.event==='match');assert.equal(snapshot.data.state.exchange,1);assert.deepEqual(snapshot.data.state.hp,[82,100]);
recovered.send('move',{move:'jab',exchange:1});b.send('move',{move:'heavy',exchange:1});const interruption=await recovered.next(m=>m.event==='match'&&m.data.state.exchange===2);assert.deepEqual(interruption.data.state.hp,[82,86]);
const invalid=await enter('join-room','Nobody',crypto.randomUUID(),'FFFFFF');assert.equal(invalid.status,404);
recovered.send('leave-room');await b.next(m=>m.event==='opponent-left');recovered.ws.close();b.ws.close();
const cToken=crypto.randomUUID(),dToken=crypto.randomUUID();const queued=await enter('find-match','Chika',cToken);const c=connect(queued.code,cToken);await c.next(m=>m.event==='match');const paired=await enter('find-match','Dami',dToken);assert.equal(paired.code,queued.code);const d=connect(paired.code,dToken);await c.next(m=>m.event==='match'&&m.data.players.length===2);await d.next(m=>m.event==='match');c.send('leave-room');await d.next(m=>m.event==='opponent-left');c.ws.close();d.ws.close();
console.log('PASS: friend rooms, capacity, hidden choices, duplicate prevention, server damage, jab interrupts power, chat, reconnect, invalid codes, and human matchmaking.');
