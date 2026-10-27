import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,executeProposal,assertValidState,migrateSaveState,SCHEMA_VERSION} from '../src/state/state.js';
import {decodeSave,encodeSave} from '../src/state/storage.js';
import {projectPlayerEncounterKnowledge} from '../src/state/player-knowledge.js';
import {parseLocalIntent,narrateAuthoritativeResult} from '../src/ai/contract.js';
import {getStatusModel} from '../src/ui/view.js';
import {levelOneGoblinContact} from '../src/content/encounters/level1-goblin.js';
import {clearRecognized,clearUnrecognized,obstructed} from '../src/content/encounters/public-perception.js';
import {monsterWithdrawalPursued} from '../src/content/encounters/public-pursuit.js';
import {validatePursuitEvidence} from '../src/rules/pursuit-evidence.js';
const intent=(s,k)=>({contract:'bx.intent.v1',baseRevision:s.revision,operations:[{kind:k}]});
function ready(seed=61,evidence=clearRecognized,lit=true){
  let s=createDemoState(seed);
  if(!lit)s={...s,light:{kind:'none',remainingTurns:0}};
  for(const k of ['dungeon.rest','dungeon.rest','encounter.establish','encounter.surprise']){
    const r=executeProposal(s,intent(s,k));assert.equal(r.accepted,true,k);s=r.state;
  }
  const p=executeProposal(s,intent(s,'encounter.perceive'),levelOneGoblinContact,evidence);
  assert.equal(p.accepted,true);s=p.state;
  const h=executeProposal(s,intent(s,'encounter.handoff'));
  assert.equal(h.accepted,true);return h.state;
}
const choose=(s,e=monsterWithdrawalPursued,contact=levelOneGoblinContact)=>
 executeProposal(s,intent(s,'encounter.pursuit-decision'),contact,clearRecognized,undefined,e);
