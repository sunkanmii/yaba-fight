export const MOVES = ['jab', 'heavy', 'block', 'parry', 'feint', 'recover'];
export const COST = {jab:12,heavy:26,block:18,parry:22,feint:10,recover:0};
export const moveCost = (state,seat,move) => COST[move]+(move==='block'?Math.min(24,(state.guard?.[seat]||0)*8):0);
export const canMove = (state,seat,move) => MOVES.includes(move)&&(state.stamina?.[seat]??100)>=moveCost(state,seat,move);
export const BOTS = [
  { id: 'tunde', name: 'Tunde', title: 'The Area Champion', style: 'Balanced', difficulty: 'Easy', quote: '“No vex. Na practice.”', description: 'A little of everything. Your first sparring partner.', weights: [4, 2, 3, 1, 1] },
  { id: 'lazarus', name: 'Lazarus', title: 'The Comeback Kid', style: 'Counter-puncher', difficulty: 'Medium', quote: '“You think say I don finish?”', description: 'Patient, defensive, and always reading your next move.', weights: [2, 1, 3, 4, 2] },
  { id: 'sade', name: 'Sade', title: 'The Mainland Menace', style: 'Aggressive', difficulty: 'Hard', quote: '“Less talk. Hands up.”', description: 'Heavy pressure. Mix up your defence to survive.', weights: [3, 5, 1, 2, 3] }
];
export function freshMatch() { return { hp: [100,100], stamina:[100,100], guard:[0,0], exposed:[false,false], scores: [0,0], round: 1, exchange: 0, roundExchange: 0, finished: false, roundOver: false, last: null }; }
export function resolveMoves(a, b) {
  if (!MOVES.includes(a) || !MOVES.includes(b)) throw new Error('Invalid move');
  const damage = [0,0];
  const attack = (move, defence, target, self) => {
    if (move === 'jab' || move === 'heavy') {
      // A quick jab interrupts a power wind-up. Power cannot dominate every attack.
      if (move === 'heavy' && defence === 'jab') return;
      if (defence === 'parry') { if (move === 'jab') damage[self] += 18; else damage[target] += 28; }
      else if (defence === 'block') damage[target] += move === 'heavy' ? 8 : 0;
      else damage[target] += move === 'heavy' ? 24 : 14;
    }
    if (move === 'feint' && ['block','parry'].includes(defence)) damage[target] += 20;
  };
  attack(a,b,1,0); attack(b,a,0,1);
  return { damage, moves: [a,b] };
}
export function advanceMatch(state,a,b) {
  if (state.finished || state.roundOver) return state;
  if(!MOVES.includes(a)||!MOVES.includes(b))throw new Error('Invalid move');
  // All clients and the authoritative server use the same costs. Older clients
  // attempting an unaffordable move catch their breath instead of getting stuck.
  const moves=[a,b].map((move,i)=>canMove(state,i,move)?move:'recover');
  const stamina=moves.map((move,i)=>move==='recover'?Math.min(100,(state.stamina?.[i]??100)+38):Math.max(0,(state.stamina?.[i]??100)-moveCost(state,i,move)));
  const broken=[false,false],exposed=[false,false];
  for(let i=0;i<2;i++){
    const rival=moves[1-i];
    if(moves[i]==='block'){
      stamina[i]=Math.max(0,stamina[i]-(rival==='heavy'?22:rival==='jab'?10:0));
      broken[i]=stamina[i]===0;
    }
    if(moves[i]==='parry'){
      if(rival==='jab')stamina[i]=Math.min(100,stamina[i]+16);
      else exposed[i]=true;
    }
    if(broken[i])exposed[i]=true;
  }
  const last=resolveMoves(moves[0],moves[1]);
  last.broken=broken;last.exposed=exposed;last.recovered=moves.map(m=>m==='recover');
  for(let i=0;i<2;i++){
    const rival=moves[1-i];
    if(broken[i]&&['jab','heavy'].includes(rival))last.damage[i]=(rival==='heavy'?24:14)+8;
    if(last.damage[i]>0&&(state.exposed?.[i]||moves[i]==='recover'))last.damage[i]+=state.exposed?.[i]?8:6;
  }
  const overtime=Math.max(0,state.roundExchange+1-12)*5;
  if(overtime)last.damage=last.damage.map(d=>d+overtime);
  last.overtime=overtime;
  const hp = state.hp.map((v,i)=>Math.max(0,v-last.damage[i]));
  const exchange = state.exchange + 1, roundExchange = state.roundExchange + 1;
  const roundOver = hp.some(v=>v===0) || (roundExchange>=12&&hp[0]!==hp[1]);
  const scores = [...state.scores];
  if(roundOver) { if(hp[0]>hp[1]) scores[0]++; else if(hp[1]>hp[0]) scores[1]++; }
  return {...state,hp,stamina,exposed,guard:moves.map((m,i)=>m==='block'?(state.guard?.[i]||0)+1:0),scores,exchange,roundExchange,roundOver,finished:roundOver && state.round===3,last};
}
export function nextRound(state) { return state.roundOver && !state.finished ? {...state,hp:[100,100],stamina:[100,100],guard:[0,0],exposed:[false,false],round:state.round+1,roundExchange:0,roundOver:false,last:null} : state; }
/** @param {any} state */
export function chooseBot(botId, history, random=Math.random, state=freshMatch()) {
  const bot=BOTS.find(b=>b.id===botId)||BOTS[0]; const weights=[...bot.weights];
  const recent=history.slice(-6); const frequent=MOVES.map(m=>recent.filter(x=>x===m).length);
  weights.push((state.stamina?.[1]??100)<40?10:1);
  if(recent.length>=3) { const dominant=MOVES[frequent.indexOf(Math.max(...frequent))]; const counter={jab:'parry',heavy:'jab',block:'feint',parry:'feint',feint:'jab',recover:'heavy'}[dominant]; weights[MOVES.indexOf(counter)]+=botId==='tunde'?2:6; }
  if(state.exposed?.[0]){weights[0]+=3;weights[1]+=3}
  weights.forEach((_,i)=>{if(!canMove(state,1,MOVES[i]))weights[i]=0});
  let roll=random()*weights.reduce((a,b)=>a+b,0); for(let i=0;i<weights.length;i++){roll-=weights[i];if(weights[i]>0&&roll<0)return MOVES[i]} return 'recover';
}

