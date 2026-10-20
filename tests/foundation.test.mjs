import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState, executeProposal, assertValidState} from '../src/state/state.js';
import {rollDie} from '../src/state/rng.js';
import {encodeSave, decodeSave, saveToStorage, loadFromStorage} from '../src/state/storage.js';
import {parseLocalDiagnostic, narrateAuthoritativeResult} from '../src/ai/contract.js';
import {getStatusModel, renderState} from '../src/ui/view.js';
const proposal = rev => ({contract:'bx.intent.v1',baseRevision:rev,operations:[{kind:'diagnostic.roll',sides:6}]});
test('seeded diagnostic die reproduces identical sequence and captures RNG',()=>{
  const sequence = seed => {let s=createDemoState(seed);const values=[];for(let i=0;i<200;i++){const out=executeProposal(s,proposal(s.revision));assert.ok(out.accepted);values.push(out.outcomes[0].value);s=out.state;}return {values,s};};
  const a=sequence(0),b=sequence(0),c=sequence(17);
  assert.deepEqual(a,b);assert.notDeepEqual(a.values,c.values);assert.equal(a.s.rng.draws,200);
});
test('save/load retains revision, journal and exact next roll',()=>{
  const first=executeProposal(createDemoState(19),proposal(0)).state;
  const restored=decodeSave(encodeSave(first));
  assert.deepEqual(restored,first);
  assert.deepEqual(executeProposal(restored,proposal(1)),executeProposal(first,proposal(1)));
});
test('stale, invented outcomes and unknown operations fail without RNG mutation',()=>{
  const original=createDemoState(0);
  for(const bad of [proposal(2),{...proposal(0),operations:[{kind:'set.hp',amount:-9}]},{...proposal(0),operations:[{kind:'diagnostic.roll',sides:6,value:6}]},{...proposal(0),operations:[{kind:'diagnostic.roll',sides:6},{kind:'diagnostic.roll',sides:6}]}]){
    const r=executeProposal(original,bad);assert.equal(r.accepted,false);assert.strictEqual(r.state,original);assert.equal(original.rng.draws,0);
  }
});
test('save schema rejects unsupported and tampered data',()=>{
  for(const patch of [{schemaVersion:3},{ruleset:'BECMI'},{rng:{state:-1,draws:0}},{character:{name:'Forged'}},{turns:-1},{revision:null}]){
    const s={...createDemoState(),...patch};assert.throws(()=>assertValidState(s));
  }
  assert.throws(()=>decodeSave('{bad json'));assert.throws(()=>decodeSave('null'));
});
test('storage roundtrip and missing-key refusal',()=>{
  const map=new Map(),storage={setItem:(k,v)=>map.set(k,v),getItem:k=>map.has(k)?map.get(k):null};
  assert.throws(()=>loadFromStorage(storage),/No saved/);
  const state=createDemoState(99);saveToStorage(storage,state);assert.deepEqual(loadFromStorage(storage),state);
});
test('local parser is explicitly not a free-form AI',()=>{
  assert.deepEqual(parseLocalDiagnostic(' ROLL D6 ',4),proposal(4));
  assert.equal(parseLocalDiagnostic('I attack the goblin',0),null);
  assert.match(narrateAuthoritativeResult(executeProposal(createDemoState(),proposal(0))),/Diagnostic d6/);
});
test('UI model and bound HP bar come only from engine state',()=>{
  const state=createDemoState(1),model=getStatusModel(state);
  assert.equal(model.hp,'4/4');assert.equal(model.revision,'0');
  const nodes=new Map();for(const id of ['hero-name','hero-class','hero-hp','hero-ac','hero-xp','hero-abilities','turns','minutes','light','draws','revision','hp-bar'])nodes.set(id,{textContent:null,attributes:{},setAttribute(k,v){this.attributes[k]=v;}});
  renderState(state,{getElementById:id=>nodes.get(id)});
  assert.equal(nodes.get('hero-hp').textContent,'4/4');assert.equal(nodes.get('hp-bar').attributes.width,'144');
  const next=executeProposal(state,proposal(0)).state;renderState(next,{getElementById:id=>nodes.get(id)});
  assert.equal(nodes.get('revision').textContent,'1');assert.equal(nodes.get('draws').textContent,'1');
});
test('rejection sampling die respects bounds and one-to-one next-state',()=>{
  let rng={state:123456,draws:0};for(const sides of [4,6,8,10,12,20,100]){const out=rollDie(rng,sides);assert.ok(out.value>=1&&out.value<=sides);rng=out.rng;}assert.equal(rng.draws,7);
  assert.throws(()=>rollDie(rng,0));assert.throws(()=>rollDie(rng,101));
});
