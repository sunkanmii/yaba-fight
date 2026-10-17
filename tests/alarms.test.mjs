import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {freshMatch} from '../lib/combat.mjs';

// Exercise the actual Worker handlers without creating cloud rooms or requests.
registerHooks({resolve(specifier,context,next){
 if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export class DurableObject {constructor(ctx,env){this.ctx=ctx;this.env=env}}',shortCircuit:true};
 if(specifier==='./auth')return {url:'data:text/javascript,export const createAuth=()=>{}; export const fighterName=()=>{};',shortCircuit:true};
 return next(specifier,context);
}});
const {FightRoom,default:worker}=await import(process.env.ALARM_TEST_SOURCE||'../cloudflare/worker.ts');
const NOW=1_800_000_000_000;
function fixture(changes={},enabled=true){
 const room={code:'ABCDEF',players:[{token:'player-a',name:'Ada',lastChat:0},{token:'player-b',name:'Bayo',lastChat:0}],state:freshMatch(),moves:[null,null],ready:[],expires:NOW+3*60*60*1000,closed:false,deadline:NOW+15000,missed:[0,0],...changes};
 const calls={alarms:[],deleteAll:0,deleteAlarm:0,persisted:null};const pending=[];
 const ctx={storage:{sql:{exec(sql,...args){if(sql.startsWith('SELECT'))return {toArray:()=>[{data:JSON.stringify(room)}]};if(sql.startsWith('INSERT'))calls.persisted=JSON.parse(args[0]);return {toArray:()=>[]}}},async setAlarm(time){calls.alarms.push(time)},async deleteAlarm(){calls.deleteAlarm++},async deleteAll(){calls.deleteAll++}},waitUntil(p){pending.push(p)},getWebSockets(){return []}};
 const object=new FightRoom(ctx,{ONLINE_PLAY_ENABLED:enabled?'true':'false'});return {object,calls,flush:()=>Promise.all(pending)};
}

test('offline switch retires an existing room without scheduling a new alarm',async t=>{t.mock.method(Date,'now',()=>NOW);const f=fixture({},false);await f.object.alarm();await f.flush();assert.equal(f.calls.deleteAlarm,1);assert.equal(f.calls.deleteAll,1);assert.deepEqual(f.calls.alarms,[])});
test('offline room and websocket requests never touch a Durable Object or authentication',async()=>{const touch=()=>{throw new Error('Cloud binding was touched')};const env={ONLINE_PLAY_ENABLED:'false',FIGHT_ROOMS:{getByName:touch},MATCHMAKER:{getByName:touch},DB:{prepare:touch},AUTH_LIMITER:{limit:touch}};for(const path of ['/api/rooms','/api/ws/ABCDEF']){const response=await worker.fetch(new Request('https://game.example'+path,{method:'POST'}),env);assert.equal(response.status,503);assert.equal((await response.json()).code,'ONLINE_PAUSED')}});
test('closed room with a past deadline is cleaned up without rearming an alarm',async t=>{
 t.mock.method(Date,'now',()=>NOW);const f=fixture({closed:true,deadline:NOW-5000});await f.object.alarm();await f.flush();assert.equal(f.calls.deleteAll,1);assert.equal(f.calls.deleteAlarm,1);assert.deepEqual(f.calls.alarms,[]);await f.object.alarm();assert.deepEqual(f.calls.alarms,[]);
});
test('leaving an active room clears its turn deadline and schedules only expiry',async t=>{
 t.mock.method(Date,'now',()=>NOW);const f=fixture();const attachment={token:'player-a',window:NOW,count:0};const ws={deserializeAttachment:()=>attachment,serializeAttachment(){}};
 f.object.webSocketMessage(ws,JSON.stringify({event:'leave-room'}));await f.flush();assert.equal(f.calls.persisted.closed,true);assert.equal(f.calls.persisted.deadline,0);assert.deepEqual(f.calls.alarms,[NOW+3*60*60*1000]);
});
test('a legacy round-over room cannot reschedule an obsolete past deadline',async t=>{
 t.mock.method(Date,'now',()=>NOW);const f=fixture({state:{...freshMatch(),roundOver:true},deadline:NOW-1});await f.object.alarm();assert.equal(f.calls.persisted.deadline,0);assert.deepEqual(f.calls.alarms,[NOW+3*60*60*1000]);
});
test('active turn timeout schedules its next turn strictly in the future',async t=>{
 t.mock.method(Date,'now',()=>NOW);const f=fixture({deadline:NOW-1});await f.object.alarm();await f.flush();assert.deepEqual(f.calls.alarms,[NOW+15000]);assert.equal(f.calls.persisted.state.exchange,1);assert.deepEqual(f.calls.persisted.missed,[1,1]);
});
test('two absent fighters stop turn alarms after the third miss',async t=>{
 t.mock.method(Date,'now',()=>NOW);const f=fixture({deadline:NOW-1,missed:[2,2]});await f.object.alarm();await f.flush();assert.equal(f.calls.persisted.closed,true);assert.equal(f.calls.persisted.deadline,0);assert.deepEqual(f.calls.alarms,[NOW+3*60*60*1000]);
});
