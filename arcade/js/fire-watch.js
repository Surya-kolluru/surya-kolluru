import {storage} from "./storage.js";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
export class FireWatchGame{
  constructor(canvas,audio){
    this.canvas=canvas;this.ctx=canvas.getContext("2d");this.audio=audio;this.w=1200;this.h=720;
    this.scene=new Image();this.scene.src=new URL("../assets/fire-watch/valley.svg",import.meta.url).href;this.scene.onload=()=>this.render();
    this.best=storage.getBest("fire");this.state="ready";this.score=0;this.lives=3;this.stage=1;this.stageWins=0;this.stageQuota=7;
    this.fires=[];this.shots=[];this.particles=[];this.smoke=[];this.splashes=[];this.ambient=[];this.time=0;this.spawnClock=0;this.spawnIndex=0;
    this.aim={x:590,y:300};this.wind=0;this.windTarget=0;this.windClock=0;this.gunKick=0;this.announcement=0;this.pointerActive=false;this.active=true;
    this.reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.bind();this.reset();
  }
  $(id){return document.getElementById(id)}
  bind(){
    this.onMove=e=>{if(!this.active)return;this.aimAt(e)};
    this.onDown=e=>{if(!this.active)return;e.preventDefault();this.aimAt(e);if(this.state==="ready")this.start();if(this.state==="playing")this.fire()};
    this.canvas.addEventListener("pointermove",this.onMove);this.canvas.addEventListener("pointerdown",this.onDown);
    this.$("fire-start").addEventListener("click",()=>this.start());
    this.$("fire-pause").addEventListener("click",()=>this.togglePause());
    this.$("fire-restart").addEventListener("click",()=>this.restart());
    this.onKey=e=>{if(!this.active||e.key!==" ")return;e.preventDefault();if(this.state==="ready")this.start();if(this.state==="playing")this.fire()};
    document.addEventListener("keydown",this.onKey);
  }
  reset(){
    this.state="ready";this.score=0;this.lives=3;this.stage=1;this.stageWins=0;this.stageQuota=7;
    this.fires=[];this.shots=[];this.particles=[];this.smoke=[];this.splashes=[];this.spawnClock=0;this.spawnIndex=0;
    this.wind=0;this.windTarget=0;this.windClock=0;this.time=0;this.gunKick=0;this.announcement=0;
    this.aim={x:600,y:300};for(let i=0;i<2;i++)this.spawnFire(true);
    this.updateHud();this.overlay("NORTH RIDGE · FIELD NOTE 01","The valley is quiet.","Small fires are appearing along the tree line. Aim from the lookout and cool each one before it reaches the homes below.","BEGIN THE WATCH");
    this.$("fire-pause").textContent="PAUSE";this.render();
  }
  restart(){this.reset();this.audio.play("fire-start")}
  overlay(kicker,title,copy,button){
    this.$("fire-overlay-kicker").textContent=kicker;this.$("fire-overlay-title").textContent=title;this.$("fire-overlay-copy").textContent=copy;this.$("fire-start").textContent=button;this.$("fire-overlay").hidden=false;
  }
  start(){if(this.state==="over")this.reset();this.state="playing";this.$("fire-overlay").hidden=true;this.audio.unlock();this.audio.play("fire-start")}
  togglePause(){
    if(this.state==="playing"){this.state="paused";this.$("fire-pause").textContent="RESUME";this.overlay("NORTH RIDGE · RADIO SILENCE","Lookout paused.","The wind can wait. Resume the watch when you are ready.","RESUME WATCH")}
    else if(this.state==="paused"){this.state="playing";this.$("fire-overlay").hidden=true;this.$("fire-pause").textContent="PAUSE"}
    else if(this.state==="ready")this.start();
  }
  aimAt(e){
    const r=this.canvas.getBoundingClientRect();const x=(e.clientX-r.left)*this.w/r.width,y=(e.clientY-r.top)*this.h/r.height;
    this.aim={x,y};this.pointerActive=true;
  }
  fire(){
    const origin={x:600,y:580},dx=this.aim.x-origin.x,dy=this.aim.y-origin.y;
    const length=Math.max(1,Math.hypot(dx,dy)),vx=dx/length,vy=dy/length;
    this.shots.push({x:origin.x+vx*49,y:origin.y+vy*49,vx:vx*850,vy:vy*850,life:1.2,trail:[]});
    this.gunKick=1;this.audio.play("fire-shot");
  }
  spawnFire(initial=false){
    const x=initial?180+Math.random()*840:100+Math.random()*1000;
    const y=initial?210+Math.random()*140:145+Math.random()*280;
    const targetX=170+Math.random()*860,targetY=575;
    const dx=targetX-x,dy=targetY-y,d=Math.hypot(dx,dy)||1;
    const size=(this.stage>=4?24:17)+Math.random()*(this.stage>=3?13:8);
    const strength=this.stage>=4&&Math.random()<.45?2:1;
    this.fires.push({x,y,vx:dx/d,vy:dy/d,size,health:strength,maxHealth:strength,phase:Math.random()*6.28,age:0,smokeClock:0,seed:Math.random()*10});
    this.spawnIndex++;
  }
  weather(){
    if(this.stage===1)return {name:"CALM",direction:"STILL",strength:0};
    if(this.stage===2)return {name:"LIGHT BREEZE",direction:"NORTH-EAST",strength:12};
    if(this.stage===3)return {name:this.windTarget<0?"WIND WEST":"WIND EAST",direction:this.windTarget<0?"WEST":"EAST",strength:30};
    return {name:"GUSTING",direction:this.windTarget<0?"WEST":"EAST",strength:55};
  }
  updateHud(){
    this.$("fire-score").textContent=String(this.score).padStart(4,"0");this.$("fire-best").textContent=String(this.best).padStart(4,"0");
    this.$("fire-stage").textContent=String(this.stage).padStart(2,"0");this.$("fire-lives").textContent=String(this.lives).padStart(2,"0");
    const w=this.weather();this.$("fire-weather").textContent=w.name;this.$("fire-weather-direction").textContent=w.direction;
  }
  stageUp(){
    this.stage=Math.min(4,this.stage+1);this.stageWins=0;this.stageQuota=[0,7,9,11,14][this.stage];
    this.announcement=3.2;
    const copy={
      2:["SHIFT 02 · A BREEZE IS RISING","More sparks along the southern slope.","The line is getting busier."],
      3:["SHIFT 03 · THE WIND HAS TURNED","Crosswinds are carrying embers sideways.","Lead your shots into the gust."],
      4:["SHIFT 04 · FOREST EMERGENCY","Large crowns are beginning to catch.","The valley needs a steady hand."]
    }[this.stage];
    this.$("fire-announcement-kicker").textContent=copy[0];this.$("fire-announcement-title").textContent=copy[1];this.$("fire-announcement-copy").textContent=copy[2];this.$("fire-announcement").hidden=false;
    this.audio.play("fire-wave");this.updateHud();
  }
  douse(f){
    this.burst(f.x,f.y,"water");this.smoke.push({x:f.x,y:f.y,vx:(Math.random()-.5)*18,vy:-22,life:1.1,size:f.size*.8});
    f.health--;
    if(f.health<=0){
      this.fires.splice(this.fires.indexOf(f),1);this.score+=100;
      this.stageWins++;if(this.score>this.best){this.best=this.score;storage.setBest("fire",this.best)}
      this.audio.play("fire-hit");
      if(this.stageWins>=this.stageQuota)this.stageUp();
    }else{f.size*=.78;this.audio.play("fire-hit")}
    this.updateHud();
  }
  burst(x,y,type){
    const water=type==="water";
    for(let i=0;i<(water?20:12);i++){
      const a=Math.random()*Math.PI*2,s=(water?40:30)+Math.random()*(water?190:120);
      this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-(water?20:12),life:.35+Math.random()*.55,max:.9,r:1.4+Math.random()*3,type});
    }
    if(water)this.splashes.push({x,y,life:.55,max:.55});
  }
  loseLife(x,y){
    this.burst(x,y,"ember");this.lives--;this.audio.play("fire-damage");this.updateHud();
    if(this.lives<=0){
      this.state="over";this.audio.play("fire-over");
      this.overlay("NORTH RIDGE · END OF SHIFT","The valley needs a rest.",`You held the line through shift ${this.stage} and scored ${this.score} points. Your best is ${this.best}. Take the watch again?`,"START ANOTHER SHIFT");
    }
  }
  update(dt){
    this.time+=dt;
    if(this.announcement>0){this.announcement-=dt;if(this.announcement<=0)this.$("fire-announcement").hidden=true}
    if(this.state!=="playing")return;
    this.windClock+=dt;
    if(this.windClock>4.5){this.windClock=0;this.windTarget=(Math.random()-.5)*2*(this.stage>=4?55:this.stage>=3?32:14);this.updateHud()}
    const weather=this.weather();this.wind=lerp(this.wind,this.stage<=2?weather.strength*this.windTarget/14:this.windTarget,Math.min(1,dt*.7));
    this.spawnClock+=dt;
    const interval=[0,1.7,1.4,1.1,.82][this.stage],limit=4+this.stage*2;
    if(this.spawnClock>interval&&this.fires.length<limit){this.spawnClock=0;this.spawnFire()}
    for(let i=this.fires.length-1;i>=0;i--){
      const f=this.fires[i];f.age+=dt;f.phase+=dt*(5+this.stage*.35);f.x+=f.vx*(42+this.stage*9)*dt+this.wind*dt;f.y+=f.vy*(45+this.stage*8)*dt;
      f.x=clamp(f.x,28,1172);f.smokeClock+=dt;
      if(f.smokeClock>.18){f.smokeClock=0;this.smoke.push({x:f.x+(Math.random()-.5)*10,y:f.y-f.size*.4,vx:(Math.random()-.5)*14+this.wind*.18,vy:-20-Math.random()*19,life:1.1+Math.random()*.6,size:f.size*.55})}
      if(f.y>594){this.fires.splice(i,1);this.loseLife(f.x,f.y);if(this.state!=="playing")return}
    }
    for(let i=this.shots.length-1;i>=0;i--){
      const b=this.shots[i];b.trail.push({x:b.x,y:b.y});if(b.trail.length>6)b.trail.shift();
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      if(b.life<=0||b.x<0||b.x>this.w||b.y<0||b.y>this.h){this.shots.splice(i,1);continue}
      for(let j=this.fires.length-1;j>=0;j--){
        const f=this.fires[j];if(Math.hypot(b.x-f.x,b.y-f.y)<f.size+10){this.shots.splice(i,1);this.douse(f);break}
      }
    }
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=45*dt;p.life-=dt;if(p.life<=0)this.particles.splice(i,1)}
    for(let i=this.smoke.length-1;i>=0;i--){const p=this.smoke[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx=lerp(p.vx,this.wind*.2,dt);p.life-=dt;p.size+=dt*5;if(p.life<=0)this.smoke.splice(i,1)}
    for(let i=this.splashes.length-1;i>=0;i--){this.splashes[i].life-=dt;if(this.splashes[i].life<=0)this.splashes.splice(i,1)}
    this.gunKick=Math.max(0,this.gunKick-dt*5);
  }
  drawFire(c,f){
    const r=f.size*(.95+Math.sin(f.phase)*.08),x=f.x,y=f.y;
    c.save();c.translate(x,y);
    c.shadowColor="#d66d41";c.shadowBlur=18;
    const flame=(scale,shift,color)=>{
      c.fillStyle=color;c.beginPath();c.moveTo(-r*scale,r*.72);c.bezierCurveTo(-r*1.15*scale,r*.1,-r*.55*scale,-r*.72*scale,r*.03*scale,-r*1.9*scale+shift);c.bezierCurveTo(r*.32*scale,-r*.6*scale,r*.42*scale,-r*1.08*scale+shift,r*.7*scale,-r*1.22*scale+shift);c.bezierCurveTo(r*1.22*scale,-r*.25*scale,r*1.1*scale,r*.66*scale,0,r*.9);c.closePath();c.fill();
    };
    flame(1,Math.sin(f.phase*1.1)*3,"#a94c37");c.shadowBlur=0;flame(.68,Math.sin(f.phase*1.4)*2,"#d98550");flame(.34,0,"#f0c579");
    c.restore();
    c.fillStyle="#e2b66e";for(let i=0;i<3;i++){const a=f.phase+i*2.1;c.beginPath();c.arc(x+Math.cos(a)*r*.9,y-r*(1.1+Math.sin(a)*.2),1.6,0,Math.PI*2);c.fill()}
  }
  drawCannon(c){
    const ox=600,oy=580,angle=Math.atan2(this.aim.y-oy,this.aim.x-ox);
    c.save();c.translate(ox,oy);c.fillStyle="#473d31";c.beginPath();c.ellipse(0,13,60,17,0,0,Math.PI*2);c.fill();
    c.fillStyle="#a87e51";c.beginPath();c.roundRect(-42,-3,84,26,5);c.fill();c.strokeStyle="#513e30";c.lineWidth=4;c.stroke();
    c.rotate(angle);c.fillStyle="#556b60";c.beginPath();c.roundRect(-12,-72-this.gunKick*5,24,74,7);c.fill();c.strokeStyle="#273e38";c.lineWidth=4;c.stroke();
    c.fillStyle="#9cb2a0";c.beginPath();c.roundRect(-7,-68-this.gunKick*5,8,56,3);c.fill();c.restore();
    c.fillStyle="#e4d9bd";c.beginPath();c.ellipse(600,578,19,13,0,0,Math.PI*2);c.fill();c.strokeStyle="#465c50";c.lineWidth=4;c.stroke();
  }
  drawScene(c){
    if(this.scene.complete&&this.scene.naturalWidth)c.drawImage(this.scene,0,0,this.w,this.h);
    else{c.fillStyle="#78908a";c.fillRect(0,0,this.w,this.h)}
    // Distance haze and small wind ribbons give the static painted valley some life.
    c.save();c.globalAlpha=.1;c.fillStyle="#e9d9b7";c.fillRect(0,420,this.w,95);c.restore();
    for(let i=0;i<5;i++){const x=(i*263+this.time*(8+i*2))%(this.w+160)-80,y=85+i*44;c.strokeStyle="#e0dfc7";c.globalAlpha=.12;c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+35,y-7,x+90,y);c.stroke()}c.globalAlpha=1;
  }
  render(){
    const c=this.ctx;c.clearRect(0,0,this.w,this.h);this.drawScene(c);
    // Smoke is drawn behind the flames so the plume grows from the tree line.
    for(const p of this.smoke){c.globalAlpha=clamp(p.life/1.7,0,.33);c.fillStyle="#283832";c.beginPath();c.ellipse(p.x,p.y,p.size*.75,p.size,0,0,Math.PI*2);c.fill()}c.globalAlpha=1;
    this.fires.forEach(f=>this.drawFire(c,f));
    for(const b of this.shots){
      b.trail.forEach((p,i)=>{c.globalAlpha=(i+1)/b.trail.length*.22;c.fillStyle="#e0f1df";c.beginPath();c.arc(p.x,p.y,2+i*.3,0,Math.PI*2);c.fill()});
      c.globalAlpha=1;c.fillStyle="#dcefe9";c.strokeStyle="#729b92";c.lineWidth=2;c.beginPath();c.ellipse(b.x,b.y,5,8,Math.atan2(b.vy,b.vx),0,Math.PI*2);c.fill();c.stroke();
    }
    for(const p of this.particles){c.globalAlpha=clamp(p.life/p.max,0,1);c.fillStyle=p.type==="water"?"#d9eee4":"#e6a15d";c.beginPath();c.arc(p.x,p.y,p.r,0,Math.PI*2);c.fill()}c.globalAlpha=1;
    for(const s of this.splashes){const t=1-s.life/s.max;c.globalAlpha=1-t;c.strokeStyle="#e8f2e4";c.lineWidth=3;c.beginPath();c.ellipse(s.x,s.y,8+t*30,4+t*12,0,Math.PI,Math.PI*2);c.stroke()}c.globalAlpha=1;
    this.drawCannon(c);
    // A few small ember markers make distant ignition points readable.
    c.fillStyle="#d7b57f";c.font="11px monospace";c.fillText("NORTH RIDGE LOOKOUT",24,30);
    c.fillStyle="#e8dcc3";c.font="10px monospace";c.fillText("KEEP THE VALLEY SAFE",this.w-207,this.h-20);
    if(this.state==="paused"){c.fillStyle="#18251fd9";c.fillRect(0,0,this.w,this.h);c.fillStyle="#f3eddb";c.font="34px Georgia";c.textAlign="center";c.fillText("WATCH PAUSED",this.w/2,this.h/2);c.textAlign="left"}
  }
  setActive(v){this.active=!!v}
  destroy(){this.canvas.removeEventListener("pointermove",this.onMove);this.canvas.removeEventListener("pointerdown",this.onDown);document.removeEventListener("keydown",this.onKey)}
}