export function describeExchange(last, seat=0) {
  const [a,b]=[last.moves[seat],last.moves[1-seat]], dealt=last.damage[1-seat],taken=last.damage[seat];
  if(last.broken?.[seat])return {title:'Guard shattered!',detail:`Your stamina ran out. ${taken} damage. Recover before raising guard again.`,tone:'bad',cue:'hurt'};
  if(last.broken?.[1-seat])return {title:'Broke their guard!',detail:`Their stamina ran out. ${dealt?`${dealt} damage. `:''}They are exposed next exchange.`,tone:'good',cue:'heavy'};
  if(a==='parry'&&b!=='jab')return {title:'Missed parry!',detail:`22 stamina spent. Exposed next exchange: damaging hits gain 8.`,tone:'bad',cue:taken?'hurt':'miss'};
  if(a==='recover')return {title:taken?'Caught catching breath!':'Second wind',detail:`Recovered up to 38 stamina.${taken?` Took ${taken} damage; attacks gain 6 while you recover.`:' Now choose your next opening.'}`,tone:taken?'bad':'good',cue:taken?'hurt':'recover'};
  if(last.overtime)return {title:'Sudden death!',detail:`The crowd wants a finish. Both lose ${last.overtime} HP in addition to hits.`,tone:'trade',cue:'bell'};
  if(a==='parry'&&b==='jab')return {title:'Perfect parry',detail:'You turned their jab into an 18-damage counter.',tone:'good',cue:'parry'};
  if(a==='jab'&&b==='heavy')return {title:'Interrupted!',detail:'Your quick jab stopped their power punch.',tone:'good',cue:'jab'};
  if(a==='heavy'&&b==='jab')return {title:'Too slow!',detail:'Their jab interrupted your power wind-up.',tone:'bad',cue:'hurt'};
  if(a==='jab'&&b==='parry')return {title:'Countered!',detail:'They read your jab. Try power or a feint.',tone:'bad',cue:'hurt'};
  if(a==='feint'&&['block','parry'].includes(b))return {title:'Outplayed!',detail:'Your feint caught their defence for 20 damage.',tone:'good',cue:'feint'};
  if(a==='heavy'&&b==='parry')return {title:'Guard broken!',detail:'Your power punch punished their parry.',tone:'good',cue:'heavy'};
  if(a==='block'&&b==='jab')return {title:'Blocked',detail:'Their jab hit your guard. No damage taken.',tone:'guard',cue:'block'};
  if(a==='block'&&b==='heavy')return {title:'Braced',detail:'Your block reduced 24 damage to 8.',tone:'guard',cue:'block'};
  if(a==='jab'&&b==='block')return {title:'They blocked it',detail:'Your jab met their guard. Try a feint.',tone:'guard',cue:'block'};
  if(a==='heavy'&&b==='block')return {title:'Through the guard',detail:'Their block softened your power punch to 8.',tone:'good',cue:'block'};
  if(a==='parry'&&b==='heavy')return {title:'Parry broken!',detail:'Power beats parry. A jab could interrupt it.',tone:'bad',cue:'hurt'};
  if(a==='feint'&&b==='feint')return {title:'Both bluffed',detail:'Neither punch landed. Time for a new read.',tone:'guard',cue:'feint'};
  if(dealt&&taken)return {title:'Traded hits',detail:`You landed ${dealt}. They landed ${taken}.`,tone:'trade',cue:a==='heavy'?'heavy':'jab'};
  if(dealt)return {title:a==='heavy'?'Power landed!':'Clean hit!',detail:`You landed ${dealt} damage.`,tone:'good',cue:a==='heavy'?'heavy':'jab'};
  if(taken)return {title:b==='feint'?'Caught the feint!':'You got caught',detail:`You took ${taken} damage. Mix up your next move.`,tone:'bad',cue:'hurt'};
  return {title:'Both stood firm',detail:'No damage. A feint can punish a defensive read.',tone:'guard',cue:'block'};
}
