import { io } from 'socket.io-client';
// Both transports expose the same small event protocol to the game UI.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listener = (...args:any[])=>void;
export interface Realtime {on:(event:string,handler:Listener)=>unknown;emit:(event:string,payload?:unknown)=>unknown;disconnect:()=>unknown}
export function createRealtime():Realtime {
 if(process.env.NEXT_PUBLIC_REALTIME_TRANSPORT!=='cloudflare')return io({reconnectionAttempts:12});
 return new CloudflareRealtime();
}
class CloudflareRealtime implements Realtime {
 private handlers=new Map<string,Listener[]>();private ws:WebSocket|null=null;private retry:ReturnType<typeof setTimeout>|null=null;private attempts=0;private closed=false;private code='';private name='';private token=crypto.randomUUID();private generation=0;
 on(event:string,handler:Listener){this.handlers.set(event,[...(this.handlers.get(event)||[]),handler]);return this}
 private fire(event:string,data?:unknown){this.handlers.get(event)?.forEach(fn=>fn(data))}
 emit(event:string,payload?:unknown){
  if(['create-room','join-room','find-match'].includes(event)){void this.enter(event,payload as {name:string;code?:string});return this}
  if(event==='leave-room'){if(this.ws?.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify({event}));this.stop();this.code='';return this}
  if(this.ws?.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify({event,data:payload}));else this.fire('notice','Your connection is recovering. Try again when connected.');return this;
 }
 private async enter(action:string,payload:{name:string;code?:string}){
  if(this.ws?.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify({event:'leave-room'}));this.stop();this.closed=false;this.token=crypto.randomUUID();this.name=payload.name;this.attempts=0;const generation=++this.generation;
  try{const r=await fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload,token:this.token})});const data=await r.json();if(generation!==this.generation)return;if(!r.ok){this.fire('notice',data.error||'Unable to open room.');return}this.code=data.code;this.open()}
  catch{this.fire('connect_error')}
 }
 private open(){
  if(this.closed||!this.code)return;
  const u=new URL(`/api/ws/${this.code}`,location.href);u.protocol=location.protocol==='https:'?'wss:':'ws:';u.searchParams.set('token',this.token);
  const ws=new WebSocket(u);this.ws=ws;
  ws.onopen=()=>{this.attempts=0;this.fire('connect')};
  ws.onmessage=e=>{if(this.ws!==ws)return;try{const msg=JSON.parse(e.data);if(msg.event==='opponent-left'){this.stop();this.code=''}this.fire(msg.event,msg.data)}catch{}};
  ws.onerror=()=>this.fire('connect_error');
  ws.onclose=()=>{if(this.ws!==ws)return;this.fire('disconnect');if(!this.closed&&this.attempts<12){this.retry=setTimeout(()=>this.open(),Math.min(1000*2**this.attempts++,10000))}};
 }
 private stop(){this.closed=true;if(this.retry)clearTimeout(this.retry);const ws=this.ws;this.ws=null;ws?.close();}
 disconnect(){this.generation++;this.stop()}
}
