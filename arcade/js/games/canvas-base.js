import {storage} from "../storage.js";

export class CanvasArcadeGame {
  constructor(canvas, audio, id, onChange=()=>{}) {
    this.canvas=canvas; this.ctx=canvas.getContext("2d"); this.audio=audio; this.id=id; this.onChange=onChange;
    this.width=900; this.height=520; this.state="ready"; this.score=0; this.level=1; this.lives=3; this.elapsed=0;
    this.best=storage.getBest(id); this.keys=new Set(); this.touching=false; this.disposed=false;
    this.keydown=e=>{ if(this.disposed)return; if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault(); this.keys.add(e.key.toLowerCase()); };
    this.keyup=e=>this.keys.delete(e.key.toLowerCase());
    document.addEventListener("keydown",this.keydown); document.addEventListener("keyup",this.keyup);
    this.canvas.addEventListener("contextmenu",e=>e.preventDefault());
    this.emit();
  }
  emit(){ this.onChange({state:this.state,score:this.score,best:this.best,level:this.level,lives:this.lives}); }
  setState(state){ if(this.state===state)return; this.state=state; this.emit(); if(state==="over")this.audio.play("arcade-over"); }
  setScore(value){this.score=Math.max(0,Math.floor(value));if(this.score>this.best){this.best=this.score;storage.setBest(this.id,this.best)}this.emit()}
  start(){if(this.state==="over")this.restart();this.audio.unlock();this.setState("playing");this.audio.play("arcade-start")}
  pause(){if(this.state==="playing")this.setState("paused");else if(this.state==="paused")this.setState("playing")}
  restart(){this.score=0;this.level=1;this.lives=3;this.elapsed=0;this.keys.clear();this.reset();this.setState("playing");this.emit();this.audio.unlock();this.audio.play("arcade-start")}
  end(){this.setState("over")}
  update(dt){if(this.state!=="playing")return;dt=Math.min(.04,Math.max(0,dt));this.elapsed+=dt;this.step(dt)}
  render(){const c=this.ctx;c.clearRect(0,0,this.width,this.height);this.paint(c)}
  fit(){return {sx:this.canvas.width/this.width,sy:this.canvas.height/this.height}}
  dispose(){this.disposed=true;document.removeEventListener("keydown",this.keydown);document.removeEventListener("keyup",this.keyup);this.canvas.replaceWith(this.canvas.cloneNode(false))}
  reset(){} step(){} paint(){}
}
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const rand=(a,b)=>a+Math.random()*(b-a);
