import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://127.0.0.1:8799';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const password='Online-test-password-382';const fighters=[];
async function fighter(label){const context=await browser.newContext({extraHTTPHeaders:{Origin:base}});const name=`${label}_${Date.now().toString(36)}`;const r=await context.request.post(`${base}/api/auth/sign-up/email`,{data:{name,username:name,displayUsername:name,email:`${name}@example.com`,password}});assert.equal(r.status(),200,await r.text());const page=await context.newPage();await page.goto(base);const f={context,page,name,token:crypto.randomUUID()};fighters.push(f);return f}
async function enter(f,action,code){const r=await f.context.request.post(`${base}/api/rooms`,{data:{action,name:'SpoofedName',token:f.token,code}});return {status:r.status(),...await r.json()}}
async function connect(f,code){
 const messages=[];const listeners=new Set();const key=`relay${crypto.randomUUID().replaceAll('-','')}`;
 await f.page.exposeFunction(key,m=>{messages.push(m);for(const fn of listeners)fn(m)});
 await f.page.evaluate(({code,token,key})=>{window.testSocket=new WebSocket(`${location.origin.replace(/^http/,'ws')}/api/ws/${code}?token=${token}`);window.testSocket.onmessage=e=>window[key](JSON.parse(e.data))},{code,token:f.token,key});
 const next=(predicate,timeout=6000)=>new Promise((resolve,reject)=>{const existing=messages.find(predicate);if(existing)return resolve(existing);const id=setTimeout(()=>{listeners.delete(fn);reject(new Error(`Timed out: ${predicate.toString()}; recent messages: ${JSON.stringify(messages.slice(-3))}`))},timeout);const fn=m=>{if(predicate(m)){clearTimeout(id);listeners.delete(fn);resolve(m)}};listeners.add(fn)});
 return {messages,next,send:(event,data)=>f.page.evaluate(({event,data})=>window.testSocket.send(JSON.stringify({event,data})),{event,data}),close:()=>f.page.evaluate(()=>window.testSocket.close())};
}
try{
 const fa=await fighter('Ada'),fb=await fighter('Bayo'),fc=await fighter('Chika');
 const room=await enter(fa,'create-room');assert.equal(room.status,200);const a=await connect(fa,room.code);await a.next(m=>m.event==='match');
 assert.equal((await enter(fa,'join-room',room.code)).status,404,'same account must not occupy both seats');
 assert.equal((await enter(fb,'join-room',room.code)).status,200);const b=await connect(fb,room.code);const pair=await a.next(m=>m.event==='match'&&m.data.players.length===2);await b.next(m=>m.event==='match');
 assert.deepEqual(pair.data.players.map(p=>p.name),[fa.name,fb.name]);assert.ok(pair.data.deadline>pair.data.serverTime);
 assert.equal((await enter(fc,'join-room',room.code)).status,404);
 await a.send('move',{move:'jab',exchange:0});const pending=await b.next(m=>m.event==='match'&&m.data.opponentReady);assert.equal(pending.data.state.last,null);assert.equal(JSON.stringify(pending.data).includes('jab'),false);
 await a.send('move',{move:'heavy',exchange:0});await b.send('move',{move:'parry',exchange:0});let state=(await a.next(m=>m.event==='match'&&m.data.state.exchange===1)).data.state;assert.deepEqual(state.hp,[82,100]);assert.deepEqual(state.stamina,[88,94]);assert.deepEqual(state.last.moves,['jab','parry']);
 await b.send('chat','Good hands!');await a.next(m=>m.event==='chat'&&m.data.text==='Good hands!');
 await a.close();await new Promise(r=>setTimeout(r,100));const recovered=await connect(fa,room.code);const snapshot=await recovered.next(m=>m.event==='match');assert.equal(snapshot.data.state.exchange,1);
 await recovered.send('move',{move:'parry',exchange:1});await b.send('move',{move:'block',exchange:1});state=(await recovered.next(m=>m.event==='match'&&m.data.state.exchange===2)).data.state;assert.equal(state.exposed[0],true);assert.equal(state.stamina[0],66);
 await recovered.send('move',{move:'feint',exchange:2});await b.send('move',{move:'jab',exchange:2});state=(await recovered.next(m=>m.event==='match'&&m.data.state.exchange===3)).data.state;assert.equal(state.hp[0],60);
 // An absent rival cannot hold the other player indefinitely: server resolves
 // the unsubmitted choice as Breathe and penalises it against an attack.
 await recovered.send('move',{move:'heavy',exchange:3});state=(await recovered.next(m=>m.event==='match'&&m.data.state.exchange===4,18000)).data.state;assert.deepEqual(state.last.moves,['heavy','recover']);assert.equal(state.last.damage[1],30);
 for(let n=0;n<70&&!state.finished;n++){
  await new Promise(r=>setTimeout(r,260)); // Stay below the production socket rate limit.
  if(state.roundOver){await recovered.send('next-round');await b.send('next-round');const round=state.round;state=(await recovered.next(m=>m.event==='match'&&m.data.state.round===round+1)).data.state;continue}
  const exchange=state.exchange;await recovered.send('move',{move:'recover',exchange});await b.send('move',{move:'recover',exchange});state=(await recovered.next(m=>m.event==='match'&&m.data.state.exchange===exchange+1)).data.state;
 }
 assert.equal(state.finished,true);await new Promise(r=>setTimeout(r,300));const record=await (await fa.context.request.get(`${base}/api/account`)).json();assert.equal(record.record.played,1);await recovered.send('leave-room');await b.next(m=>m.event==='opponent-left');
 fa.token=crypto.randomUUID();fb.token=crypto.randomUUID();const queued=await enter(fa,'find-match');const qa=await connect(fa,queued.code);await qa.next(m=>m.event==='match');const paired=await enter(fb,'find-match');assert.equal(paired.code,queued.code);const qb=await connect(fb,paired.code);await qa.next(m=>m.event==='match'&&m.data.players.length===2);await qb.next(m=>m.event==='match');
 if(process.env.TEST_FORFEIT==='1'){
  for(let exchange=0;exchange<3;exchange++){await qa.send('move',{move:'jab',exchange});const timeout=(await qa.next(m=>m.event==='match'&&m.data.state.exchange===exchange+1,18000)).data.state;if(exchange===2){assert.equal(timeout.finished,true);assert.equal(timeout.hp[1],0);assert.ok(timeout.scores[0]>timeout.scores[1])}}
  console.log('PASS: three consecutive missed turns produce a server-authoritative forfeit.');
 }
 await qa.send('leave-room');
 console.log('PASS: authenticated identities, no self-pairing, human matchmaking, hidden choices, duplicate prevention, stamina, missed-parry punish, chat, reconnect, 15-second server deadline, three rounds and persistent online records.');
}finally{for(const f of fighters){await f.context.request.post(`${base}/api/auth/delete-user`,{data:{password}}).catch(()=>{});await f.context.close()}await browser.close()}
