import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,executeProposal,assertValidState,migrateSaveState,SCHEMA_VERSION} from '../src/state/state.js';
import {projectPlayerEncounterKnowledge} from '../src/state/player-knowledge.js';
import {encodeSave,decodeSave} from '../src/state/storage.js';
import {narrateAuthoritativeResult,parseLocalIntent} from '../src/ai/contract.js';
import {getStatusModel} from '../src/ui/view.js';
import {clearRecognized,clearUnrecognized,obstructed} from '../src/content/encounters/public-perception.js';
const intent=(state,kind)=>({contract:'bx.intent.v1',baseRevision:state.revision,operations:[{kind}]});
function perceived(seed=61,evidence=clearRecognized,light=true){
  let state=createDemoState(seed);
  if(!light)state={...state,light:{kind:'none',remainingTurns:0}};
  for(const kind of ['dungeon.rest','dungeon.rest','encounter.establish','encounter.surprise']){
    const result=executeProposal(state,intent(state,kind));
    assert.equal(result.accepted,true,kind);state=result.state;
  }
  const p=executeProposal(state,intent(state,'encounter.perceive'),undefined,evidence);
  assert.equal(p.accepted,true);return p.state;
}
const handoff=state=>executeProposal(state,intent(state,'encounter.handoff'));
const unknown={presence:'unestablished',identity:'unestablished',distance:'unestablished'};
test('handoff is a non-resolving stage-only step; all authoritative resource/time/dice/contact facts persist',()=>{
  const before=perceived(),result=handoff(before);
  assert.equal(result.accepted,true);
  const after=result.state;
  assert.equal(after.schemaVersion,SCHEMA_VERSION);
  assert.equal(after.activeEncounter.stage,'awaiting-referee-continuation');
  assert.equal(after.revision,before.revision+1);
  assert.deepEqual(after.rng,before.rng);
  assert.deepEqual(after.light,before.light);
  assert.equal(after.turns,before.turns);
  assert.deepEqual(after.character,before.character);
  assert.equal(after.pendingEncounter,null);
  assert.deepEqual({...after.activeEncounter,stage:before.activeEncounter.stage},before.activeEncounter);
  assert.deepEqual(after.journal.at(-1),{kind:'encounter.handoff',dueTurn:3});
  assertValidState(after);
});
test('player projection survives handoff with only previously established party knowledge',()=>{
  for(const [seed,evidence,light] of [
    [61,clearRecognized,true],[61,clearUnrecognized,true],
    [61,obstructed,true],[1,clearRecognized,true],[61,clearRecognized,false]
  ]){
    const before=perceived(seed,evidence,light);
    const oldKnowledge=projectPlayerEncounterKnowledge(before);
    const result=handoff(before),after=result.state;
    assert.deepEqual(projectPlayerEncounterKnowledge(after),oldKnowledge);
    assert.deepEqual(result.outcomes,[{kind:'encounter.handoff',knowledge:oldKnowledge,stage:'awaiting-referee'}]);
    for(const forbidden of ['monsterRoll','partyRoll','numberAppearing','distanceFeet','packetId','evidenceId','monsterSurprised']){
      assert.ok(!JSON.stringify(result.outcomes).includes(forbidden),forbidden);
      assert.ok(!narrateAuthoritativeResult(result).includes(forbidden),forbidden);
    }
    assert.equal(after.rng.draws,5);
  }
});
test('recognized, unrecognized, and unconfirmed sightings remain distinct in presentation',()=>{
  const scenarios=[
    [61,clearRecognized,'Awaiting referee · Goblin visible within torchlight',/goblin sighting remains established/i],
    [61,clearUnrecognized,'Awaiting referee · Creature visible within torchlight',/identity is unknown/i],
    [61,obstructed,'Awaiting referee · No confirmed sighting',/presence remains unestablished/i],
    [1,clearRecognized,'Awaiting referee · No confirmed sighting',/presence remains unestablished/i]
  ];
  for(const [seed,evidence,label,narration] of scenarios){
    const result=handoff(perceived(seed,evidence));
    assert.equal(getStatusModel(result.state).encounter,label);
    assert.match(narrateAuthoritativeResult(result),narration);
    assert.doesNotMatch(narrateAuthoritativeResult(result),/30 feet|70 feet|two goblins|monster roll/i);
  }
});
test('no premature handoff from empty, pending, contact, or unresolved surprise state',()=>{
  let s=createDemoState(61);
  let refusal=handoff(s);assert.equal(refusal.accepted,false);assert.strictEqual(refusal.state,s);
  s=executeProposal(s,intent(s,'dungeon.rest')).state;
  s=executeProposal(s,intent(s,'dungeon.rest')).state;
  refusal=handoff(s);assert.equal(refusal.accepted,false);assert.strictEqual(refusal.state,s);
  s=executeProposal(s,intent(s,'encounter.establish')).state;
  refusal=handoff(s);assert.equal(refusal.accepted,false);assert.strictEqual(refusal.state,s);
  s=executeProposal(s,intent(s,'encounter.surprise')).state;
  refusal=handoff(s);assert.equal(refusal.accepted,false);assert.strictEqual(refusal.state,s);
  assert.equal(s.rng.draws,5);
});
test('duplicate, stale, multifield and arbitrary patch requests refuse with identity state and zero RNG delta',()=>{
  const s=perceived();
  const forged=[
    {...intent(s,'encounter.handoff'),baseRevision:s.revision-1},
    {...intent(s,'encounter.handoff'),operations:[{kind:'encounter.handoff',result:'victory'}]},
    {...intent(s,'encounter.handoff'),operations:[{kind:'encounter.handoff',monstersGone:true}]},
    {...intent(s,'encounter.handoff'),operations:[{kind:'encounter.handoff'},{kind:'dungeon.rest'}]},
    {...intent(s,'encounter.handoff'),patch:{turns:999}},
    intent(s,'encounter.resolve')
  ];
  for(const proposal of forged){const result=executeProposal(s,proposal);
    assert.equal(result.accepted,false);assert.strictEqual(result.state,s);
    assert.equal(result.state.rng.draws,5);}
  const after=handoff(s).state;
  for(const kind of ['encounter.handoff','dungeon.rest','encounter.surprise','encounter.perceive','encounter.establish']){
    const result=executeProposal(after,intent(after,kind));
    assert.equal(result.accepted,false);assert.strictEqual(result.state,after);
  }
});
test('known and unestablished outcomes replay exactly across save/reload without any rerolls',()=>{
  for(const [seed,evidence] of [[61,clearRecognized],[61,clearUnrecognized],[61,obstructed],[1,clearRecognized]]){
    const before=perceived(seed,evidence);
    const input=decodeSave(encodeSave(before));
    assert.deepEqual(input,before);
    assert.deepEqual(handoff(input),handoff(before));
    const after=handoff(before).state,reloaded=decodeSave(encodeSave(after));
    assert.deepEqual(reloaded,after);
    assert.deepEqual(projectPlayerEncounterKnowledge(reloaded),projectPlayerEncounterKnowledge(before));
    assert.equal(reloaded.rng.draws,5);
  }
});
test('exact v5 saves migrate without inventing a handoff or changing established knowledge',()=>{
  const before=perceived(),old={...before,schemaVersion:5};
  const migrated=decodeSave(JSON.stringify(old));
  assert.equal(migrated.schemaVersion,SCHEMA_VERSION);
  assert.deepEqual(migrated.activeEncounter,before.activeEncounter);
  assert.deepEqual(migrated.rng,before.rng);
  assert.deepEqual(migrated.light,before.light);
  assert.deepEqual(projectPlayerEncounterKnowledge(migrated),projectPlayerEncounterKnowledge(before));
  assert.deepEqual(handoff(migrated),handoff(before));
  assert.throws(()=>migrateSaveState({...old,
    activeEncounter:{...old.activeEncounter,stage:'awaiting-referee-continuation'}}));
  assert.throws(()=>migrateSaveState({...old,journal:[...old.journal,{kind:'encounter.handoff',dueTurn:3}]}));
  const empty=createDemoState(61);
  const oldEmpty={...empty,schemaVersion:5};
  assert.deepEqual(decodeSave(JSON.stringify(oldEmpty)),empty);
});
test('forged stage, knowledge, journal, or encounter completion in persisted state fails closed',()=>{
  const after=handoff(perceived()).state,a=after.activeEncounter;
  const tampered=[
    {activeEncounter:{...a,visibility:{...a.visibility,identity:'dragon'}}},
    {activeEncounter:{...a,visibility:{...a.visibility,distance:'30 feet'}}},
    {activeEncounter:{...a,evidenceId:'secret-map'}},
    {activeEncounter:{...a,stage:'encounter-complete'}},
    {activeEncounter:{...a,surprise:null}},
    {pendingEncounter:{kind:'wandering',dueTurn:3}},
    {journal:[...after.journal,{kind:'encounter.handoff',dueTurn:999}]},
    {unexpectedPrivateFacts:'hidden loot'}
  ];
  for(const patch of tampered)assert.throws(()=>assertValidState({...after,...patch}));
});
test('public projection for no contact or earlier stages does not manufacture facts',()=>{
  const initial=createDemoState(61);
  assert.deepEqual(projectPlayerEncounterKnowledge(initial),{partySurprised:null,visibility:unknown});
  const previous=perceived(61);
  assert.equal(projectPlayerEncounterKnowledge(previous).partySurprised,previous.activeEncounter.surprise.partySurprised);
  assert.deepEqual(projectPlayerEncounterKnowledge(previous).visibility,{presence:'visible',identity:'goblin',distance:'within-torchlight'});
});
test('handoff remains an exact offline whitelist command rather than a freeform AI referee',()=>{
  assert.deepEqual(parseLocalIntent('handoff encounter',9),
    {contract:'bx.intent.v1',baseRevision:9,operations:[{kind:'encounter.handoff'}]});
  for(const phrase of ['handoff encounter and win','close encounter','handoff encounter with treasure',
    'fight the goblins','declare monster fleeing','end encounter','handoff encounter now'])
    assert.equal(parseLocalIntent(phrase,9),null);
});
