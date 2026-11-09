import {chromium} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const base=process.env.ARCADE_URL||"http://127.0.0.1:4173/";
const viewports=[
  {name:"1920x1080",width:1920,height:1080},
  {name:"1440x900",width:1440,height:900},
  {name:"1366x768",width:1366,height:768},
  {name:"768x1024",width:768,height:1024},
  {name:"390x844",width:390,height:844},
  {name:"360x800",width:360,height:800}
];
await fs.mkdir("artifacts",{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH,args:["--no-sandbox"]}:{})});
const browserErrors=[];
async function openGame(page,name){
  await page.locator(`[data-open-game="${name}"]`).click();
  await page.locator(name==="lantern-maze"||name==="block-circuit"||name==="starline-siege"||name==="void-drifter"||name==="prism-breaker"?"#new-game-panel":`#${name}-panel`).waitFor({state:"visible",timeout:20000});
  if(name==="chess")await page.locator("#chess-board .chess-square").nth(63).waitFor();
  await page.waitForTimeout(180);
}
try{
  for(const viewport of viewports){
    const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
    page.on("pageerror",error=>browserErrors.push(viewport.name+": "+error.message));
    page.on("console",msg=>{if(msg.type()==="error")browserErrors.push(viewport.name+": "+msg.text())});
    page.on("requestfailed",request=>browserErrors.push(viewport.name+" request: "+request.url()+" "+request.failure()?.errorText));
    page.on("response",response=>{if(response.status()>=400)browserErrors.push(viewport.name+" HTTP "+response.status()+": "+response.url())});
    await page.goto(base+"?test=1",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>!!window.__sideRoomTest,{timeout:15000});
    await page.waitForTimeout(220);
    const home=await page.evaluate(()=>({
      width:document.documentElement.scrollWidth,
      viewport:window.innerWidth,
      cards:document.querySelectorAll("[data-open-game]").length,
      images:[...document.querySelectorAll(".game-card img")].every(img=>img.complete&&img.naturalWidth>0)
    }));
    assert.equal(home.cards,8,viewport.name+" should show all eight game cards");
    assert.equal(home.images,true,viewport.name+" game-card art should load");
    if(viewport.name==="1440x900"){
      await page.addScriptTag({path:"node_modules/axe-core/axe.min.js"});
      const audit=await page.evaluate(()=>axe.run(document));
      await fs.writeFile("artifacts/axe-home.json",JSON.stringify(audit.violations,null,2));
      const critical=audit.violations.filter(v=>v.impact==="critical");
      assert.equal(critical.length,0,"Critical accessibility findings: "+critical.map(v=>v.id).join(", "));
    }
    assert.ok(home.width<=home.viewport+2,viewport.name+" home must not overflow horizontally");
    await page.screenshot({path:`artifacts/${viewport.name}-home.png`,fullPage:true});
    if(viewport.name==="1440x900"){
      await page.locator("#attract-toggle").click();
      const before=await page.locator(".game-card.attract-active").getAttribute("data-open-game");
      await page.waitForTimeout(2900);
      const after=await page.locator(".game-card.attract-active").getAttribute("data-open-game");
      assert.notEqual(after,before,"Attract mode cycles its highlighted cabinet");
      await page.screenshot({path:"artifacts/attract-mode.png",fullPage:true});
      await page.locator("#attract-toggle").click();
    }
    for(const game of ["snake","fire","chess","lantern-maze","block-circuit","starline-siege","void-drifter","prism-breaker"]){
      await openGame(page,game);
      const state=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:window.innerWidth}));
      assert.ok(state.width<=state.viewport+2,viewport.name+" "+game+" must not overflow horizontally");
      await page.screenshot({path:`artifacts/${viewport.name}-${game}.png`,fullPage:true});
      if(game==="snake"&&viewport.width<=850){
        const display=await page.locator("#snake-pad").evaluate(el=>getComputedStyle(el).display);
        assert.notEqual(display,"none",viewport.name+" should show Snake touch pad");
        await page.locator('[data-snake-dir="up"]').dispatchEvent("pointerdown");
        assert.deepEqual(await page.evaluate(()=>window.__sideRoomTest.snake.queue.at(-1)),{x:0,y:-1},"Mobile Snake pad should change direction");
      }
      if((viewport.name==="1920x1080"||viewport.name==="390x844")&&(game==="snake"||game==="fire")){
        await page.locator(game==="snake"?"#snake-start":"#fire-start").click();
        await page.waitForTimeout(350);
        await page.screenshot({path:`artifacts/${viewport.name}-${game}-playing.png`,fullPage:true});
        if(viewport.name==="1920x1080"&&game==="snake"){await page.locator("#snake-pause").click();await page.screenshot({path:"artifacts/snake-paused.png",fullPage:true});await page.locator("#snake-start").click();await page.evaluate(()=>window.__sideRoomTest.snake.finish());await page.screenshot({path:"artifacts/snake-over.png",fullPage:true});await page.locator("#snake-start").click()}
        if(viewport.name==="1920x1080"&&game==="fire"){await page.locator("#fire-pause").click();await page.screenshot({path:"artifacts/fire-paused.png",fullPage:true});await page.locator("#fire-pause").click();await page.evaluate(()=>{const g=window.__sideRoomTest.fire;g.loseLife(600,580);g.loseLife(600,580);g.loseLife(600,580)});await page.screenshot({path:"artifacts/fire-over.png",fullPage:true})}
      }
      if((viewport.name==="1920x1080"||viewport.name==="390x844")&&["lantern-maze","block-circuit","starline-siege","void-drifter","prism-breaker"].includes(game)){
        await page.locator("#new-game-start").click();
        await page.waitForTimeout(180);
        assert.equal(await page.evaluate(()=>window.__sideRoomTest.newGame.state),"playing",game+" starts");
        if(viewport.name==="1920x1080"&&game==="block-circuit"){
          await page.locator("#new-game-panel [data-fullscreen]").click();
          await page.waitForFunction(()=>!!document.fullscreenElement,{timeout:5000});
          await page.locator("#new-game-panel [data-fullscreen]").click();
          await page.waitForFunction(()=>!document.fullscreenElement,{timeout:5000});
        }
        if(game==="lantern-maze"){await page.keyboard.press("ArrowRight");await page.waitForTimeout(180);assert.ok(await page.evaluate(()=>window.__sideRoomTest.newGame.player.x>=2),"Maze accepts a direction key")}
        if(game==="block-circuit"){const y=await page.evaluate(()=>window.__sideRoomTest.newGame.current.y);await page.keyboard.press("ArrowDown");assert.ok(await page.evaluate(y=>window.__sideRoomTest.newGame.current.y>=y, y),"Blocks accept soft drop")}
        if(game==="starline-siege"){const box=await page.locator("#new-game-canvas").boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);assert.ok(await page.evaluate(()=>window.__sideRoomTest.newGame.bullets.length>0),"Shooter fires from an input action")}
        if(game==="void-drifter"){await page.keyboard.down("ArrowUp");await page.waitForTimeout(100);await page.keyboard.up("ArrowUp");assert.ok(await page.evaluate(()=>Math.hypot(window.__sideRoomTest.newGame.ship.vx,window.__sideRoomTest.newGame.ship.vy)>0),"Drifter thrust responds");await page.keyboard.press(" ")}
        if(game==="prism-breaker"){const box=await page.locator("#new-game-canvas").boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height-30);assert.equal(await page.evaluate(()=>window.__sideRoomTest.newGame.ball.stuck),false,"Prism serves on tap")}
        await page.screenshot({path:`artifacts/${viewport.name}-${game}-playing.png`,fullPage:true});
        await page.locator("#new-game-pause").click();
        assert.equal(await page.evaluate(()=>window.__sideRoomTest.newGame.state),"paused",game+" pauses");
        if(viewport.name==="1920x1080")await page.screenshot({path:`artifacts/${game}-paused.png`,fullPage:true});
        await page.locator("#new-game-pause").click();
        assert.equal(await page.evaluate(()=>window.__sideRoomTest.newGame.state),"playing",game+" resumes");
        if(viewport.name==="1920x1080"){await page.evaluate(()=>window.__sideRoomTest.newGame.end());await page.screenshot({path:`artifacts/${game}-over.png`,fullPage:true});await page.locator("#new-game-start").click()}
        await page.locator("#new-game-restart").click();
        assert.equal(await page.evaluate(()=>window.__sideRoomTest.newGame.state),"playing",game+" restarts");
      }
      await page.locator("#back-to-library").click();
    }
    await page.close();
  }

  // Deterministic gameplay checks use the test-only hook; it is absent from normal visitors.
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on("pageerror",error=>browserErrors.push("gameplay: "+error.message));
  page.on("console",msg=>{if(msg.type()==="error")browserErrors.push("gameplay: "+msg.text())});
  page.on("requestfailed",request=>browserErrors.push("gameplay request: "+request.url()+" "+request.failure()?.errorText));
  page.on("response",response=>{if(response.status()>=400)browserErrors.push("gameplay HTTP "+response.status()+": "+response.url())});
  await page.goto(base+"?test=1#snake",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>!!window.__sideRoomTest);
  await page.locator("#snake-start").click(); // Unlock Web Audio with a real user gesture.
  const snakeChecks=await page.evaluate(()=>{
    const g=window.__sideRoomTest.snake;
    g.reset();g.start();g.food={x:g.body[0].x+1,y:g.body[0].y};g.update(.16);
    const ate={score:g.score,length:g.body.length};
    g.reset();g.state="playing";g.body=[{x:2,y:2},{x:2,y:3},{x:3,y:3},{x:3,y:2}];g.previous=g.body.map(p=>({...p}));g.direction={x:1,y:0};g.queue=[];g.food={x:0,y:0};g.update(.16);
    const tailMove={state:g.state,head:g.body[0]};
    g.reset();g.state="playing";g.body=[{x:0,y:2},{x:1,y:2},{x:2,y:2}];g.previous=g.body.map(p=>({...p}));g.direction={x:-1,y:0};g.queue=[];g.food={x:20,y:14};g.update(.16);
    const wall={state:g.state};
    g.reset();g.turn(-1,0);const reverseBlocked=g.queue.length===0;
    return {ate,tailMove,wall,reverseBlocked};
  });
  assert.deepEqual(snakeChecks.ate,{score:10,length:4},"Snake should score and grow when eating");
  assert.equal(snakeChecks.tailMove.state,"playing","Snake may enter the tail square as it vacates");
  assert.deepEqual(snakeChecks.tailMove.head,{x:3,y:2});
  assert.equal(snakeChecks.wall.state,"over","Wall collision should end the round");
  assert.equal(snakeChecks.reverseBlocked,true,"Immediate reverse direction should be rejected");

  await page.locator("#back-to-library").click();
  await openGame(page,"fire");
  await page.locator("#fire-start").click(); // Unlock Web Audio with a real user gesture.
  const fireChecks=await page.evaluate(()=>{
    const g=window.__sideRoomTest.fire;
    const target=()=>({x:600,y:500,vx:0,vy:0,size:22,health:1,maxHealth:1,phase:0,age:0,smokeClock:0,seed:0});
    const shot=()=>({x:600,y:500,vx:0,vy:0,life:.5,trail:[]});
    g.reset();g.start();g.fires=[target()];g.shots=[shot()];g.update(.02);
    const hit={score:g.score,remaining:g.fires.length};
    g.reset();g.start();g.stageWins=6;g.stageQuota=7;g.fires=[target()];g.shots=[shot()];g.update(.02);
    const stage={stage:g.stage,quota:g.stageQuota};
    g.reset();g.start();g.fires=[{...target(),y:596}];g.update(.02);
    const damage={lives:g.lives};
    return {hit,stage,damage};
  });
  assert.deepEqual(fireChecks.hit,{score:100,remaining:0},"Water projectile should extinguish a fire");
  assert.equal(fireChecks.stage.stage,2,"Completing a quota should advance the stage");
  assert.equal(fireChecks.damage.lives,2,"A fire reaching the village should cost one life");
  const fireBox=await page.locator("#fire-canvas").boundingBox();
  await page.mouse.move(fireBox.x+35,fireBox.y+35);
  await page.mouse.click(fireBox.x+35,fireBox.y+35);
  const aimedShot=await page.evaluate(()=>window.__sideRoomTest.fire.shots.at(-1));
  assert.ok(aimedShot.vx<0&&aimedShot.vy<0,"Fire Watch pointer should aim the cannon toward the pointer");
  await page.locator("#sound-toggle").click();
  assert.equal(await page.locator("#sound-toggle").getAttribute("aria-pressed"),"false","Sound toggle should mute effects");
  assert.ok(await page.evaluate(()=>localStorage.getItem("side-room-v2:audio")!==null),"Audio preferences should persist locally");
  await page.locator("#music-toggle").click();
  assert.equal(await page.locator("#music-toggle").getAttribute("aria-pressed"),"true","Music toggle should enable ambient sound after a gesture");
  await page.locator("#music-volume").evaluate(el=>{el.value="0.1";el.dispatchEvent(new Event("input",{bubbles:true}))});
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("side-room-v2:audio")).musicVolume),.1,"Music volume is independently saved");
  await page.locator("#music-toggle").click();

  await page.goto(base+"?test=1#chess",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.__sideRoomTest?.chess?.chess,{timeout:20000});
  await page.waitForSelector("#chess-board .chess-square");
  await page.locator('#chess-board [data-square="e2"]').click();
  await page.locator('#chess-board [data-square="e4"]').click();
  assert.ok(await page.locator("#chess-moves").innerText().then(t=>t.includes("e4")),"Chess board should accept e2-e4");
  await page.locator("#chess-undo").click();
  assert.ok(await page.evaluate(()=>window.__sideRoomTest.chess.chess.get("e4")===undefined),"Undo should restore the previous board position");

  const chessChecks=await page.evaluate(()=>{
    const g=window.__sideRoomTest.chess,c=g.chess,results={};
    c.reset();results.openingE4=c.moves({square:"e2"}).includes("e4");
    try{c.move({from:"e2",to:"e5"});results.illegalRejected=false}catch{results.illegalRejected=true}
    c.load("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1");
    results.castling=c.moves({square:"e1",verbose:true}).filter(m=>m.san==="O-O"||m.san==="O-O-O").map(m=>m.san).sort();
    c.reset();["e4","a6","e5","d5"].forEach(m=>c.move(m));
    results.enPassant=c.moves({square:"e5",verbose:true}).some(m=>m.to==="d6"&&m.flags.includes("e"));
    c.load("7k/P7/8/8/8/8/8/7K w - - 0 1");
    results.promotions=c.moves({square:"a7",verbose:true}).filter(m=>m.promotion).map(m=>m.promotion).sort();
    c.move({from:"a7",to:"a8",promotion:"n"});results.underpromotion=c.get("a8")?.type==="n";
    c.load("7k/6Q1/5K2/8/8/8/8/8 b - - 0 1");results.checkmate=c.isCheckmate();
    c.load("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");results.stalemate=c.isStalemate();
    c.reset();["Nf3","Nf6","Ng1","Ng8","Nf3","Nf6","Ng1","Ng8"].forEach(m=>c.move(m));
    results.threefold=c.isThreefoldRepetition();
    c.load("4k2r/8/8/8/8/8/8/R3K2R w KQk - 100 51");results.fiftyMove=c.isDrawByFiftyMoves();
    return results;
  });
  assert.equal(chessChecks.openingE4,true);
  assert.equal(chessChecks.illegalRejected,true);
  assert.deepEqual(chessChecks.castling,["O-O","O-O-O"]);
  assert.equal(chessChecks.enPassant,true);
  assert.deepEqual(chessChecks.promotions,["b","n","q","r"]);
  assert.equal(chessChecks.underpromotion,true);
  assert.equal(chessChecks.checkmate,true);
  assert.equal(chessChecks.stalemate,true);
  assert.equal(chessChecks.threefold,true);
  assert.equal(chessChecks.fiftyMove,true);

  await page.evaluate(()=>{
    const g=window.__sideRoomTest.chess;
    g.chess.load("7k/P7/8/8/8/8/8/7K w - - 0 1");g.render();
  });
  await page.locator('#chess-board [data-square="a7"]').click();
  await page.locator('#chess-board [data-square="a8"]').click();
  await page.locator("#promotion-backdrop").waitFor({state:"visible"});
  await page.locator('#promotion-choices [aria-label="Promote to knight"]').click();
  assert.equal(await page.evaluate(()=>window.__sideRoomTest.chess.chess.get("a8")?.type),"n","Promotion chooser should select the requested piece");
  await page.locator("#chess-flip").click();
  assert.equal(await page.locator("#chess-board .chess-square").count(),64,"Flipping should retain all 64 squares");
  await page.locator("#chess-new").click();
  await page.locator("#chess-mode").selectOption("computer");
  await page.locator("#chess-new").click();
  await page.locator('#chess-board [data-square="e2"]').click();await page.locator('#chess-board [data-square="e4"]').click();
  await page.locator("#chess-pause").click();
  assert.equal(await page.evaluate(()=>window.__sideRoomTest.chess.paused),true,"Chess pause stops engine thinking and the clock");
  await page.screenshot({path:"artifacts/chess-paused.png",fullPage:true});
  await page.waitForTimeout(120);
  assert.equal(await page.evaluate(()=>window.__sideRoomTest.chess.chess.history().length),1,"No computer move is committed while paused");
  await page.locator("#chess-pause").click();
  await page.waitForFunction(()=>window.__sideRoomTest.chess.chess.history().length===2&&!window.__sideRoomTest.chess.computerThinking,{timeout:30000});
  for(const difficulty of ["beginner","casual","skilled","expert"]){
    await page.locator("#chess-difficulty").selectOption(difficulty);
    await page.locator("#chess-new").click();
    await page.locator('#chess-board [data-square="e2"]').click();
    await page.locator('#chess-board [data-square="e4"]').click();
    await page.waitForFunction(()=>window.__sideRoomTest.chess.chess.history().length===2&&!window.__sideRoomTest.chess.computerThinking,{timeout:30000});
    const returned=await page.evaluate(()=>window.__sideRoomTest.chess.chess.history({verbose:true}).at(-1));
    assert.ok(returned&&returned.from&&returned.to,difficulty+" engine must return a legal chess move");
    await page.screenshot({path:`artifacts/chess-computer-${difficulty}.png`,fullPage:true});
  }
  await page.locator("#chess-color").selectOption("b");
  await page.locator('#chess-board [data-square="e2"]').click();await page.locator('#chess-board [data-square="e4"]').click();
  assert.equal(await page.evaluate(()=>window.__sideRoomTest.chess.chess.history().length),0,"Player input is locked during the computer turn");
  await page.waitForFunction(()=>window.__sideRoomTest.chess.chess.history().length===1&&!window.__sideRoomTest.chess.computerThinking,{timeout:30000});
  assert.equal(await page.evaluate(()=>window.__sideRoomTest.chess.chess.turn()),"b","Computer should open when the player chooses Black");
  await page.locator("#chess-color").selectOption("w");
  assert.equal(await page.evaluate(()=>window.__sideRoomTest.chess.chess.history().length),0,"Changing side resets the board");
  await page.locator("#chess-color").selectOption("b");
  assert.equal(await page.evaluate(()=>window.__sideRoomTest.chess.computerThinking),true,"Changing to Black begins an engine search");
  await page.locator("#chess-new").click();
  assert.equal(await page.evaluate(()=>window.__sideRoomTest.chess.chess.history().length),0,"New game clears the position while an old search is active");
  await page.waitForFunction(()=>window.__sideRoomTest.chess.chess.history().length===1&&!window.__sideRoomTest.chess.computerThinking,{timeout:30000});
  assert.equal(await page.evaluate(()=>window.__sideRoomTest.chess.chess.turn()),"b","A fresh legal opening reply arrives after reset");
  await page.locator("#chess-color").selectOption("w");
  assert.equal(await page.evaluate(()=>window.__sideRoomTest.chess.chess.history().length),0,"Changing side during play resets the board");
  assert.equal(await page.evaluate(()=>window.__sideRoomTest.chess.computerThinking),false,"Changing to White releases the engine worker");
  await page.locator('#chess-board [data-square="e2"]').click();await page.locator('#chess-board [data-square="e4"]').click();
  await page.waitForFunction(()=>window.__sideRoomTest.chess.chess.history().length===2&&!window.__sideRoomTest.chess.computerThinking,{timeout:30000});
  await page.locator("#chess-undo").click();
  assert.equal(await page.evaluate(()=>window.__sideRoomTest.chess.chess.history().length),0,"Undo restores the player position after a computer reply");
  await page.evaluate(()=>{const g=window.__sideRoomTest.chess;g.chess.load("7k/6Q1/5K2/8/8/8/8/8 b - - 0 1");g.render()});
  assert.match(await page.locator("#chess-status").innerText(),/Checkmate/);
  await page.screenshot({path:"artifacts/chess-over.png",fullPage:true});
  assert.ok(browserErrors.length===0,"Browser errors: "+browserErrors.join(" | "));
  await page.screenshot({path:"artifacts/chess-rules-final.png",fullPage:true});
  await page.close();
  console.log("PASS: six viewport layouts, eight games, lifecycle/input checks, Snake and Fire Watch regression, Chess rules and four Stockfish difficulty profiles.");
}finally{await browser.close()}
