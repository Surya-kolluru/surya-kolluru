import {Chess} from "./chess-rules.js";
import {storage} from "./storage.js";

const PIECES={p:"pawn",n:"knight",b:"bishop",r:"rook",q:"queen",k:"king"};
const GLYPH={p:"P",n:"N",b:"B",r:"R",q:"Q",k:"K"};
const START_MS=10*60*1000;
const fmt=t=>{const v=Math.max(0,Math.ceil(t/1000));return Math.floor(v/60)+":"+String(v%60).padStart(2,"0")};

export class ChessGame{
  constructor(audio){
    this.audio=audio;this.chess=new Chess();this.selected=null;this.flipped=false;this.lastMove=null;
    this.finished="";this.claimed="";this.pendingPromotion=null;this.active=true;this.clockStarted=false;
    this.mode="local";this.playerColor="w";this.difficulty="beginner";this.computerThinking=false;this.engineWorker=null;this.paused=false;
    this.remaining={w:START_MS,b:START_MS};this.clockSnapshots=[];this.dragFrom=null;
    this.pieceUrl=new URL("../assets/chess/staunton.svg",import.meta.url).href;
    this.boardEl=this.$("chess-board");this.bind();this.render();
  }
  $(id){return document.getElementById(id)}
  bind(){
    this.$("chess-new").addEventListener("click",()=>this.reset());
    this.$("chess-pause").addEventListener("click",()=>this.togglePause());
    this.$("chess-undo").addEventListener("click",()=>this.undo());
    this.$("chess-mode").addEventListener("change",e=>{this.mode=e.target.value;this.syncComputerOptions();this.reset()});
    this.$("chess-color").addEventListener("change",e=>{this.playerColor=e.target.value;this.reset()});
    this.$("chess-difficulty").addEventListener("change",e=>{this.difficulty=e.target.value;this.reset()});
    this.$("chess-flip").addEventListener("click",()=>{this.flipped=!this.flipped;this.render()});
    this.$("chess-copy-pgn").addEventListener("click",()=>this.copyPGN());
    this.$("chess-draw-claim").addEventListener("click",()=>this.claimDraw());
    this.$("promotion-cancel").addEventListener("click",()=>this.cancelPromotion());
    this.$("promotion-backdrop").addEventListener("pointerdown",e=>{if(e.target.id==="promotion-backdrop")this.cancelPromotion()});
  }
  syncComputerOptions(){
    this.$("chess-color-wrap").hidden=this.mode!=="computer";
    this.$("chess-difficulty-wrap").hidden=this.mode!=="computer";
    this.$("chess-help").innerHTML=this.mode==="computer"?"PLAY COMPUTER · ON THIS DEVICE<br>Choose your side and strength. Your personal bests stay local.":"LOCAL TWO-PLAYER CHESS<br>Standard rules · 10-minute clock";
  }
  cancelEngine(){if(this.engineWorker){this.engineWorker.terminate();this.engineWorker=null}this.computerThinking=false}
  reset(){
    this.cancelEngine();this.chess=new Chess();this.selected=null;this.lastMove=null;this.finished="";this.claimed="";
    this.pendingPromotion=null;this.clockStarted=false;this.paused=false;this.$("chess-pause").textContent="PAUSE";this.$("chess-pause").setAttribute("aria-pressed","false");this.remaining={w:START_MS,b:START_MS};this.clockSnapshots=[];
    this.$("promotion-backdrop").hidden=true;this.$("chess-status").textContent="White to move";
    this.$("chess-substatus").textContent="Select a piece to see its legal moves.";
    this.$("chess-undo").disabled=true;this.syncComputerOptions();this.render();this.audio.play("chess-move");
    this.maybeComputer();
  }
  togglePause(){
    this.paused=!this.paused;
    this.$("chess-pause").textContent=this.paused?"RESUME":"PAUSE";
    this.$("chess-pause").setAttribute("aria-pressed",String(this.paused));
    if(this.paused){this.cancelEngine();this.status("Game paused","The board and clock are holding their place.")}
    else this.maybeComputer();
    this.render();
  }
  isHumanTurn(){return this.mode!=="computer"||this.chess.turn()===this.playerColor}
  maybeComputer(){
    if(this.mode!=="computer"||this.isHumanTurn()||this.terminal()||!this.active||this.paused||this.computerThinking)return;
    this.computerThinking=true;this.status("Computer is thinking…",this.difficulty[0].toUpperCase()+this.difficulty.slice(1)+" strength · You can reset or leave at any time.");
    const limits={beginner:{skill:0,depth:6},casual:{skill:4,depth:10},skilled:{skill:12,depth:14},expert:{skill:20,depth:17}}[this.difficulty];
    let worker;
    try{worker=new Worker(new URL("../assets/stockfish.wasm.js",import.meta.url));this.engineWorker=worker}
    catch(error){this.computerThinking=false;this.status("Computer unavailable","This browser could not start the local chess engine.");console.error(error);return}
    let sent=false;
    worker.onerror=error=>{this.cancelEngine();this.status("Computer unavailable","The local engine stopped. Reset the game to try again.");console.error(error.message||error)};
    worker.onmessage=event=>{
      const line=String(event.data??"").trim();
      if(line==="uciok"&&!sent){sent=true;worker.postMessage("setoption name Skill Level value "+limits.skill);worker.postMessage("ucinewgame");worker.postMessage("position fen "+this.chess.fen());worker.postMessage("go depth "+limits.depth);return}
      if(!line.startsWith("bestmove "))return;
      const uci=line.split(/\s+/)[1];const active=worker===this.engineWorker;
      this.cancelEngine();if(!active||this.mode!=="computer"||this.isHumanTurn()||this.terminal())return;
      const match=/^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(uci||"");
      if(!match){this.status("Computer paused","No legal engine move was returned. Reset to continue.");return}
      const legal=this.chess.moves({verbose:true}).find(m=>m.from===match[1]&&m.to===match[2]&&(!m.promotion||m.promotion===match[3]));
      if(!legal){this.status("Computer paused","The engine reply did not pass legal-move validation.");console.error("Rejected Stockfish move",uci);return}
      this.makeMove(legal.from,legal.to,legal.promotion||"q");
    };
    worker.postMessage("uci");
  }
  terminal(){

    return !!this.finished||this.chess.isCheckmate()||this.chess.isStalemate()||this.chess.isInsufficientMaterial();
  }
  drawClaimAvailable(){return !this.terminal()&&(this.chess.isThreefoldRepetition()||this.chess.isDrawByFiftyMoves())}
  drawClaimText(){return this.chess.isThreefoldRepetition()?"threefold repetition":"the fifty-move rule"}
  claimDraw(){
    if(!this.drawClaimAvailable())return;
    this.finished="Draw claimed by "+(this.chess.turn()==="w"?"White":"Black")+" — "+this.drawClaimText()+".";
    this.$("chess-status").textContent="Draw agreed";this.$("chess-substatus").textContent=this.finished;
    this.audio.play("chess-end");this.render();
  }
  onSquare(square){
    if(this.terminal()||this.paused||this.pendingPromotion||this.computerThinking||!this.isHumanTurn())return;
    const clicked=this.chess.get(square);
    if(this.selected){
      const moves=this.chess.moves({square:this.selected,verbose:true});
      const candidates=moves.filter(m=>m.to===square);
      if(candidates.length){
        if(candidates.some(m=>m.promotion)){this.showPromotion(this.selected,square);return}
        this.makeMove(this.selected,square);return;
      }
      if(clicked&&clicked.color===this.chess.turn()){this.selected=square;this.render();return}
      this.selected=null;this.render();return;
    }
    if(clicked&&clicked.color===this.chess.turn()){this.selected=square;this.render()}
  }
  makeMove(from,to,promotion="q"){
    const before={remaining:{...this.remaining},clockStarted:this.clockStarted};
    let move;
    try{move=this.chess.move({from,to,promotion})}catch(err){this.status("Illegal move",err.message||"That move is not legal.");return}
    if(!move){this.status("Illegal move","That move is not legal.");return}
    this.clockSnapshots.push(before);this.selected=null;this.pendingPromotion=null;this.$("promotion-backdrop").hidden=true;
    this.clockStarted=true;this.lastMove={from:move.from,to:move.to};this.audio.play(move.captured?"chess-capture":"chess-move");
    if(this.chess.isCheck())this.audio.play("chess-check");
    this.render();this.maybeComputer();
  }
  showPromotion(from,to){
    this.pendingPromotion={from,to};const host=this.$("promotion-choices");host.innerHTML="";
    const color=this.chess.turn();
    ["q","r","b","n"].forEach(type=>{
      const button=document.createElement("button");button.type="button";button.className="promotion-piece";
      button.setAttribute("aria-label","Promote to "+PIECES[type]);
      button.innerHTML=this.pieceMarkup(color,type);
      button.addEventListener("click",()=>this.makeMove(from,to,type));host.appendChild(button);
    });
    this.$("promotion-backdrop").hidden=false;this.$("chess-substatus").textContent="Choose the piece your pawn will become.";
  }
  cancelPromotion(){this.pendingPromotion=null;this.$("promotion-backdrop").hidden=true;this.render()}
  undo(){
    if(!this.chess.history().length)return;
    this.cancelEngine();
    const count=this.mode==="computer"&&this.chess.turn()===this.playerColor&&this.chess.history().length>=2?2:1;
    for(let i=0;i<count;i++){this.chess.undo();const snapshot=this.clockSnapshots.pop();if(snapshot){this.remaining={...snapshot.remaining};this.clockStarted=snapshot.clockStarted}}
    this.selected=null;this.pendingPromotion=null;this.finished="";this.claimed="";this.$("promotion-backdrop").hidden=true;this.lastMove=null;
    this.audio.play("chess-move");this.render();
  }
  capturedBy(color){
    return this.chess.history({verbose:true}).filter(m=>m.color===color&&m.captured).map(m=>m.captured);
  }
  renderCaptured(color){
    const pieces=this.capturedBy(color);
    const host=this.$(color==="w"?"white-captured":"black-captured");
    const capturedColor=color==="w"?"b":"w";
    host.innerHTML=pieces.length?("CAPTURED: "+pieces.map(p=>this.pieceMarkup(capturedColor,p)).join("")):"CAPTURED: —";
  }
  pieceMarkup(color,type){
    return `<svg class="piece-art piece-${color}" viewBox="0 0 100 100" aria-hidden="true"><use href="${this.pieceUrl}#${color}-${PIECES[type]}"></use></svg>`;
  }
  render(){
    const matrix=this.chess.board(),history=this.chess.history({verbose:true});
    this.lastMove=history.length?{from:history[history.length-1].from,to:history[history.length-1].to}:null;
    const rows=this.flipped?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7];
    const legal=this.selected?this.chess.moves({square:this.selected,verbose:true}):[];
    const targets=new Set(legal.map(m=>m.to));
    const checked=this.chess.isCheck()?this.findKing(this.chess.turn()):null;
    this.boardEl.innerHTML="";
    for(const row of rows){
      const cols=this.flipped?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7];
      for(const col of cols){
        const square="abcdefgh"[col]+(8-row),piece=matrix[row][col],btn=document.createElement("button");
        btn.type="button";btn.className="chess-square "+((row+col)%2===0?"light":"dark");
        if(this.selected===square)btn.classList.add("selected");
        if(this.lastMove&&(this.lastMove.from===square||this.lastMove.to===square))btn.classList.add("last");
        if(checked===square)btn.classList.add("in-check");
        if(targets.has(square)&&piece)btn.classList.add("has-capture");
        btn.dataset.square=square;btn.setAttribute("role","gridcell");
        btn.setAttribute("aria-label",square+(piece?", "+(piece.color==="w"?"white ":"black ")+PIECES[piece.type]:" empty")+(targets.has(square)?", legal destination":""));
        if(piece){btn.innerHTML=this.pieceMarkup(piece.color,piece.type)}
        if(targets.has(square)){const dot=document.createElement("span");dot.className="legal-dot";btn.appendChild(dot)}
        const showRank=(!this.flipped&&col===0)||(this.flipped&&col===7);
        const showFile=(!this.flipped&&row===7)||(this.flipped&&row===0);
        if(showRank){const el=document.createElement("span");el.className="coordinate rank";el.textContent=8-row;btn.appendChild(el)}
        if(showFile){const el=document.createElement("span");el.className="coordinate file";el.textContent="abcdefgh"[col];btn.appendChild(el)}
        btn.addEventListener("click",()=>this.onSquare(square));
        btn.addEventListener("dragstart",e=>{
          if(piece&&piece.color===this.chess.turn()&&!this.terminal()&&!this.computerThinking&&this.isHumanTurn()){this.dragFrom=square;e.dataTransfer.setData("text/plain",square);e.dataTransfer.effectAllowed="move"}
          else e.preventDefault();
        });
        btn.addEventListener("dragover",e=>{if(this.dragFrom)e.preventDefault()});
        btn.addEventListener("drop",e=>{e.preventDefault();const from=e.dataTransfer.getData("text/plain")||this.dragFrom;this.onSquare(from);this.onSquare(square);this.dragFrom=null});
        if(piece)btn.draggable=true;
        this.boardEl.appendChild(btn);
      }
    }
    this.renderHistory(history);this.renderCaptured("w");this.renderCaptured("b");
    this.$("chess-undo").disabled=!history.length||this.computerThinking;
    this.$("move-count").textContent=history.length+" PLY";
    this.$("white-player").classList.toggle("active",this.chess.turn()==="w"&&!this.terminal());
    this.$("black-player").classList.toggle("active",this.chess.turn()==="b"&&!this.terminal());
    this.$("white-clock").textContent=fmt(this.remaining.w);this.$("black-clock").textContent=fmt(this.remaining.b);
    this.$("white-clock").classList.toggle("clock-low",this.remaining.w<60000);
    this.$("black-clock").classList.toggle("clock-low",this.remaining.b<60000);
    const whiteToMove=this.chess.turn()==="w";
    if(this.paused){this.$("chess-status").textContent="Game paused";this.$("chess-substatus").textContent="The board and clock are holding their place."}
    else if(this.finished){this.$("chess-status").textContent=this.finished.includes("Draw")?"Draw":"Game over";this.$("chess-substatus").textContent=this.finished}
    else if(this.chess.isCheckmate()){this.$("chess-status").textContent="Checkmate";this.$("chess-substatus").textContent=(whiteToMove?"Black":"White")+" wins.";this.finished=(whiteToMove?"Black":"White")+" wins";this.audio.play("chess-end")}
    else if(this.chess.isStalemate()){this.$("chess-status").textContent="Stalemate";this.$("chess-substatus").textContent="The game is drawn.";this.finished="Draw by stalemate";this.audio.play("chess-end")}
    else if(this.chess.isInsufficientMaterial()){this.$("chess-status").textContent="Draw";this.$("chess-substatus").textContent="Insufficient material.";this.finished="Draw — insufficient material";this.audio.play("chess-end")}
    else if(this.chess.isCheck()){this.$("chess-status").textContent=(whiteToMove?"White":"Black")+" is in check";this.$("chess-substatus").textContent="Find a safe square for the king.";this.$("chess-substatus").classList.add("status-check")}
    else{this.$("chess-status").textContent=(whiteToMove?"White":"Black")+" to move";this.$("chess-substatus").textContent=this.selected?"Choose a highlighted square.":"Select a piece to see its legal moves.";this.$("chess-substatus").classList.remove("status-check")}
    const canClaim=this.drawClaimAvailable();this.$("chess-draw-claim").hidden=!canClaim||!!this.finished;
  }
  renderHistory(history){
    const host=this.$("chess-moves");host.innerHTML="";
    if(!history.length){const p=document.createElement("p");p.className="empty-moves";p.textContent="The first move is yours.";host.appendChild(p);return}
    for(let i=0;i<history.length;i+=2){
      const row=document.createElement("div");row.className="move-pair";
      const num=document.createElement("span");num.className="move-number";num.textContent=(Math.floor(i/2)+1)+".";
      const white=document.createElement("span");white.className="move-san";white.textContent=history[i].san;
      const black=document.createElement("span");black.className="move-san";black.textContent=history[i+1]?.san||"";
      if(i===history.length-1)white.classList.add("latest");if(i+1===history.length-1)black.classList.add("latest");
      row.append(num,white,black);host.appendChild(row);
    }
    host.scrollTop=host.scrollHeight;
  }
  findKing(color){
    const board=this.chess.board();for(const row of board)for(const p of row)if(p&&p.type==="k"&&p.color===color)return p.square;return null;
  }
  status(title,detail){this.$("chess-status").textContent=title;this.$("chess-substatus").textContent=detail}
  async copyPGN(){
    const pgn=this.chess.pgn();
    if(!pgn){this.status("No moves yet","Make a move before copying a game score.");return}
    if(!navigator.clipboard?.writeText){this.status("Clipboard unavailable","Your browser does not allow clipboard access.");return}
    try{await navigator.clipboard.writeText(pgn);this.status("PGN copied","The game score is on your clipboard.")}
    catch{this.status("Clipboard unavailable","Your browser did not allow clipboard access.")}
  }
  update(dt){
    if(!this.active||this.paused||!this.clockStarted||this.terminal())return;
    const side=this.chess.turn();this.remaining[side]=Math.max(0,this.remaining[side]-dt*1000);
    if(this.remaining[side]<=0){
      const opponent=side==="w"?"b":"w";
      this.finished=this.chess.isInsufficientMaterial()?"Draw on time — insufficient mating material.":(opponent==="w"?"White":"Black")+" wins on time.";
      this.audio.play("chess-end");this.render();return;
    }
    this.$(side==="w"?"white-clock":"black-clock").textContent=fmt(this.remaining[side]);
    if(this.remaining[side]<60000)this.$(side==="w"?"white-clock":"black-clock").classList.add("clock-low");
  }
  setActive(v){
    this.active=!!v;
    if(!this.active&&this.computerThinking)this.cancelEngine();
    if(this.active)this.maybeComputer();
  }
  destroy(){this.cancelEngine()}
}
