import {AudioSystem} from "./audio.js";
import {SnakeGame} from "./snake.js";
import {FireWatchGame} from "./fire-watch.js";

const $=id=>document.getElementById(id),audio=new AudioSystem();
const snake=new SnakeGame($("snake-canvas"),audio),fire=new FireWatchGame($("fire-canvas"),audio);
snake.setActive(false);fire.setActive(false);
let chess=null,newGame=null,current=null,lastFrame=0,raf=0,routeSerial=0,attractTimer=0,attractIndex=0;
const descriptions={
 snake:{title:"Snake",kicker:"01 / ARCADE CLASSIC"},fire:{title:"Fire Watch",kicker:"02 / FOREST DEFENCE"},chess:{title:"Chess",kicker:"03 / THE CLASSIC"},
 "lantern-maze":{title:"Lantern Maze",kicker:"04 / NIGHT CHASE",description:"Gather every glow. Keep one turn ahead.",controls:"Arrow keys or W A S D to turn. Collect every light; golden lanterns give you a short window to chase the keepers.",load:()=>import("./games/lantern-maze.js").then(m=>m.LanternMaze)},
 "block-circuit":{title:"Block Circuit",kicker:"05 / PUZZLE CIRCUIT",description:"Fit the fall. Keep the signal alive.",controls:"Left / right to move, up to rotate, down to soft drop, Space to hard drop, C to hold. Clear full lines to raise your circuit level.",load:()=>import("./games/block-circuit.js").then(m=>m.BlockCircuit)},
 "starline-siege":{title:"Starline Siege",kicker:"06 / DEEP SPACE",description:"Hold the line through wave after wave.",controls:"A / D or left / right to move. Hold Space to fire. Green drops restore a shield; a heavy cruiser arrives every third wave.",load:()=>import("./games/starline-siege.js").then(m=>m.StarlineSiege)},
 "void-drifter":{title:"Void Drifter",kicker:"07 / VECTOR RUN",description:"Turn, thrust, and trust your momentum.",controls:"A / D or left / right to turn, W or up to thrust, Space to fire. Momentum carries; use short thrusts and wraparound to survive.",load:()=>import("./games/void-drifter.js").then(m=>m.VoidDrifter)},
 "prism-breaker":{title:"Prism Breaker",kicker:"08 / LIGHT PLAY",description:"Catch the light. Let nothing slip by.",controls:"Move the paddle with your mouse or touch. Tap the playfield or press Space to serve. Left and right arrows also move the paddle.",load:()=>import("./games/prism-breaker.js").then(m=>m.PrismBreaker)}
};
function setAudioControls(){const p=audio.state();$("sound-toggle").setAttribute("aria-pressed",String(p.effects));$("music-toggle").setAttribute("aria-pressed",String(p.music));$("master-volume").value=p.volume;$("effects-volume").value=p.effectsVolume;$("music-volume").value=p.musicVolume;let crt=false;try{crt=localStorage.getItem("lantern-room:crt")==="1"}catch{}$("crt-toggle").checked=crt;document.documentElement.classList.toggle("crt-enabled",crt)}
$("sound-toggle").addEventListener("click",()=>{audio.unlock();audio.setEffects(!audio.state().effects);setAudioControls()});
$("music-toggle").addEventListener("click",()=>{audio.unlock();audio.setMusic(!audio.state().music);setAudioControls()});
$("master-volume").addEventListener("input",e=>audio.setVolume(e.target.value));$("effects-volume").addEventListener("input",e=>audio.setEffectsVolume(e.target.value));$("music-volume").addEventListener("input",e=>audio.setMusicVolume(e.target.value));
$("crt-toggle").addEventListener("change",e=>{document.documentElement.classList.toggle("crt-enabled",e.target.checked);try{localStorage.setItem("lantern-room:crt",e.target.checked?"1":"0")}catch{}});
document.querySelectorAll("[data-fullscreen]").forEach(button=>button.addEventListener("click",async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $("play-room").requestFullscreen()}catch(error){console.warn("Fullscreen unavailable",error)}}));
document.addEventListener("fullscreenchange",()=>document.querySelectorAll("[data-fullscreen]").forEach(button=>button.textContent=document.fullscreenElement?"EXIT FULLSCREEN":"FULLSCREEN"));
setAudioControls();
function stopAttract(){clearInterval(attractTimer);attractTimer=0;document.querySelectorAll(".game-card").forEach(card=>card.classList.remove("attract-active"))}
function setAttract(enabled){
  const button=$("attract-toggle");button.setAttribute("aria-pressed",String(enabled));button.innerHTML=enabled?"ATTRACT MODE · ON <span>◌</span>":"START ATTRACT MODE <span>↗</span>";
  try{localStorage.setItem("lantern-room:attract",enabled?"1":"0")}catch{}
  stopAttract();if(!enabled||current)return;
  const cards=[...document.querySelectorAll("[data-open-game]")];if(!cards.length)return;
  const show=()=>{cards.forEach((card,i)=>card.classList.toggle("attract-active",i===attractIndex));attractIndex=(attractIndex+1)%cards.length};
  show();if(!matchMedia("(prefers-reduced-motion: reduce)").matches)attractTimer=setInterval(()=>{if(!document.hidden&&!current)show()},2800);
}
let attractEnabled=false;try{attractEnabled=localStorage.getItem("lantern-room:attract")==="1"}catch{}
$("attract-toggle").addEventListener("click",()=>{attractEnabled=!attractEnabled;setAttract(attractEnabled)});if(attractEnabled)setAttract(true);
function updateNewGameHud(data){
 $("new-score").textContent=String(data.score).padStart(4,"0");$("new-best").textContent=String(data.best).padStart(4,"0");$("new-level").textContent=String(data.level).padStart(2,"0");$("new-lives").textContent=String(data.lives).padStart(2,"0");$("new-game-pause").disabled=data.state==="ready"||data.state==="over";
 const overlay=$("new-game-overlay");
 if(data.state==="playing"){overlay.hidden=true;$("new-game-pause").textContent="PAUSE"}
 else{overlay.hidden=false;$("new-game-pause").textContent=data.state==="paused"?"RESUME":"PAUSE";$("new-overlay-kicker").textContent=data.state==="ready"?"LANTERN ROOM ARCADE":data.state==="paused"?"ROUND ON HOLD":"ROUND COMPLETE";$("new-overlay-title").textContent=data.state==="ready"?"Your cabinet is ready.":data.state==="paused"?"Take a breath.":"The lights are yours.";$("new-overlay-copy").textContent=data.state==="ready"?"The controls are ready. Start whenever you are.":data.state==="paused"?"The game is waiting right where you left it.":`You scored ${data.score}. Personal best: ${data.best}. Want another round?`;$("new-game-start").textContent=data.state==="ready"?"START PLAYING  →":data.state==="paused"?"RESUME ROUND  →":"PLAY AGAIN  →"}
}
async function openGame(name,scroll=true){
 if(!descriptions[name])return;const serial=++routeSerial,previous=current;current=name;lastFrame=0;startLoop();stopAttract();if(newGame&&previous!==name){newGame.dispose();newGame=null}
 $("game-library").hidden=true;$("arcade-home").hidden=true;$("play-room").hidden=false;
 $("room-title").textContent=descriptions[name].title;$("room-kicker").textContent=descriptions[name].kicker;
 $("snake-panel").hidden=name!=="snake";$("fire-panel").hidden=name!=="fire";$("chess-panel").hidden=name!=="chess";$("new-game-panel").hidden=!descriptions[name].load;
 if(name!=="snake")snake.setActive(false);if(name!=="fire")fire.setActive(false);if(name!=="chess")chess?.setActive(false);if(!descriptions[name].load&&newGame){newGame.dispose();newGame=null;}
 if(name==="snake")snake.setActive(!document.hidden);if(name==="fire")fire.setActive(!document.hidden);
 if(name==="chess"&&!chess){$("chess-status").textContent="Setting the board…";try{const mod=await import("./chess.js");if(serial!==routeSerial)return;chess=new mod.ChessGame(audio)}catch(err){$("chess-status").textContent="The board could not load";$("chess-substatus").textContent="Check local assets and reload the page.";console.error(err);return}}
 if(name==="chess")chess?.setActive(!document.hidden);
 if(descriptions[name].load){
   if(newGame){newGame.dispose();newGame=null}
   $("new-game-kicker").textContent=descriptions[name].kicker;$("new-game-description").textContent=descriptions[name].description;$("new-game-controls").textContent=descriptions[name].controls;$("arcade-touch-pad").classList.toggle("action-enabled",["block-circuit","starline-siege","void-drifter","prism-breaker"].includes(name));$("arcade-touch-pad").classList.toggle("hold-enabled",name==="block-circuit");$("new-game-canvas").setAttribute("aria-label",descriptions[name].title+" game board");
   try{const Game=await descriptions[name].load();if(serial!==routeSerial)return;newGame=new Game($("new-game-canvas"),audio,updateNewGameHud);newGame.render()}catch(err){$("new-overlay-title").textContent="This cabinet could not load.";$("new-overlay-copy").textContent="Please return to the library and try again.";console.error(err);return}
 }
 if(location.hash!=="#"+name)history.replaceState(null,"","#"+name);
 if(scroll)requestAnimationFrame(()=>$("play-room").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"}));
}
function backToLibrary(){routeSerial++;current=null;if(raf){cancelAnimationFrame(raf);raf=0}setAttract(attractEnabled);snake.setActive(false);fire.setActive(false);chess?.setActive(false);if(newGame){newGame.dispose();newGame=null}
 $("play-room").hidden=true;$("game-library").hidden=false;$("arcade-home").hidden=false;history.replaceState(null,"",location.pathname);$("arcade-home").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"})}
document.querySelectorAll("[data-open-game]").forEach(b=>b.addEventListener("click",()=>openGame(b.dataset.openGame)));
$("back-to-library").addEventListener("click",backToLibrary);
document.querySelectorAll("[data-arcade-key]").forEach(b=>{
 let key=b.dataset.arcadeKey;const fire=e=>{e.preventDefault();document.dispatchEvent(new KeyboardEvent("keydown",{key,bubbles:true}));};const release=()=>document.dispatchEvent(new KeyboardEvent("keyup",{key,bubbles:true}));b.addEventListener("pointerdown",fire);b.addEventListener("pointerup",release);b.addEventListener("pointercancel",release);b.addEventListener("pointerleave",release)
});
$("new-game-start").addEventListener("click",()=>newGame?.start());$("new-game-pause").addEventListener("click",()=>newGame?.pause());$("new-game-restart").addEventListener("click",()=>newGame?.restart());
window.addEventListener("hashchange",()=>{const target=location.hash.slice(1);if(descriptions[target])openGame(target,false);else if(current)backToLibrary()});
const initial=location.hash.slice(1);if(descriptions[initial])openGame(initial,false);
function frame(now){raf=0;if(!current||document.hidden)return;const dt=Math.min(.05,(now-(lastFrame||now))/1000);lastFrame=now;if(current==="snake"){snake.update(dt);snake.render(snake.interval?snake.accumulator/snake.interval:1)}else if(current==="fire"){fire.update(dt);fire.render()}else if(current==="chess")chess?.update(dt);else if(descriptions[current]?.load&&newGame){newGame.update(dt);newGame.render()}startLoop()}
function startLoop(){if(current&&!document.hidden&&!raf)raf=requestAnimationFrame(frame)}
if(new URLSearchParams(location.search).get("test")==="1")Object.defineProperty(window,"__sideRoomTest",{value:{snake,fire,get chess(){return chess},get newGame(){return newGame},openGame},configurable:false});
document.addEventListener("visibilitychange",()=>{lastFrame=0;snake.setActive(current==="snake"&&!document.hidden);fire.setActive(current==="fire"&&!document.hidden);chess?.setActive(current==="chess"&&!document.hidden);if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0}else startLoop()});
window.addEventListener("pagehide",()=>{stopAttract();cancelAnimationFrame(raf);snake.destroy();fire.destroy();chess?.destroy();newGame?.dispose();audio.destroy()});
