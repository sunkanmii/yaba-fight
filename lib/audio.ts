/** Original, sample-free arcade audio. No network requests or microphone access. */
export type SoundCue='select'|'jab'|'heavy'|'block'|'parry'|'feint'|'hurt'|'bell'|'win'|'lose'|'recover'|'miss';
export class FightAudio {
 private ctx:AudioContext|null=null;private fx:GainNode|null=null;private musicBus:GainNode|null=null;private duck:GainNode|null=null;private noiseBuffer:AudioBuffer|null=null;
 private ticker:ReturnType<typeof setInterval>|null=null;private step=0;private nextBeat=0;private musicEnabled=false;private musicVolume=.35;private effectsVolume=.75;private active=false;private disposed=false;
 unlock(){if(this.disposed)return;try{if(!this.ctx){const ctx=new AudioContext();this.ctx=ctx;const master=ctx.createGain(),compressor=ctx.createDynamicsCompressor();master.gain.value=.7;compressor.threshold.value=-16;compressor.ratio.value=4;compressor.attack.value=.005;compressor.release.value=.16;compressor.connect(master);master.connect(ctx.destination);this.fx=ctx.createGain();this.fx.gain.value=this.effectsVolume;this.fx.connect(compressor);this.musicBus=ctx.createGain();this.musicBus.gain.value=this.musicEnabled?this.musicVolume*.28:0;this.duck=ctx.createGain();this.musicBus.connect(this.duck);this.duck.connect(compressor);this.noiseBuffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}if(this.ctx.state==='suspended')void this.ctx.resume().catch(()=>{});this.scheduleMusic();}catch{}}
 setLevels(effects:number,music:number,enabled:boolean){this.effectsVolume=effects;this.musicVolume=music;this.musicEnabled=enabled;if(this.ctx){this.fx?.gain.setTargetAtTime(effects,this.ctx.currentTime,.025);this.musicBus?.gain.setTargetAtTime(enabled?music*.28:0,this.ctx.currentTime,.08);}if(enabled)this.scheduleMusic();else this.stopClock();}
 setActive(active:boolean){this.active=active;}
 private tone(freq:number,endFreq:number,duration:number,volume:number,time:number,bus:AudioNode,type:OscillatorType='sine',pan=0){const ctx=this.ctx!;const oscillator=ctx.createOscillator(),amp=ctx.createGain(),panner=ctx.createStereoPanner();oscillator.type=type;oscillator.frequency.setValueAtTime(freq,time);oscillator.frequency.exponentialRampToValueAtTime(Math.max(1,endFreq),time+duration);amp.gain.setValueAtTime(.0001,time);amp.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+.004);amp.gain.exponentialRampToValueAtTime(.0001,time+duration);panner.pan.value=pan;oscillator.connect(amp);amp.connect(panner);panner.connect(bus);oscillator.start(time);oscillator.stop(time+duration+.015);oscillator.onended=()=>{oscillator.disconnect();amp.disconnect();panner.disconnect()};}
 private noise(duration:number,volume:number,frequency:number,time:number,bus:AudioNode,pan=0){const ctx=this.ctx!,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),amp=ctx.createGain(),panner=ctx.createStereoPanner();source.buffer=this.noiseBuffer;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.7;amp.gain.setValueAtTime(volume,time);amp.gain.exponentialRampToValueAtTime(.0001,time+duration);panner.pan.value=pan;source.connect(filter);filter.connect(amp);amp.connect(panner);panner.connect(bus);source.start(time,Math.random()*.5,duration);source.onended=()=>{source.disconnect();filter.disconnect();amp.disconnect();panner.disconnect()};}
 play(cue:SoundCue){this.unlock();if(!this.ctx||!this.fx||this.effectsVolume===0)return;const t=this.ctx.currentTime,fx=this.fx;const v=.96+Math.random()*.08;
  if(cue==='select'){this.noise(.055,.24,1800,t,fx);this.tone(180,95,.065,.15,t,fx);return;}
  if(cue==='jab'||cue==='heavy'||cue==='hurt'){const heavy=cue==='heavy',hurt=cue==='hurt';this.noise(heavy?.18:.105,heavy?.8:.6,hurt?480:900,t,fx,hurt?.2:-.1);this.tone((heavy?125:185)*v,40,heavy?.23:.13,heavy?.65:.38,t,fx);this.noise(.04,.3,2600,t+.008,fx);}
  if(cue==='block'){this.noise(.1,.44,420,t,fx);this.tone(270,110,.12,.24,t,fx,'triangle');}
  if(cue==='parry'){this.noise(.05,.28,2400,t,fx);[780,1170,1560].forEach((n,i)=>this.tone(n,n*.97,.24,.12/(i+1),t+i*.015,fx,'triangle'));}
  if(cue==='feint'){this.noise(.17,.5,1700,t,fx,-.35);this.tone(430,710,.13,.13,t+.04,fx,'triangle',.35);}
  if(cue==='recover'){this.noise(.32,.12,900,t,fx);this.tone(220,330,.26,.1,t+.06,fx,'sine');}
  if(cue==='miss'){this.noise(.1,.24,600,t,fx);this.tone(240,95,.2,.18,t,fx,'triangle');}
  if(cue==='bell'){[620,1240,1710].forEach((n,i)=>this.tone(n,n*.998,.8,.22/(i+1),t,fx,'sine'));}
  if(cue==='win'||cue==='lose'){const notes=cue==='win'?[330,415,494,660]:[330,294,247,220];notes.forEach((n,i)=>this.tone(n,n,.25,.22,t+i*.12,fx,'triangle'));}
  if(this.duck){this.duck.gain.cancelScheduledValues(t);this.duck.gain.setValueAtTime(.38,t);this.duck.gain.setTargetAtTime(1,t+.12,.14);}
 }
 private scheduleMusic(){if(!this.ctx||!this.musicEnabled||this.ticker||this.disposed)return;this.nextBeat=this.ctx.currentTime+.06;const tick=()=>{const ctx=this.ctx;if(!ctx||ctx.state!=='running')return;if(this.nextBeat<ctx.currentTime-.2)this.nextBeat=ctx.currentTime+.04;while(this.nextBeat<ctx.currentTime+.12){this.beat(this.step++,this.nextBeat);this.nextBeat+=60/104/4;}};tick();this.ticker=setInterval(tick,25);}
 private beat(step:number,t:number){const bus=this.musicBus!;const s=step%16,bar=Math.floor(step/16)%8;const root=[82.41,82.41,98,98,110,110,73.42,82.41][bar];
  if([0,6,10].includes(s))this.tone(115,39,.18,.58,t,bus);
  if(s===4||s===12){this.noise(.09,.4,1300,t,bus);this.tone(180,130,.07,.1,t,bus);}
  if(s%2===0||this.active)this.noise(.035,s%2?.08:.14,6400,t,bus,s%4===0?-.35:.35);
  if([0,3,7,10,14].includes(s))this.tone(root*(s===14?2:1),root*(s===14?2:1),.17,.27,t,bus,'triangle');
  if([2,5,8,11,15].includes(s))this.tone(1450,700,.035,.11,t,bus,'sine',s%2?-.3:.3);
  if([1,7,13].includes(s)){const ratio=[1.5,2,2.25][[1,7,13].indexOf(s)];this.tone(root*4*ratio,root*4*ratio,.22,.075,t,bus,'triangle',.2);}
 }
 private stopClock(){if(this.ticker)clearInterval(this.ticker);this.ticker=null;}
 suspend(){this.stopClock();if(this.ctx?.state==='running')void this.ctx.suspend().catch(()=>{});}
 resume(){if(this.ctx){void this.ctx.resume().then(()=>this.scheduleMusic()).catch(()=>{});}}
 dispose(){this.disposed=true;this.stopClock();void this.ctx?.close().catch(()=>{});this.ctx=null;}
}
