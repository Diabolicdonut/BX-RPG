import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,executeProposal,assertValidState,migrateSaveState,SCHEMA_VERSION} from '../src/state/state.js';
import {encodeSave,decodeSave,SAVE_KEY} from '../src/state/storage.js';
import {parseLocalIntent,narrateAuthoritativeResult} from '../src/ai/contract.js';
import {getStatusModel,renderState} from '../src/ui/view.js';
import {rollDie} from '../src/state/rng.js';
const rest=s=>({contract:'bx.intent.v1',baseRevision:s.revision,operations:[{kind:'dungeon.rest'}]});
const run=s=>executeProposal(s,rest(s));
const successful=s=>{const r=run(s);assert.ok(r.accepted);return r;};
function seedWith(checks,desired){for(let n=0;n<5000;n++){
  let rng={state:n,draws:0},values=[];
  for(let j=0;j<checks;j++){const r=rollDie(rng,6);rng=r.rng;values.push(r.value);}
  if(desired(values))return n;
}throw Error('No seed matched deterministic check');}

test('offline exact-phrase parser bridges player prose to one typed turn, not arbitrary language',()=>{
  const op={contract:'bx.intent.v1',baseRevision:7,operations:[{kind:'dungeon.rest'}]};
  for(const text of ['We rest for one turn','the party rests for 10 minutes','Our party takes a rest','we rest.'])
    assert.deepEqual(parseLocalIntent(text,7),op);
  for(const text of ['the thief checks the eastern door','we move and rest','wait for three turns','we rest and open the door','I rest','we cast sleep'])
    assert.equal(parseLocalIntent(text,7),null);
});
test('one B/X rest turn advances 10 minutes, uses one torch turn, no random draw',()=>{
  const original=createDemoState(123),result=successful(original);
  assert.equal(result.state.schemaVersion,4);
  assert.equal(result.state.turns,1);assert.equal(result.state.revision,1);
  assert.deepEqual(result.state.light,{kind:'torch',remainingTurns:5});
  assert.equal(result.state.rng.draws,0);
  assert.deepEqual(original,createDemoState(123));
  assert.deepEqual(result.outcomes,[{kind:'dungeon.rest',turn:1,minutes:10,lightKind:'torch',lightRemaining:5,torchExpired:false}]);
  assert.match(narrateAuthoritativeResult(result),/Dungeon turn 1/);
  assert.equal(getStatusModel(result.state).minutes,'10');
});
test('wandering check is seeded and occurs exactly on every second turn, not every action',()=>{
  const seed=seedWith(3,v=>v.every(x=>x!==1));
  let state=createDemoState(seed);
  for(let turn=1;turn<=6;turn++){
    const result=successful(state);state=result.state;
    assert.equal(state.rng.draws,Math.floor(turn/2));
    assert.equal(state.pendingEncounter,null);
    assert.equal(state.turns,turn);
  }
  assert.equal(state.light.remainingTurns,0);
  assert.equal(state.journal.filter(e=>e.torchExpired).length,1);
  assert.deepEqual(successful(state).state.light,{kind:'torch',remainingTurns:0});
});
test('seeded 1-in-6 wandering event queues next-turn stop without inventing a creature',()=>{
  const seed=seedWith(1,v=>v[0]===1);
  const first=successful(createDemoState(seed));
  const second=successful(first.state);
  assert.equal(second.state.rng.draws,1);
  assert.deepEqual(second.state.pendingEncounter,{kind:'wandering',dueTurn:3});
  assert.equal(second.state.turns,2);
  const narration=narrateAuthoritativeResult(second);
  assert.doesNotMatch(narration,/wandering|monster|encounter|\bd6\b|dice|check|arrives/i);
  assert.deepEqual(Object.keys(second.outcomes[0]).sort(),['kind','turn','minutes','lightKind','lightRemaining','torchExpired'].sort());
  const refused=run(second.state);
  assert.equal(refused.accepted,false);
  assert.strictEqual(refused.state,second.state);
  assert.equal(refused.state.rng.draws,1);
  assert.equal(refused.state.light.remainingTurns,4);
  assert.match(narrateAuthoritativeResult(refused),/State unchanged/);
});
test('seed and saved state replay precisely across wandering checks',()=>{
  const seed=seedWith(1,v=>v[0]===1);
  const state=successful(createDemoState(seed)).state;
  const restored=decodeSave(encodeSave(state));
  assert.deepEqual(restored,state);
  assert.deepEqual(run(restored),run(state));
  assert.deepEqual(decodeSave(encodeSave(run(state).state)).pendingEncounter,{kind:'wandering',dueTurn:3});
});
test('torch expiry is authoritative, narrated once and does not relight',()=>{
  const seed=seedWith(4,v=>v.every(x=>x!==1));
  let state=createDemoState(seed);
  for(let i=1;i<=8;i++){
    const res=successful(state);state=res.state;
    if(i===6) assert.match(narrateAuthoritativeResult(res),/torch burns out/i);
    if(i===7) assert.doesNotMatch(narrateAuthoritativeResult(res),/torch burns out/i);
  }
  assert.equal(state.light.remainingTurns,0);
  assert.equal(state.journal.filter(e=>e.torchExpired).length,1);
  assert.equal(getStatusModel(state).light,'Torch extinguished');
});
test('no light resource is invented when migrating exact v0.1.0 save',()=>{
  const source=createDemoState(33);
  const legacy={schemaVersion:1,ruleset:source.ruleset,revision:0,character:source.character,
    turns:0,rng:source.rng,journal:[]};
  const migrated=decodeSave(JSON.stringify(legacy));
  assert.equal(migrated.schemaVersion,SCHEMA_VERSION);
  assert.deepEqual(migrated.light,{kind:'none',remainingTurns:0});
  assert.deepEqual(successful(migrated).state.light,{kind:'none',remainingTurns:0});
  assert.equal(SAVE_KEY,'bx-rpg-v0.1.0-demo');
  assert.deepEqual(decodeSave(encodeSave(migrated)),migrated);
  assert.deepEqual(migrateSaveState(migrated),migrated);
});
test('legacy save retains an existing diagnostic journal and next RNG result',()=>{
  const initial=createDemoState(33);
  const d=executeProposal(initial,{contract:'bx.intent.v1',baseRevision:0,operations:[{kind:'diagnostic.roll',sides:6}]});
  const {light,pendingEncounter,activeEncounter,...old}=d.state;
  const migrated=decodeSave(JSON.stringify({...old,schemaVersion:1}));
  assert.deepEqual(migrated.rng,d.state.rng);
  assert.deepEqual(migrated.journal,d.state.journal);
  assert.equal(migrated.revision,d.state.revision);
  assert.deepEqual(run(migrated),run(migrateSaveState({...old,schemaVersion:1})));
});
test('reject stale and forged rest proposals without state, time, or RNG change',()=>{
  const original=createDemoState(777);
  const rejected=[{...rest(original),baseRevision:2},
    {...rest(original),operations:[{kind:'dungeon.rest',minutes:0}]},
    {...rest(original),operations:[{kind:'dungeon.rest',roll:1}]},
    {...rest(original),operations:[{kind:'dungeon.rest'},{kind:'diagnostic.roll',sides:6}]},
    {...rest(original),hacked:true},
    {...rest(original),operations:[{kind:'set.time',turns:999}]},
    {...rest(original),operations:[{kind:'dungeon.rest',pendingEncounter:false}]}];
  for(const proposal of rejected){
    const r=executeProposal(original,proposal);
    assert.equal(r.accepted,false);assert.strictEqual(r.state,original);
    assert.equal(original.rng.draws,0);assert.equal(original.turns,0);
  }
});
test('tampered light/pending/turn records, schema, and unexpected save fields fail closed',()=>{
  const s=successful(createDemoState(99)).state;
  for(const patch of [
    {light:{kind:'torch',remainingTurns:30}},{light:null},
    {light:{kind:'none',remainingTurns:6}},{pendingEncounter:{kind:'wandering',dueTurn:1}},
    {pendingEncounter:false},{schemaVersion:9},{ruleset:'BECMI'},{extraSecret:'abc'},
    {journal:[{kind:'dungeon.rest',turn:1,lightRemaining:5,torchExpired:false,die:1}]}
  ])assert.throws(()=>assertValidState({...s,...patch}));
  assert.throws(()=>decodeSave(JSON.stringify({schemaVersion:1,foo:'forged'})));
  const badLegacy={schemaVersion:1,ruleset:s.ruleset,revision:0,character:s.character,turns:0,rng:s.rng,journal:[],light:{kind:'torch',remainingTurns:6}};
  assert.throws(()=>decodeSave(JSON.stringify(badLegacy)));
});
test('UI binds exploration time and torch independently from narration',()=>{
  let s=successful(createDemoState(7)).state;
  const nodes=new Map();for(const id of ['hero-name','hero-class','hero-hp','hero-ac','hero-xp','hero-abilities','turns','minutes','light','draws','revision','hp-bar','encounter'])
    nodes.set(id,{textContent:null,attributes:{},setAttribute(k,v){this.attributes[k]=v;}});
  const doc={getElementById:id=>nodes.get(id)};
  renderState(s,doc);
  assert.equal(nodes.get('minutes').textContent,'10');
  assert.equal(nodes.get('light').textContent,'Torch · 5 turns remaining');
  assert.equal(nodes.get('hp-bar').attributes.width,'144');
  s=successful(s).state;
  renderState(s,doc);
  assert.equal(nodes.get('draws').textContent,'1');
  assert.equal(nodes.get('light').textContent,'Torch · 4 turns remaining');
  assert.equal(nodes.get('turns').textContent,'2');
});