test('B24 public choice records a pending encounter, not a chase or escape',()=>{
  const before=ready(),knowledge=projectPlayerEncounterKnowledge(before),r=choose(before);
  assert.equal(r.accepted,true);
  const s=r.state;assert.equal(s.schemaVersion,SCHEMA_VERSION);
  assert.equal(s.activeEncounter.stage,'awaiting-pursuit-adjudication');
  assert.deepEqual({...s.activeEncounter,stage:'awaiting-referee-continuation'},before.activeEncounter);
  assert.equal(s.lastEncounter,null);assert.equal(s.pendingEncounter,null);
  assert.deepEqual(s.rng,before.rng);assert.deepEqual(s.light,before.light);
  assert.equal(s.turns,before.turns);assert.deepEqual(s.character,before.character);
  assert.equal(s.revision,before.revision+1);assert.equal(s.journal.at(-1).kind,'encounter.pursuit-decision');
  assert.equal(s.journal.at(-1).evidenceId,monsterWithdrawalPursued.id);
  assert.deepEqual(r.outcomes,[{kind:'encounter.pursuit-decision',stage:'awaiting-referee',knowledge}]);
  assert.deepEqual(projectPlayerEncounterKnowledge(s),knowledge);
  assert.equal(getStatusModel(s).encounter,'Pursuit choice recorded · awaiting referee · Goblin visible within torchlight');
  assert.match(narrateAuthoritativeResult(r),/remains unresolved/i);
  assertValidState(s);
});
test('public fixture validates exactly with no invented combat or movement speed',()=>{
  assert.strictEqual(validatePursuitEvidence(monsterWithdrawalPursued),monsterWithdrawalPursued);
  for(const e of [null,{},true,{...monsterWithdrawalPursued,partyDecision:'wait'},
    {...monsterWithdrawalPursued,monsterDecision:'fight'},
    {...monsterWithdrawalPursued,contactId:'other'},
    {...monsterWithdrawalPursued,combatStarted:true},
    {...monsterWithdrawalPursued,rounds:1},
    {...monsterWithdrawalPursued,monsterSpeed:120},
    {...monsterWithdrawalPursued,id:'made-up'}]){
    assert.throws(()=>validatePursuitEvidence(e));
    const s=ready(),r=choose(s,e);
    assert.equal(r.accepted,false);assert.strictEqual(r.state,s);
    assert.equal(r.state.rng.draws,5);
  }
});
test('only source-backed currently visible public contact may have a pursuit choice',()=>{
  for(const [seed,e,lit,accept] of [
    [61,clearRecognized,true,true],[61,clearUnrecognized,true,true],
    [61,obstructed,true,false],[1,clearRecognized,true,false],[61,clearRecognized,false,false]
  ]){
    const s=ready(seed,e,lit),r=choose(s);assert.equal(r.accepted,accept);
    if(!accept){assert.strictEqual(r.state,s);continue;}
    assert.deepEqual(projectPlayerEncounterKnowledge(r.state),projectPlayerEncounterKnowledge(s));
    const p=JSON.stringify(r.outcomes)+narrateAuthoritativeResult(r);
    for(const privateField of ['distanceFeet','numberAppearing','monsterRoll','partyRoll','packetId',
      'evidenceId','70 feet','30 feet','two goblins'])
      assert.ok(!p.includes(privateField),privateField);
    if(e===clearUnrecognized)assert.doesNotMatch(narrateAuthoritativeResult(r),/goblin/i);
  }
});
test('no early, duplicate, stale, fabricated, or mixed-operation pursuit claims',()=>{
  let s=createDemoState(61);assert.equal(choose(s).accepted,false);
  for(const k of ['dungeon.rest','dungeon.rest','encounter.establish','encounter.surprise','encounter.perceive']){
    s=executeProposal(s,intent(s,k)).state;
    const r=choose(s);assert.equal(r.accepted,false);assert.strictEqual(r.state,s);
  }
  s=ready();
  for(const p of [
    {...intent(s,'encounter.pursuit-decision'),baseRevision:s.revision-1},
    {...intent(s,'encounter.pursuit-decision'),operations:[{kind:'encounter.pursuit-decision',caught:true}]},
    {...intent(s,'encounter.pursuit-decision'),operations:[{kind:'encounter.pursuit-decision'},{kind:'dungeon.rest'}]},
    {...intent(s,'encounter.pursuit-decision'),patch:{turns:99}},
    intent(s,'encounter.chase-auto-success')
  ]){
    const r=executeProposal(s,p);
    assert.equal(r.accepted,false);assert.strictEqual(r.state,s);
  }
  assert.equal(choose(s,monsterWithdrawalPursued,{...levelOneGoblinContact,monster:'dragon'}).accepted,false);
  const pending=choose(s).state;
  for(const k of ['encounter.pursuit-decision','encounter.conclude','encounter.conclude.monster-withdrawal',
    'dungeon.rest','encounter.handoff','diagnostic.roll','encounter.perceive','encounter.surprise']){
    const r=executeProposal(pending,intent(pending,k));
    assert.equal(r.accepted,false,k);assert.strictEqual(r.state,pending,k);
  }
});
test('pending pursuit survives full save/load and never rerolls or advances resources',()=>{
  for(const e of [clearRecognized,clearUnrecognized]){
    const s=ready(61,e),r=choose(s),restored=decodeSave(encodeSave(r.state));
    assert.deepEqual(restored,r.state);
    assert.deepEqual(projectPlayerEncounterKnowledge(restored),projectPlayerEncounterKnowledge(s));
    assert.equal(restored.rng.draws,5);
    assert.equal(restored.light.remainingTurns,4);assert.equal(restored.turns,2);
    assert.equal(choose(restored).accepted,false);
  }
});
test('v8 saves migrate to v9 without invented chase, and v8 cannot forge v9 stage or journal',()=>{
  const s=ready(),legacy={...s,schemaVersion:8};
  assert.deepEqual(decodeSave(JSON.stringify(legacy)),s);
  assert.deepEqual(choose(decodeSave(JSON.stringify(legacy))),choose(s));
  assert.throws(()=>migrateSaveState({...legacy,
    activeEncounter:{...legacy.activeEncounter,stage:'awaiting-pursuit-adjudication'}}));
  assert.throws(()=>migrateSaveState({...legacy,journal:[...legacy.journal,
    {kind:'encounter.pursuit-decision',dueTurn:3,evidenceId:monsterWithdrawalPursued.id}]}));
  const closed=executeProposal(s,intent(s,'encounter.conclude')).state;
  assert.deepEqual(decodeSave(JSON.stringify({...closed,schemaVersion:8})),closed);
});
test('forged v9 pursuit stage without exact matching terminal evidence record rejects save',()=>{
  const s=choose(ready()).state,c=s.activeEncounter;
  for(const patch of [
    {activeEncounter:{...c,stage:'encounter-ended'}},
    {activeEncounter:{...c,visibility:{presence:'unestablished',identity:'unestablished',distance:'unestablished'}}},
    {activeEncounter:{...c,evidenceId:'unrecognized-source'}},
    {journal:s.journal.slice(0,-1)},
    {journal:[...s.journal.slice(0,-1),{...s.journal.at(-1),dueTurn:5}]},
    {journal:[...s.journal.slice(0,-1),{...s.journal.at(-1),evidenceId:'fiction'}]},
    {journal:[...s.journal,{kind:'diagnostic.roll',sides:6,value:3}]},
    {activeEncounter:{...c,stage:'awaiting-referee-continuation'}},
    {privateMap:'secret'}
  ])assert.throws(()=>assertValidState({...s,...patch}));
});
test('offline command names a diagnostic public fixture, never a free-form AI referee',()=>{
  assert.deepEqual(parseLocalIntent('record public demo pursuit choice',8),
    {contract:'bx.intent.v1',baseRevision:8,operations:[{kind:'encounter.pursuit-decision'}]});
  for(const phrase of ['chase goblins','goblins run','we catch them','attack while chasing',
    'record public demo pursuit choice and win','record public demo pursuit choice now'])
    assert.equal(parseLocalIntent(phrase,8),null);
});
