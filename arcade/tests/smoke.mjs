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
const browser=await chromium.launch({headless:true});
const browserErrors=[];
async function openGame(page,name){
  await page.locator(`[data-open-game="${name}"]`).click();
  await page.locator(`#${name}-panel`).waitFor({state:"visible",timeout:15000});
  if(name==="chess")await page.locator("#chess-board .chess-square").nth(63).waitFor();
  await page.waitForTimeout(180);
}
try{
  for(const viewport of viewports){
    const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
    page.on("pageerror",error=>browserErrors.push(viewport.name+": "+error.message));
    page.on("console",msg=>{if(msg.type()==="error")browserErrors.push(viewport.name+": "+msg.text())});
    await page.goto(base+"?test=1",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>!!window.__sideRoomTest,{timeout:15000});
    await page.waitForTimeout(220);
    const home=await page.evaluate(()=>({
      width:document.documentElement.scrollWidth,
      viewport:window.innerWidth,
      cards:document.querySelectorAll("[data-open-game]").length,
      images:[...document.querySelectorAll(".game-card img")].every(img=>img.complete&&img.naturalWidth>0)
    }));
    assert.equal(home.cards,3,viewport.name+" should show all three game cards");
    assert.equal(home.images,true,viewport.name+" game-card art should load");
    assert.ok(home.width<=home.viewport+2,viewport.name+" home must not overflow horizontally");
    await page.screenshot({path:`artifacts/${viewport.name}-home.png`,fullPage:true});
    for(const game of ["snake","fire","chess"]){
      await openGame(page,game);
      const state=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:window.innerWidth}));
      assert.ok(state.width<=state.viewport+2,viewport.name+" "+game+" must not overflow horizontally");
      await page.screenshot({path:`artifacts/${viewport.name}-${game}.png`,fullPage:true});
      if(game==="snake"&&viewport.width<=850){
        const display=await page.locator("#snake-pad").evaluate(el=>getComputedStyle(el).display);
        assert.notEqual(display,"none",viewport.name+" should show Snake touch pad");
      }
      await page.locator("#back-to-library").click();
    }
    await page.close();
  }

  // Deterministic gameplay checks use the test-only hook; it is absent from normal visitors.
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on("pageerror",error=>browserErrors.push("gameplay: "+error.message));
  page.on("console",msg=>{if(msg.type()==="error")browserErrors.push("gameplay: "+msg.text())});
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
    c.load("k7/8/8/8/8/8/8/R3K2R w KQ - 0 1");
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
  assert.ok(browserErrors.length===0,"Browser errors: "+browserErrors.join(" | "));
  await page.screenshot({path:"artifacts/chess-rules-final.png",fullPage:true});
  await page.close();
  console.log("PASS: six viewport layouts, screenshots for all three games, Snake edge cases, Fire Watch progression/damage, Chess rules and promotion.");
}finally{await browser.close()}
