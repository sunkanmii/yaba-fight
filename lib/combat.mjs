export const MOVES = ['jab', 'heavy', 'block', 'parry', 'feint'];
export const BOTS = [
  { id: 'tunde', name: 'Tunde', title: 'The Area Champion', style: 'Balanced', difficulty: 'Easy', quote: '“No vex. Na practice.”', description: 'A little of everything. Your first sparring partner.', weights: [4, 2, 3, 1, 1] },
  { id: 'lazarus', name: 'Lazarus', title: 'The Comeback Kid', style: 'Counter-puncher', difficulty: 'Medium', quote: '“You think say I don finish?”', description: 'Patient, defensive, and always reading your next move.', weights: [2, 1, 3, 4, 2] },
  { id: 'sade', name: 'Sade', title: 'The Mainland Menace', style: 'Aggressive', difficulty: 'Hard', quote: '“Less talk. Hands up.”', description: 'Heavy pressure. Mix up your defence to survive.', weights: [3, 5, 1, 2, 3] }
];
export function freshMatch() { return { hp: [100,100], scores: [0,0], round: 1, exchange: 0, roundExchange: 0, finished: false, roundOver: false, last: null }; }
export function resolveMoves(a, b) {
  if (!MOVES.includes(a) || !MOVES.includes(b)) throw new Error('Invalid move');
  const damage = [0,0];
  const attack = (move, defence, target, self) => {
    if (move === 'jab' || move === 'heavy') {
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
  const last = resolveMoves(a,b);
  const hp = state.hp.map((v,i)=>Math.max(0,v-last.damage[i]));
  const exchange = state.exchange + 1, roundExchange = state.roundExchange + 1;
  const roundOver = hp.some(v=>v===0) || roundExchange >= 10;
  const scores = [...state.scores];
  if(roundOver) { if(hp[0]>hp[1]) scores[0]++; else if(hp[1]>hp[0]) scores[1]++; }
  return {...state,hp,scores,exchange,roundExchange,roundOver,finished:roundOver && state.round===3,last};
}
export function nextRound(state) { return state.roundOver && !state.finished ? {...state,hp:[100,100],round:state.round+1,roundExchange:0,roundOver:false,last:null} : state; }
export function chooseBot(botId, history, random=Math.random) {
  const bot=BOTS.find(b=>b.id===botId)||BOTS[0]; const weights=[...bot.weights];
  const recent=history.slice(-6); const frequent=MOVES.map(m=>recent.filter(x=>x===m).length);
  if(recent.length>=3) { const dominant=MOVES[frequent.indexOf(Math.max(...frequent))]; const counter={jab:'parry',heavy:'block',block:'feint',parry:'feint',feint:'jab'}[dominant]; weights[MOVES.indexOf(counter)]+=botId==='tunde'?2:6; }
  let roll=random()*weights.reduce((a,b)=>a+b,0); for(let i=0;i<weights.length;i++){roll-=weights[i];if(roll<=0)return MOVES[i]} return 'jab';
}
