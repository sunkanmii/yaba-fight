import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import next from 'next';
import {Server} from 'socket.io';
import {MOVES,freshMatch,advanceMatch,nextRound} from './lib/combat.mjs';
const dev=process.env.NODE_ENV!=='production', port=Number(process.env.PORT||3000);
const app=next({dev,hostname:'0.0.0.0',port}); await app.prepare();
const server=createServer(app.getRequestHandler());
const io=new Server(server,{connectionStateRecovery:{maxDisconnectionDuration:120000,skipMiddlewares:false},maxHttpBufferSize:4096});
const rooms=new Map(); const queue=[];
const nameOf=v=>String(v||'Fighter').trim().replace(/[<>]/g,'').slice(0,18)||'Fighter';
function broadcast(room) {
  room.players.forEach((p,i)=>io.to(p.id).emit('match',{code:room.code,players:room.players.map(p=>({name:p.name})),seat:i,state:room.state,submitted:room.moves[i]!==null,opponentReady:room.players.length===2&&room.moves[1-i]!==null}));
}
function leave(socket) {
 const code=socket.data.code,room=rooms.get(code); socket.leave(code); delete socket.data.code;
 const q=queue.indexOf(socket.id);if(q>=0)queue.splice(q,1);
 if(room){room.players.forEach(p=>io.to(p.id).emit('opponent-left'));rooms.delete(code)}
}
function create(socket,name,publicRoom=false){
 let code;do{code=randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(code));
 const room={code,players:[{id:socket.id,name:nameOf(name)}],state:freshMatch(),moves:[null,null],ready:new Set(),created:Date.now(),publicRoom};
 rooms.set(code,room);socket.join(code);socket.data.code=code;broadcast(room);return room;
}
function join(socket,code,name){const room=rooms.get(String(code).toUpperCase());if(!room||room.players.length!==1){socket.emit('notice','Room not found or already full. Check your code.');return false}room.players.push({id:socket.id,name:nameOf(name)});socket.join(room.code);socket.data.code=room.code;broadcast(room);return true;}
io.on('connection',socket=>{
 let lastMessage=0,requests=[];
 socket.use((packet,next)=>{const now=Date.now();requests=requests.filter(t=>now-t<10000);if(requests.length>45)return next(new Error('Slow down'));if(['create-room','join-room','find-match','move'].includes(packet[0])&&(!packet[1]||typeof packet[1]!=='object'))return next(new Error('Invalid request'));requests.push(now);next()});
 socket.on('create-room',({name})=>{leave(socket);create(socket,name)});
 socket.on('join-room',({code,name})=>{if(socket.data.code===String(code).toUpperCase())return;leave(socket);join(socket,code,name)});
 socket.on('find-match',({name})=>{leave(socket);while(queue.length){const id=queue.shift(),other=io.sockets.sockets.get(id);const room=other&&rooms.get(other.data.code);if(other&&room&&room.players.length===1){join(socket,room.code,name);return}}create(socket,name,true);queue.push(socket.id)});
 socket.on('move',({move,exchange})=>{const room=rooms.get(socket.data.code);if(!room||room.players.length!==2||!MOVES.includes(move)||room.state.exchange!==exchange||room.state.roundOver)return;const seat=room.players.findIndex(p=>p.id===socket.id);if(seat<0||room.moves[seat]!==null)return;room.moves[seat]=move;if(room.moves.every(Boolean)){room.state=advanceMatch(room.state,...room.moves);room.moves=[null,null]}broadcast(room)});
 socket.on('next-round',()=>{const room=rooms.get(socket.data.code);if(!room||!room.state.roundOver)return;room.ready.add(socket.id);if(room.ready.size===2){room.state=nextRound(room.state);room.ready.clear();broadcast(room)}else socket.emit('notice','Waiting for your opponent to continue…')});
 socket.on('chat',text=>{const room=rooms.get(socket.data.code),now=Date.now();if(!room||now-lastMessage<900)return;lastMessage=now;const message=String(text).trim().slice(0,180);if(message)io.to(room.code).emit('chat',{name:room.players.find(p=>p.id===socket.id)?.name||'Fighter',text:message})});
 socket.on('leave-room',()=>leave(socket));
 socket.on('disconnect',()=>{if(socket.recovered)return;setTimeout(()=>{if(!io.sockets.sockets.has(socket.id))leave(socket)},120000)});
 if(socket.recovered){const room=rooms.get(socket.data.code);if(room)broadcast(room)}
});
setInterval(()=>{for(const [code,room]of rooms)if(Date.now()-room.created>3*60*60*1000){io.to(code).emit('opponent-left');rooms.delete(code)}},60000).unref();
server.listen(port,'0.0.0.0',()=>console.log(`Yaba Fight ready at http://localhost:${port}`));
