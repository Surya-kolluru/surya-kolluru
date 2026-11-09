import {storage} from "./storage.js";
export class AudioSystem{
  constructor(){
    this.prefs={effectsVolume:.72,musicVolume:.22,...storage.getAudio()};this.ctx=null;this.master=null;this.effectsBus=null;this.musicBus=null;this.musicNodes=[];
  }
  ensure(){
    if(this.ctx)return this.ctx;
    const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return null;
    this.ctx=new Ctx();this.master=this.ctx.createGain();this.effectsBus=this.ctx.createGain();this.musicBus=this.ctx.createGain();
    this.effectsBus.connect(this.master);this.musicBus.connect(this.master);this.master.connect(this.ctx.destination);
    this.master.gain.value=this.prefs.volume;this.effectsBus.gain.value=this.prefs.effects?this.prefs.effectsVolume:0;this.musicBus.gain.value=this.prefs.music?this.prefs.musicVolume:0;
    if(this.prefs.music)this.startMusic();return this.ctx;
  }
  unlock(){const c=this.ensure();if(c?.state==="suspended")c.resume();return !!c}
  save(){storage.setAudio(this.prefs)}
  setEffects(value){this.prefs.effects=!!value;this.ensure();if(this.effectsBus)this.effectsBus.gain.setTargetAtTime(value?this.prefs.effectsVolume:0,this.ctx.currentTime,.025);this.save()}
  setMusic(value){this.prefs.music=!!value;this.ensure();if(!this.ctx)return;if(value)this.startMusic();else this.stopMusic();this.musicBus.gain.setTargetAtTime(value?this.prefs.musicVolume:0,this.ctx.currentTime,.2);this.save()}
  setVolume(value){this.prefs.volume=Math.max(0,Math.min(1,Number(value)));this.ensure();if(this.master)this.master.gain.setTargetAtTime(this.prefs.volume,this.ctx.currentTime,.03);this.save()}
  setEffectsVolume(value){this.prefs.effectsVolume=Math.max(0,Math.min(1,Number(value)));this.ensure();if(this.effectsBus)this.effectsBus.gain.setTargetAtTime(this.prefs.effects?this.prefs.effectsVolume:0,this.ctx.currentTime,.03);this.save()}
  setMusicVolume(value){this.prefs.musicVolume=Math.max(0,Math.min(.4,Number(value)));this.ensure();if(this.musicBus)this.musicBus.gain.setTargetAtTime(this.prefs.music?this.prefs.musicVolume:0,this.ctx.currentTime,.05);this.save()}
  state(){return {...this.prefs}}
  tone(freq,duration=.09,wave="sine",volume=.12,slide=null,detune=0){
    const c=this.ensure();if(!c||!this.prefs.effects)return;
    const now=c.currentTime,osc=c.createOscillator(),gain=c.createGain();
    osc.type=wave;osc.frequency.setValueAtTime(freq,now);if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(20,slide),now+duration);
    osc.detune.value=detune;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain);gain.connect(this.effectsBus);osc.start(now);osc.stop(now+duration+.02);
  }
  noise(duration=.16,volume=.1,filter=1200){
    const c=this.ensure();if(!c||!this.prefs.effects)return;
    const n=Math.floor(c.sampleRate*duration),buffer=c.createBuffer(1,n,c.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*(1-i/n);
    const src=c.createBufferSource(),low=c.createBiquadFilter(),gain=c.createGain();src.buffer=buffer;low.type="lowpass";low.frequency.value=filter;
    gain.gain.setValueAtTime(volume,c.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);
    src.connect(low);low.connect(gain);gain.connect(this.effectsBus);src.start();
  }
  play(name){
    if(!this.prefs.effects)return;
    const sounds={
      "snake-start":()=>{this.tone(392,.11,"triangle",.08,523);this.tone(587,.13,"sine",.045,659)},
      "snake-turn":()=>this.tone(260,.025,"square",.018),
      "snake-eat":()=>{this.tone(650,.08,"triangle",.12,990);this.tone(990,.12,"sine",.06,1320)},
      "snake-level":()=>{this.tone(392,.13,"triangle",.1,523);this.tone(523,.13,"triangle",.1,659);this.tone(659,.18,"sine",.08,784)},
      "snake-hit":()=>{this.tone(190,.24,"sawtooth",.13,65);this.noise(.18,.07,500)},
      "fire-start":()=>{this.noise(.22,.08,550);this.tone(190,.28,"sine",.07,320)},
      "fire-shot":()=>{this.noise(.14,.08,1800);this.tone(460,.09,"sine",.04,260)},
      "fire-hit":()=>{this.noise(.18,.12,2400);this.tone(700,.11,"sine",.1,390)},
      "fire-damage":()=>{this.tone(165,.3,"sawtooth",.11,75);this.noise(.15,.07,330)},
      "fire-wave":()=>{[392,494,587].forEach((n,i)=>setTimeout(()=>this.tone(n,.2,"triangle",.09),i*100))},
      "fire-over":()=>{this.tone(330,.28,"triangle",.1,220);this.tone(220,.42,"sine",.08,110)},
      "chess-move":()=>{this.noise(.045,.05,950);this.tone(340,.035,"triangle",.035)},
      "chess-capture":()=>{this.noise(.11,.09,500);this.tone(180,.09,"triangle",.05,110)},
      "chess-check":()=>{this.tone(660,.11,"sine",.08,510)},
      "chess-end":()=>{this.tone(523,.18,"sine",.08,392);this.tone(392,.3,"sine",.06,294)}
    };
    sounds[name]?.();
  }
  startMusic(){
    if(this.musicNodes.length||!this.ctx)return;
    const c=this.ctx,now=c.currentTime;
    const pad=c.createGain();pad.gain.value=.0001;pad.connect(this.musicBus);pad.gain.setTargetAtTime(.18,now,.8);
    const filter=c.createBiquadFilter();filter.type="lowpass";filter.frequency.value=780;filter.connect(pad);
    const oscillators=[];
    [110,164.81,220].forEach((frequency,i)=>{
      const osc=c.createOscillator(),gain=c.createGain();osc.type=i===0?"triangle":"sine";osc.frequency.value=frequency;osc.detune.value=i===1?-4:3;gain.gain.value=i===0?.42:.2;osc.connect(gain);gain.connect(filter);osc.start();oscillators.push(osc,gain);
    });
    const lfo=c.createOscillator(),lfoGain=c.createGain();lfo.frequency.value=.08;lfoGain.gain.value=120;lfo.connect(lfoGain);lfoGain.connect(filter.frequency);lfo.start();
    this.musicNodes=[pad,filter,...oscillators,lfo,lfoGain];
  }
  stopMusic(){
    if(!this.musicNodes.length)return;
    const c=this.ctx,pad=this.musicNodes[0];pad.gain.setTargetAtTime(.0001,c.currentTime,.15);
    const nodes=this.musicNodes.slice(1);setTimeout(()=>nodes.forEach(n=>{try{n.stop?.();n.disconnect()}catch{}}),900);
    this.musicNodes=[];pad.disconnect();
  }
  destroy(){this.stopMusic();this.ctx?.close();this.ctx=null}
}
