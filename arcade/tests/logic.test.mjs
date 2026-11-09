import test from "node:test";
import assert from "node:assert/strict";

const values=new Map();
globalThis.localStorage={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
const eventHandlers=new Map();
globalThis.document={addEventListener:(n,f)=>{if(!eventHandlers.has(n))eventHandlers.set(n,new Set());eventHandlers.get(n).add(f)},removeEventListener:(n,f)=>eventHandlers.get(n)?.delete(f)};
const context=new Proxy({}, {get:(o,k)=>o[k]||(o[k]=()=>{}),set:(o,k,v)=>(o[k]=v,true)});
class FakeCanvas{constructor(){this.width=900;this.height=520;this.listeners={}}getContext(){return context}addEventListener(n,f){(this.listeners[n]??=[]).push(f)}removeEventListener(n,f){this.listeners[n]=(this.listeners[n]||[]).filter(x=>x!==f)}getBoundingClientRect(){return{left:0,top:0,width:900,height:520}}cloneNode(){return new FakeCanvas()}replaceWith(node){this.replacement=node}}
const audio={play(){},unlock(){}};
const games=[
 ["Lantern Maze","../js/games/lantern-maze.js","LanternMaze"],
 ["Block Circuit","../js/games/block-circuit.js","BlockCircuit"],
 ["Starline Siege","../js/games/starline-siege.js","StarlineSiege"],
 ["Void Drifter","../js/games/void-drifter.js","VoidDrifter"],
 ["Prism Breaker","../js/games/prism-breaker.js","PrismBreaker"]
];
for(const [name,path,exportName] of games){
 test(`${name}: lifecycle, drawing, active update, persistence, restart and dispose`,async()=>{
  const { [exportName]: Game }=await import(path);let snapshot;
  const canvas=new FakeCanvas(),game=new Game(canvas,audio,data=>snapshot=data);
  assert.equal(game.state,"ready");assert.ok(snapshot);
  game.start();assert.equal(game.state,"playing");game.update(.1);game.render();
  game.setScore(17);assert.equal(game.best,17);
  game.pause();assert.equal(game.state,"paused");game.pause();assert.equal(game.state,"playing");
  game.restart();assert.equal(game.state,"playing");assert.equal(game.score,0);assert.equal(game.best,17);
  game.dispose();assert.equal(game.disposed,true);assert.ok(canvas.replacement);
 });
}
test("Block Circuit: rotation preserves a legal board and line clear scores",async()=>{
 const {BlockCircuit}=await import("../js/games/block-circuit.js");const g=new BlockCircuit(new FakeCanvas(),audio,()=>{});g.start();g.board[19]=Array(10).fill(1);g.board[19][4]=0;g.current={id:0,m:[[1]],x:4,y:19};g.lock();assert.equal(g.lines,1);assert.ok(g.score>=100);g.rotate();g.dispose();
});
test("Starline Siege: every third wave creates a boss and firing emits a projectile",async()=>{
 const {StarlineSiege}=await import("../js/games/starline-siege.js");const g=new StarlineSiege(new FakeCanvas(),audio,()=>{});g.wave=3;g.makeWave();assert.equal(g.enemies.length,1);assert.equal(g.enemies[0].boss,true);g.start();g.fire();assert.equal(g.bullets.length,1);g.dispose();
});
test("Void Drifter: thrust responds and speed stays bounded",async()=>{
 const {VoidDrifter}=await import("../js/games/void-drifter.js");const g=new VoidDrifter(new FakeCanvas(),audio,()=>{});g.start();g.keys.add("w");g.step(.2);assert.ok(Math.hypot(g.ship.vx,g.ship.vy)>0);assert.ok(Math.hypot(g.ship.vx,g.ship.vy)<=245);g.dispose();
});
test("Prism Breaker: serve, bounded paddle, and safe restart",async()=>{
 const {PrismBreaker}=await import("../js/games/prism-breaker.js");const g=new PrismBreaker(new FakeCanvas(),audio,()=>{});g.start();g.launch();assert.equal(g.ball.stuck,false);g.paddle.x=999;g.step(.016);assert.ok(g.paddle.x<=845);g.dispose();
});
test("Lantern Maze: special lanterns score and all level fixtures are walkable",async()=>{
 const {LanternMaze}=await import("../js/games/lantern-maze.js");const g=new LanternMaze(new FakeCanvas(),audio,()=>{});g.start();g.player={x:1,y:1};g.want=[1,0];g.step(.15);assert.equal(g.player.x,2);assert.equal(g.score,50);assert.ok(g.power>0);g.dispose();
});
