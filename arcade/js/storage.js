const PREFIX="side-room-v2:";
function read(key,fallback){try{const value=localStorage.getItem(PREFIX+key);return value===null?fallback:JSON.parse(value)}catch{return fallback}}
function write(key,value){try{localStorage.setItem(PREFIX+key,JSON.stringify(value))}catch{/* Private browsing can disable storage. */}}
export const storage={
  getBest(game){return Math.max(0,Number(read("best:"+game,0))||0)},
  setBest(game,value){write("best:"+game,Math.max(0,Math.floor(value)))},
  getAudio(){return {...{effects:true,music:false,volume:.34},...read("audio",{})}},
  setAudio(value){write("audio",value)}
};
