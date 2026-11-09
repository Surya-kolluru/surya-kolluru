import {Chess} from "https://esm.sh/chess.js@1.4.0";
import {storage} from "./storage.js";

const PIECES={p:"pawn",n:"knight",b:"bishop",r:"rook",q:"queen",k:"king"};
const GLYPH={p:"P",n:"N",b:"B",r:"R",q:"Q",k:"K"};
const START_MS=10*60*1000;
const fmt=t=>{const v=Math.max(0,Math.ceil(t/1000));return Math.floor(v/60)+":"+String(v%60).padStart(2,"0")};

export class ChessGame{
  constructor(audio){
    this.audio=audio;this.chess=new Chess();this.selected=null;this.flipped=false;this.lastMove=null;
    this.finished="";this.claimed="";this.pendingPromotion=null;this.active=true;this.clockStarted=false;
    this.remaining={w:START_MS,b:START_MS};this.clockSnapshots=[];this.dragFrom=null;
    this.pieceUrl=new URL("../assets/chess/staunton.svg",import.meta.url).href;
    this.boardEl=this.$("chess-board");this.bind();this.render();
  }
  $(id){return document.getElementById(id)}
  bind(){
    this.$("chess-new").addEventListener("click",()=>this.reset());
    this.$("chess-undo").addEventListener("click",()=>this.undo());
    this.$("chess-flip").addEventListener("click",()=>{this.flipped=!this.flipped;this.render()});
    this.$("chess-copy-pgn").addEventListener("click",()=>this.copyPGN());
    this.$("chess-draw-claim").addEventListener("click",()=>this.claimDraw());
    this.$("promotion-cancel").addEventListener("click",()=>this.cancelPromotion());
    this.$("promotion-backdrop").addEventListener("pointerdown",e=>{if(e.target.id==="promotion-backdrop")this.cancelPromotion()});
  }
  reset(){
    this.chess=new Chess();this.selected=null;this.lastMove=null;this.finished="";this.claimed="";
    this.pendingPromotion=null;this.clockStarted=false;this.remaining={w:START_MS,b:START_MS};this.clockSnapshots=[];
    this.$("promotion-backdrop").hidden=true;this.$("chess-status").textContent="White to move";
    this.$("chess-substatus").textContent="Select a piece to see its legal moves.";
    this.$("chess-undo").disabled=true;this.render();this.audio.play("chess-move");
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
    if(this.terminal()||this.pendingPromotion)return;
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
    this.render();
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
    this.chess.undo();const snapshot=this.clockSnapshots.pop();
    if(snapshot){this.remaining={...snapshot.remaining};this.clockStarted=snapshot.clockStarted}
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
          if(piece&&piece.color===this.chess.turn()&&!this.terminal()){this.dragFrom=square;e.dataTransfer.setData("text/plain",square);e.dataTransfer.effectAllowed="move"}
          else e.preventDefault();
        });
        btn.addEventListener("dragover",e=>{if(this.dragFrom)e.preventDefault()});
        btn.addEventListener("drop",e=>{e.preventDefault();const from=e.dataTransfer.getData("text/plain")||this.dragFrom;this.onSquare(from);this.onSquare(square);this.dragFrom=null});
        if(piece)btn.draggable=true;
        this.boardEl.appendChild(btn);
      }
    }
    this.renderHistory(history);this.renderCaptured("w");this.renderCaptured("b");
    this.$("chess-undo").disabled=!history.length;
    this.$("move-count").textContent=history.length+" PLY";
    this.$("white-player").classList.toggle("active",this.chess.turn()==="w"&&!this.terminal());
    this.$("black-player").classList.toggle("active",this.chess.turn()==="b"&&!this.terminal());
    this.$("white-clock").textContent=fmt(this.remaining.w);this.$("black-clock").textContent=fmt(this.remaining.b);
    this.$("white-clock").classList.toggle("clock-low",this.remaining.w<60000);
    this.$("black-clock").classList.toggle("clock-low",this.remaining.b<60000);
    const whiteToMove=this.chess.turn()==="w";
    if(this.finished){this.$("chess-status").textContent=this.finished.includes("Draw")?"Draw":"Game over";this.$("chess-substatus").textContent=this.finished}
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
  copyPGN(){
    const pgn=this.chess.pgn();
    if(!pgn){this.status("No moves yet","Make a move before copying a game score.");return}
    navigator.clipboard?.writeText(pgn).then(()=>this.status("PGN copied","The game score is on your clipboard.")).catch(()=>this.status("Clipboard unavailable","Your browser did not allow clipboard access."));
  }
  update(dt){
    if(!this.active||!this.clockStarted||this.terminal())return;
    const side=this.chess.turn();this.remaining[side]=Math.max(0,this.remaining[side]-dt*1000);
    if(this.remaining[side]<=0){
      const opponent=side==="w"?"b":"w";
      this.finished=this.chess.isInsufficientMaterial()?"Draw on time — insufficient mating material.":(opponent==="w"?"White":"Black")+" wins on time.";
      this.audio.play("chess-end");this.render();return;
    }
    this.$(side==="w"?"white-clock":"black-clock").textContent=fmt(this.remaining[side]);
    if(this.remaining[side]<60000)this.$(side==="w"?"white-clock":"black-clock").classList.add("clock-low");
  }
  setActive(v){this.active=!!v}
  destroy(){}
}
