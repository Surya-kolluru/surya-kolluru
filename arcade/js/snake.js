import {storage} from "./storage.js";

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;

export class SnakeGame{
  constructor(canvas,audio){
    this.canvas=canvas;this.ctx=canvas.getContext("2d");this.audio=audio;
    this.w=960;this.h=640;this.cols=24;this.rows=16;this.cell=40;
    this.score=0;this.best=storage.getBest("snake");this.level=1;this.state="ready";
    this.body=[];this.previous=[];this.direction={x:1,y:0};this.queue=[];this.food={x:16,y:8};
    this.accumulator=0;this.interval=145;this.particles=[];this.floaters=[];this.time=0;
    this.active=true;this.reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.bind();this.reset();
  }
  $(id){return document.getElementById(id)}
  bind(){
    this.onKey=e=>{
      if(!this.active)return;
      const key=e.key.toLowerCase(),map={arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]};
      if(map[key]){e.preventDefault();this.turn(...map[key])}
      if(key===" "&&this.state!=="over"){e.preventDefault();this.togglePause()}
    };
    document.addEventListener("keydown",this.onKey);
    this.onPad=e=>{
      const b=e.target.closest("[data-snake-dir]");if(!b)return;e.preventDefault();
      const m={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[b.dataset.snakeDir];this.turn(...m);
    };
    this.$("snake-pad").addEventListener("pointerdown",this.onPad);
    this.$("snake-start").addEventListener("click",()=>this.start());
    this.$("snake-pause").addEventListener("click",()=>this.togglePause());
    this.$("snake-restart").addEventListener("click",()=>this.restart());
  }
  reset(){
    const x=9,y=8;
    this.body=[{x,y},{x:x-1,y},{x:x-2,y}];this.previous=this.body.map(p=>({...p}));
    this.direction={x:1,y:0};this.queue=[];this.score=0;this.level=1;this.interval=145;
    this.accumulator=0;this.particles=[];this.floaters=[];this.state="ready";this.placeFood();
    this.updateHud();this.overlay("A LITTLE ARCADE CLASSIC","Ready for a round?","Collect the apples, grow carefully and keep your tail out of trouble.","START PLAYING");
    this.$("snake-pause").textContent="PAUSE";this.render(1);
  }
  restart(){this.reset();this.audio.play("snake-start")}
  placeFood(){
    const free=[];
    for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++)if(!this.body.some(p=>p.x===x&&p.y===y))free.push({x,y});
    if(!free.length){this.finish(true);return}
    this.food=free[Math.floor(Math.random()*free.length)];
  }
  turn(x,y){
    if(this.state==="over")return;
    const base=this.queue.length?this.queue[this.queue.length-1]:this.direction;
    if(x===-base.x&&y===-base.y)return;
    if(x===base.x&&y===base.y)return;
    if(this.queue.length>=2)return;
    this.queue.push({x,y});
    this.audio.play("snake-turn");
    if(this.state==="ready")this.start();
  }
  start(){
    if(this.state==="over")this.reset();
    if(this.state==="playing")return;
    this.state="playing";this.$("snake-overlay").hidden=true;this.$("snake-pause").textContent="PAUSE";
    this.$("snake-start").textContent="RESUME";this.audio.unlock();this.audio.play("snake-start");
  }
  togglePause(){
    if(this.state==="playing"){this.state="paused";this.$("snake-pause").textContent="RESUME";this.overlay("ROUND ON HOLD","Take a breath.","The garden will wait. Pick up where you left off whenever you're ready.","RESUME ROUND")}
    else if(this.state==="paused"){this.state="playing";this.$("snake-overlay").hidden=true;this.$("snake-pause").textContent="PAUSE"}
    else if(this.state==="ready")this.start();
  }
  overlay(kicker,title,copy,button){
    this.$("snake-overlay-kicker").textContent=kicker;this.$("snake-overlay-title").textContent=title;
    this.$("snake-overlay-copy").textContent=copy;this.$("snake-start").textContent=button;this.$("snake-overlay").hidden=false;
  }
  finish(won=false){
    if(this.state==="over")return;this.state="over";
    this.audio.play(won?"snake-level":"snake-hit");
    this.overlay(won?"GARDEN COMPLETE":"ROUND OVER",won?"Every apple collected.":"That was a close turn.",
      won?"You filled the whole garden. A perfect run.":`You collected ${this.score/10} apples and grew to ${this.body.length} segments. Best: ${this.best} points.`,
      "PLAY ANOTHER ROUND");
    this.$("snake-pause").textContent="PAUSE";
  }
  step(){
    if(this.queue.length)this.direction=this.queue.shift();
    const head={x:this.body[0].x+this.direction.x,y:this.body[0].y+this.direction.y};
    const eating=head.x===this.food.x&&head.y===this.food.y;
    if(head.x<0||head.x>=this.cols||head.y<0||head.y>=this.rows){this.finish();return}
    // The tail vacates its square on a non-eating move; entering that square is legal.
    const collisionBody=eating?this.body:this.body.slice(0,-1);
    if(collisionBody.some(p=>p.x===head.x&&p.y===head.y)){this.finish();return}
    this.previous=this.body.map(p=>({...p}));
    this.body.unshift(head);
    if(eating){
      this.score+=10;this.audio.play("snake-eat");this.burst((head.x+.5)*this.cell,(head.y+.5)*this.cell);
      this.floaters.push({x:(head.x+.5)*this.cell,y:head.y*this.cell,life:.8,text:"+10"});
      if(this.score>this.best){this.best=this.score;storage.setBest("snake",this.best)}
      const nextLevel=1+Math.floor(this.score/80);
      if(nextLevel>this.level){this.level=nextLevel;this.audio.play("snake-level")}
      this.interval=clamp(145-(this.level-1)*5,88,145);this.placeFood();
    }else this.body.pop();
    this.updateHud();
  }
  burst(x,y){
    for(let i=0;i<13;i++){const a=Math.random()*Math.PI*2,s=28+Math.random()*105;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-18,life:.38+Math.random()*.4,max:.8,r:1.5+Math.random()*2.7})}
  }
  updateHud(){
    this.$("snake-score").textContent=String(this.score).padStart(3,"0");
    this.$("snake-best").textContent=String(this.best).padStart(3,"0");
    this.$("snake-length").textContent=String(this.level).padStart(2,"0");
    this.$("snake-pace").textContent=(1+(this.level-1)*.12).toFixed(1)+"×";
  }
  update(dt){
    this.time+=dt;
    if(this.state==="playing"){
      this.accumulator+=dt*1000;
      while(this.accumulator>=this.interval&&this.state==="playing"){this.step();this.accumulator-=this.interval}
    }
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=75*dt;p.life-=dt;if(p.life<=0)this.particles.splice(i,1)}
    for(let i=this.floaters.length-1;i>=0;i--){const p=this.floaters[i];p.y-=27*dt;p.life-=dt;if(p.life<=0)this.floaters.splice(i,1)}
  }
  drawApple(c,x,y,r){
    c.save();c.translate(x,y);c.fillStyle="#00000020";c.beginPath();c.ellipse(1,14,r*1.15,r*.38,0,0,Math.PI*2);c.fill();
    c.beginPath();c.moveTo(0,-r*.55);c.bezierCurveTo(-r*1.45,-r*1.45,-r*1.65,r*.2,-r*.75,r*.95);c.bezierCurveTo(-r*.25,r*1.55,r*.25,r*1.4,r*.8,r*.95);c.bezierCurveTo(r*1.65,r*.15,r*1.35,-r*1.4,0,-r*.55);c.fillStyle="#b64f3e";c.fill();
    c.strokeStyle="#844334";c.lineWidth=2;c.stroke();c.strokeStyle="#5b4934";c.lineWidth=3;c.beginPath();c.moveTo(-1,-r*.7);c.quadraticCurveTo(-4,-r*1.35,2,-r*1.55);c.stroke();
    c.fillStyle="#73865a";c.beginPath();c.moveTo(1,-r*1.15);c.quadraticCurveTo(r*.9,-r*1.85,r*1.3,-r*1.1);c.quadraticCurveTo(r*.65,-r*.65,1,-r*1.15);c.fill();
    c.fillStyle="#e9a18a";c.beginPath();c.ellipse(-r*.6,-r*.12,r*.17,r*.32,-.3,0,Math.PI*2);c.fill();c.restore();
  }
  drawSnake(c,alpha){
    const size=this.cell;
    const points=this.body.map((p,i)=>{
      const old=this.previous[Math.min(i,this.previous.length-1)]||p;
      return {x:(lerp(old.x,p.x,alpha)+.5)*size,y:(lerp(old.y,p.y,alpha)+.5)*size};
    });
    if(points.length>1){
      c.lineCap="round";c.lineJoin="round";c.strokeStyle="#3f684b";c.lineWidth=27;c.beginPath();c.moveTo(points[points.length-1].x,points[points.length-1].y);for(let i=points.length-2;i>=0;i--)c.lineTo(points[i].x,points[i].y);c.stroke();
      c.strokeStyle="#8fa982";c.lineWidth=17;c.beginPath();c.moveTo(points[points.length-1].x,points[points.length-1].y);for(let i=points.length-2;i>=0;i--)c.lineTo(points[i].x,points[i].y);c.stroke();
    }
    points.slice(1,-1).forEach((p,i)=>{
      c.fillStyle=i%2?"#7f9c75":"#91a985";c.beginPath();c.ellipse(p.x,p.y,14,12,0,0,Math.PI*2);c.fill();
      c.fillStyle="#c7d0a8";c.beginPath();c.ellipse(p.x-2,p.y-4,6,2,0,0,Math.PI*2);c.fill();
    });
    const p=points[0],angle=Math.atan2(this.direction.y,this.direction.x);
    c.save();c.translate(p.x,p.y);c.rotate(angle);
    c.fillStyle="#476e4d";c.beginPath();c.ellipse(0,0,23,18,0,0,Math.PI*2);c.fill();
    c.fillStyle="#94b082";c.beginPath();c.ellipse(1,-4,16,10,0,0,Math.PI*2);c.fill();
    c.fillStyle="#293b2c";c.beginPath();c.ellipse(10,-7,2.9,3.6,0,0,Math.PI*2);c.ellipse(10,7,2.9,3.6,0,0,Math.PI*2);c.fill();
    c.fillStyle="#f5ead6";c.beginPath();c.arc(11,-8,1,0,Math.PI*2);c.arc(11,6,1,0,Math.PI*2);c.fill();
    c.restore();
    const tail=points[points.length-1];c.fillStyle="#537753";c.beginPath();c.moveTo(tail.x,tail.y);c.lineTo(tail.x-12,tail.y-7);c.lineTo(tail.x-12,tail.y+7);c.closePath();c.fill();
  }
  render(alpha=1){
    const c=this.ctx,w=this.w,h=this.h;c.clearRect(0,0,w,h);c.fillStyle="#e7e1d0";c.fillRect(0,0,w,h);
    c.fillStyle="#d8d4c2";c.fillRect(18,18,w-36,h-36);
    c.fillStyle="#ece7d8";c.fillRect(31,31,w-62,h-62);
    c.strokeStyle="#d8d2c0";c.lineWidth=1;
    for(let x=40;x<w;x+=40){c.beginPath();c.moveTo(x,36);c.lineTo(x,h-36);c.stroke()}
    for(let y=40;y<h;y+=40){c.beginPath();c.moveTo(36,y);c.lineTo(w-36,y);c.stroke()}
    c.strokeStyle="#acb29a";c.lineWidth=1.5;c.strokeRect(18,18,w-36,h-36);
    c.fillStyle="#75836c";c.font="12px monospace";c.fillText("THE GARDEN / "+String(this.level).padStart(2,"0"),43,24);
    const fx=(this.food.x+.5)*this.cell,fy=(this.food.y+.5)*this.cell;
    this.drawApple(c,fx,fy+Math.sin(this.time*2.7)*2.8,13);
    this.drawSnake(c,alpha);
    this.particles.forEach(p=>{c.globalAlpha=Math.max(0,p.life/p.max);c.fillStyle="#bf7952";c.beginPath();c.arc(p.x,p.y,p.r,0,Math.PI*2);c.fill()});c.globalAlpha=1;
    this.floaters.forEach(p=>{c.globalAlpha=clamp(p.life/.8,0,1);c.fillStyle="#426b4c";c.font="bold 17px Georgia";c.textAlign="center";c.fillText(p.text,p.x,p.y)});c.globalAlpha=1;c.textAlign="left";
    c.fillStyle="#8b957c";c.font="11px monospace";c.fillText("USE THE OPEN SPACE. WATCH YOUR TAIL.",43,h-19);
  }
  setActive(v){this.active=!!v}
  destroy(){document.removeEventListener("keydown",this.onKey);this.$("snake-pad").removeEventListener("pointerdown",this.onPad)}
}
