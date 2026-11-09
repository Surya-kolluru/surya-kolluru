import {AudioSystem} from "./audio.js";
import {SnakeGame} from "./snake.js";
import {FireWatchGame} from "./fire-watch.js";

const $=id=>document.getElementById(id);
const audio=new AudioSystem();
const snake=new SnakeGame($("snake-canvas"),audio);
const fire=new FireWatchGame($("fire-canvas"),audio);
snake.setActive(false);fire.setActive(false);
let chess=null,current=null,lastFrame=0,raf=0;
const descriptions={
  snake:{title:"Snake",kicker:"01 / ARCADE CLASSIC"},
  fire:{title:"Fire Watch",kicker:"02 / FOREST DEFENCE"},
  chess:{title:"Chess",kicker:"03 / THE CLASSIC"}
};
function setAudioControls(){
  const prefs=audio.state();
  $("sound-toggle").setAttribute("aria-pressed",String(prefs.effects));
  $("music-toggle").setAttribute("aria-pressed",String(prefs.music));
  $("master-volume").value=prefs.volume;
  $("effects-volume").value=prefs.effectsVolume;
}
$("sound-toggle").addEventListener("click",()=>{audio.unlock();audio.setEffects(!audio.state().effects);setAudioControls()});
$("music-toggle").addEventListener("click",()=>{audio.unlock();audio.setMusic(!audio.state().music);setAudioControls()});
$("master-volume").addEventListener("input",e=>audio.setVolume(e.target.value));
$("effects-volume").addEventListener("input",e=>audio.setEffectsVolume(e.target.value));
setAudioControls();

async function openGame(name,scroll=true){
  if(!descriptions[name])return;
  if(name==="chess"&&!chess){
    $("room-title").textContent="Chess";
    $("room-kicker").textContent="03 / THE CLASSIC";
    $("play-room").hidden=false;
    $("game-library").hidden=true;
    $("chess-panel").hidden=false;
    $("chess-status").textContent="Setting the board…";
    try{const mod=await import("./chess.js");chess=new mod.ChessGame(audio)}
    catch(err){$("chess-status").textContent="The board could not load";$("chess-substatus").textContent="Check your connection and reload the page.";console.error(err);return}
  }
  current=name;
  $("game-library").hidden=true;
  $("play-room").hidden=false;
  $("room-title").textContent=descriptions[name].title;
  $("room-kicker").textContent=descriptions[name].kicker;
  $("snake-panel").hidden=name!=="snake";
  $("fire-panel").hidden=name!=="fire";
  $("chess-panel").hidden=name!=="chess";
  snake.setActive(name==="snake"&&!document.hidden);
  fire.setActive(name==="fire"&&!document.hidden);
  chess?.setActive(name==="chess"&&!document.hidden);
  if(location.hash!=="#"+name)history.replaceState(null,"","#"+name);
  if(scroll)requestAnimationFrame(()=>$("play-room").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"}));
}
function backToLibrary(){
  current=null;snake.setActive(false);fire.setActive(false);chess?.setActive(false);
  $("play-room").hidden=true;$("game-library").hidden=false;history.replaceState(null,"",location.pathname);
  $("arcade-home").scrollIntoView({behavior:"smooth",block:"start"});
}
document.querySelectorAll("[data-open-game]").forEach(button=>button.addEventListener("click",()=>openGame(button.dataset.openGame)));
$("back-to-library").addEventListener("click",backToLibrary);
window.addEventListener("hashchange",()=>{
  const target=location.hash.slice(1);
  if(descriptions[target])openGame(target,false);else if(current)backToLibrary();
});
const initial=location.hash.slice(1);
if(descriptions[initial])openGame(initial,false);

function frame(now){
  const dt=Math.min(.05,(now-(lastFrame||now))/1000);lastFrame=now;
  if(!document.hidden){
    if(current==="snake"){snake.update(dt);snake.render(snake.interval?snake.accumulator/snake.interval:1)}
    else if(current==="fire"){fire.update(dt);fire.render()}
    else if(current==="chess")chess?.update(dt);
  }
  raf=requestAnimationFrame(frame);
}
raf=requestAnimationFrame(frame);
document.addEventListener("visibilitychange",()=>{
  lastFrame=0;
  snake.setActive(current==="snake"&&!document.hidden);
  fire.setActive(current==="fire"&&!document.hidden);
  chess?.setActive(current==="chess"&&!document.hidden);
});
window.addEventListener("pagehide",()=>{
  cancelAnimationFrame(raf);snake.destroy();fire.destroy();chess?.destroy();audio.destroy();
});
