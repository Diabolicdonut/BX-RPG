import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,executeProposal,assertValidState,migrateSaveState,SCHEMA_VERSION} from '../src/state/state.js';
import {encodeSave,decodeSave} from '../src/state/storage.js';
import {rollDie} from '../src/state/rng.js';
import {levelOneGoblinContact as packet} from '../src/content/encounters/level1-goblin.js';
import {parseLocalIntent,narrateAuthoritativeResult} from '../src/ai/contract.js';
import {getStatusModel} from '../src/ui/view.js';

const intent=(state,kind)=>({contract:'bx.intent.v1',baseRevision:state.revision,operations:[{kind}]});
function contact(seed) {
  let s=createDemoState(seed);
  for(let i=0;i<2;i++){const result=executeProposal(s,intent(s,'dungeon.rest'));assert.ok(result.accepted);s=result.state;}
  assert.deepEqual(s.pendingEncounter,{kind:'wandering',dueTurn:3});
  const result=executeProposal(s,intent(s,'encounter.establish'));
  assert.ok(result.accepted);
  return result.state;
}
function adjudicate(state,source=packet){return executeProposal(state,intent(state,'encounter.surprise'),source);}

test('Moldvay B23 surprise checks both d6 in fixed party/monster order, with four possible combinations',()=>{
  const fixtures=[
    [1,true,false,'party-surprised'],
    [7,true,true,'mutual-surprise'],
    [13,false,false,'neither-surprised'],
    [25,false,true,'monster-surprised']
  ];
  for(const [seed,p,m,disposition] of fixtures) {
    const s=contact(seed);
    const expectedParty=rollDie(s.rng,6),expectedMonster=rollDie(expectedParty.rng,6);
    const result=adjudicate(s);
    assert.equal(result.accepted,true,seed);
    const outcome=result.state.activeEncounter.surprise;
    assert.equal(outcome.partyRoll,expectedParty.value);
    assert.equal(outcome.monsterRoll,expectedMonster.value);
    assert.equal(outcome.partySurprised,p);
    assert.equal(outcome.monsterSurprised,m);
    assert.equal(outcome.disposition,disposition);
    assert.deepEqual(result.state.rng,expectedMonster.rng);
    assert.equal(result.state.rng.draws,s.rng.draws+2);
    assert.equal(result.state.revision,s.revision+1);
    assert.equal(result.state.activeEncounter.stage,'surprise-adjudicated');
    assert.equal(s.activeEncounter.surprise,null,'previous state must not change');
    assertValidState(result.state);
  }
});
test('surprise leaves contact, encounter timing, resources and non-RNG character state intact',()=>{
  const s=contact(1),resolved=adjudicate(s).state;
  assert.equal(resolved.turns,2);
  assert.deepEqual(resolved.light,s.light);
  assert.deepEqual(resolved.character,s.character);
  assert.equal(resolved.pendingEncounter,null);
  assert.equal(resolved.activeEncounter.distanceFeet,s.activeEncounter.distanceFeet);
  assert.equal(resolved.activeEncounter.numberAppearing,s.activeEncounter.numberAppearing);
  assert.equal(resolved.activeEncounter.dueTurn,s.activeEncounter.dueTurn);
  assert.deepEqual(resolved.activeEncounter.visibility,{presence:'unestablished',identity:'unestablished',distance:'unestablished'});
  assert.equal(getStatusModel(resolved).encounter,'Surprise resolved · visibility unestablished');
  assert.equal(resolved.journal.at(-1).kind,'encounter.surprise');
});
test('narration exposes own-side surprised status but no hidden opponent die or unestablished appearance/distance',()=>{
  for(const seed of [1,7,13,25]) {
    const result=adjudicate(contact(seed));
    assert.deepEqual(result.outcomes,[{kind:'encounter.surprise',
      partySurprised:result.state.activeEncounter.surprise.partySurprised,
      perception:'unestablished'}]);
    const message=narrateAuthoritativeResult(result);
    for(const secret of ['goblin','distancefeet','numberappearing','monsterroll','monstersurprised','packetid','2d6']) {
      assert.ok(!JSON.stringify(result.outcomes).toLowerCase().includes(secret),secret);
      assert.ok(!message.toLowerCase().includes(secret),secret);
    }
    assert.match(message,/not yet been established/);
  }
});
test('invalid, stale, duplicate, and data-forged surprise requests refuse atomically',()=>{
  const s=contact(1);
  const badProposals=[
    {...intent(s,'encounter.surprise'),baseRevision:s.revision-1},
    {...intent(s,'encounter.surprise'),operations:[{kind:'encounter.surprise',monsterRoll:6}]},
    {...intent(s,'encounter.surprise'),operations:[{kind:'encounter.surprise',surprise:false}]},
    {...intent(s,'encounter.surprise'),operations:[{kind:'encounter.surprise'},{kind:'dungeon.rest'}]},
    {...intent(s,'encounter.surprise'),statePatch:{hp:0}},
    intent(s,'encounter.reaction')
  ];
  for(const proposal of badProposals) {
    const result=executeProposal(s,proposal);
    assert.equal(result.accepted,false);assert.strictEqual(result.state,s);
  }
  for(const bad of [{...packet,monster:'dragon'},{...packet,privateNotes:'secret'},null]) {
    const result=adjudicate(s,bad);
    assert.equal(result.accepted,false);assert.strictEqual(result.state,s);
  }
  assert.equal(s.rng.draws,3);
  const done=adjudicate(s).state;
  for(const op of ['encounter.surprise','encounter.establish','dungeon.rest']) {
    const refusal=executeProposal(done,intent(done,op));
    assert.equal(refusal.accepted,false);assert.strictEqual(refusal.state,done);
  }
  assert.equal(executeProposal(createDemoState(1),intent(createDemoState(1),'encounter.surprise')).accepted,false);
});
test('exact v3 active contact and pending saves migrate without inventing surprise or knowing presence',()=>{
  for(const seed of [1,13]) {
    const s=contact(seed);
    const old={...s,schemaVersion:3,
      activeEncounter:((({surprise,visibility,evidenceId,...retained})=>retained)(s.activeEncounter))};
    const migrated=decodeSave(JSON.stringify(old));
    assert.equal(migrated.schemaVersion,SCHEMA_VERSION);
    assert.equal(migrated.activeEncounter.surprise,null);
    assert.deepEqual(migrated.activeEncounter.visibility,{presence:'unestablished',identity:'unestablished',distance:'unestablished'});
    assert.deepEqual(migrated.rng,s.rng);
    assert.deepEqual(adjudicate(migrated),adjudicate(s));
    assert.deepEqual(decodeSave(encodeSave(migrated)),migrated);
    for(const polluted of [{...old.activeEncounter,hidden:'leak'}, {...old.activeEncounter,visibility:{presence:'known'}}])
      assert.throws(()=>migrateSaveState({...old,activeEncounter:polluted}));
  }
  let pending=createDemoState(1);
  pending=executeProposal(pending,intent(pending,'dungeon.rest')).state;
  pending=executeProposal(pending,intent(pending,'dungeon.rest')).state;
  const legacy={...pending,schemaVersion:3};delete legacy.activeEncounter;
  assert.throws(()=>decodeSave(JSON.stringify(legacy)),'v3 must have exact activeEncounter');
  const migrated=decodeSave(JSON.stringify({...pending,schemaVersion:3}));
  assert.deepEqual(migrated.pendingEncounter,pending.pendingEncounter);
  assert.equal(migrated.activeEncounter,null);
});
test('resolved surprise survives exact save/load and deterministic future refusal without rerolls',()=>{
  const s=adjudicate(contact(25)).state;
  const reloaded=decodeSave(encodeSave(s));
  assert.deepEqual(reloaded,s);
  assert.equal(reloaded.rng.draws,5);
  assert.deepEqual(executeProposal(reloaded,intent(reloaded,'encounter.surprise')),
    executeProposal(s,intent(s,'encounter.surprise')));
});
test('malformed persisted surprise flags, outcomes, stage and player visibility are rejected',()=>{
  const s=adjudicate(contact(7)).state, a=s.activeEncounter;
  for(const patch of [
    {surprise:{...a.surprise,partyRoll:0}},
    {surprise:{...a.surprise,monsterRoll:7}},
    {surprise:{...a.surprise,monsterSurprised:false}},
    {surprise:{...a.surprise,disposition:'party-surprised'}},
    {surprise:{...a.surprise,extraDie:4}},
    {visibility:{...a.visibility,identity:'goblin'}},
    {visibility:{...a.visibility,presence:'visible'}},
    {stage:'awaiting-encounter-adjudication'},
    {surprise:null}
  ])assert.throws(()=>assertValidState({...s,activeEncounter:{...a,...patch}}));
  assert.throws(()=>decodeSave(JSON.stringify({...s,unknown:'unsupported'})));
});
test('offline surprise phrase is exact, not live natural language interpretation',()=>{
  const proposal={contract:'bx.intent.v1',baseRevision:9,operations:[{kind:'encounter.surprise'}]};
  assert.deepEqual(parseLocalIntent('adjudicate surprise',9),proposal);
  for(const text of ['adjudicate surprise with advantage','the monsters are surprised','roll surprise for goblins','resolve surprise and combat'])
    assert.equal(parseLocalIntent(text,9),null);
});