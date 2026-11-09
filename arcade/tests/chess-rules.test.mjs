import test from "node:test";
import assert from "node:assert/strict";
import {Chess} from "../js/chess-rules.js";

test("chess rules: legal move acceptance and illegal move rejection",()=>{const c=new Chess();assert.ok(c.moves({square:"e2"}).includes("e4"));assert.throws(()=>c.move({from:"e2",to:"e5"}));assert.equal(c.history().length,0)});
test("chess rules: both castling sides and en passant",()=>{const c=new Chess();c.load("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1");assert.deepEqual(c.moves({square:"e1",verbose:true}).filter(m=>m.san.startsWith("O-O")).map(m=>m.san).sort(),["O-O","O-O-O"]);c.reset();["e4","a6","e5","d5"].forEach(m=>c.move(m));assert.ok(c.moves({square:"e5",verbose:true}).some(m=>m.to==="d6"&&m.flags.includes("e")))});
test("chess rules: promotion choices, underpromotion, checkmate and stalemate",()=>{const c=new Chess();c.load("7k/P7/8/8/8/8/8/7K w - - 0 1");assert.deepEqual(c.moves({square:"a7",verbose:true}).filter(m=>m.promotion).map(m=>m.promotion).sort(),["b","n","q","r"]);c.move({from:"a7",to:"a8",promotion:"n"});assert.equal(c.get("a8").type,"n");c.load("7k/6Q1/5K2/8/8/8/8/8 b - - 0 1");assert.equal(c.isCheckmate(),true);c.load("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");assert.equal(c.isStalemate(),true)});
test("chess rules: claimable repetition and fifty-move draw states",()=>{const c=new Chess();["Nf3","Nf6","Ng1","Ng8","Nf3","Nf6","Ng1","Ng8"].forEach(m=>c.move(m));assert.equal(c.isThreefoldRepetition(),true);c.load("4k2r/8/8/8/8/8/8/R3K2R w KQk - 100 51");assert.equal(c.isDrawByFiftyMoves(),true)});
