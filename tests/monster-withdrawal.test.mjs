import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,executeProposal,assertValidState,migrateSaveState,SCHEMA_VERSION} from '../src/state/state.js';
import {decodeSave,encodeSave} from '../src/state/storage.js';
import {projectPlayerEncounterKnowledge} from '../src/state/player-knowledge.js';
import {getStatusModel} from '../src/ui/view.js';
import {parseLocalIntent,narrateAuthoritativeResult} from '../src/ai/contract.js';
import {unpursuedWithdrawal,monsterWithdrawalUnpursued} from '../src/content/encounters/public-disposition.js';
import {validateDispositionEvidence,dispositionForEvidenceId} from '../src/rules/disposition-evidence.js';
import {clearRecognized,clearUnrecognized,obstructed} from '../src/content/encounters/public-perception.js';
import {levelOneGoblinContact} from '../src/content/encounters/level1-goblin.js';
const op=(s,kind)=>({contract:'bx.intent.v1',baseRevision:s.revision,operations:[{kind}]});
function ready(seed=61,evidence=clearRecognized,lit=true) {
  let s=createDemoState(seed);
  if(!lit)s={...s,light:{kind:'none',remainingTurns:0}};
  for(const kind of ['dungeon.rest','dungeon.rest','encounter.establish','encounter.surprise']) {
    const r=executeProposal(s,op(s,kind));assert.equal(r.accepted,true,kind);s=r.state;
  }
  let r=executeProposal(s,op(s,'encounter.perceive'),levelOneGoblinContact,evidence);
  assert.equal(r.accepted,true);s=r.state;
  r=executeProposal(s,op(s,'encounter.handoff'));assert.equal(r.accepted,true);
  return r.state;
}
const close=(s,kind='encounter.conclude.monster-withdrawal',evidence=undefined)=>
  executeProposal(s,op(s,kind),levelOneGoblinContact,clearRecognized,evidence);
test('Moldvay B24 monster withdrawal without party pursuit has independent authored facts',()=>{
  assert.equal(monsterWithdrawalUnpursued.monsterDecision,'withdraw');
  assert.equal(monsterWithdrawalUnpursued.partyPursues,false);
  assert.equal(monsterWithdrawalUnpursued.combatStarted,false);
  assert.equal(monsterWithdrawalUnpursued.rounds,1);
  assert.equal(validateDispositionEvidence(monsterWithdrawalUnpursued),monsterWithdrawalUnpursued);
  assert.equal(validateDispositionEvidence(unpursuedWithdrawal),unpursuedWithdrawal);
  assert.equal(dispositionForEvidenceId(monsterWithdrawalUnpursued.id),'monsters-withdrew-unpursued');
  assert.equal(dispositionForEvidenceId(unpursuedWithdrawal.id),'party-withdrew-unpursued');
  assert.equal(dispositionForEvidenceId('unsupported'),null);
});
test('independent monster withdrawal consumes the scheduled single turn and preserves all prior knowledge',()=>{
  const before=ready(),known=projectPlayerEncounterKnowledge(before),result=close(before);
  assert.equal(result.accepted,true);
  const s=result.state;
  assert.equal(s.schemaVersion,SCHEMA_VERSION);
  assert.equal(s.turns,3);assert.equal(s.revision,before.revision+1);
  assert.deepEqual(s.rng,before.rng);assert.deepEqual(s.light,{kind:'torch',remainingTurns:3});
  assert.deepEqual(s.character,before.character);
  assert.equal(s.activeEncounter,null);assert.equal(s.pendingEncounter,null);
  assert.equal(s.lastEncounter.sourceId,monsterWithdrawalUnpursued.id);
  assert.equal(s.lastEncounter.disposition,'monsters-withdrew-unpursued');
  assert.deepEqual(s.lastEncounter.contact,before.activeEncounter);
  assert.deepEqual(s.lastEncounter.lightBefore,before.light);
  assert.deepEqual(projectPlayerEncounterKnowledge(s),known);
  assert.deepEqual(result.outcomes[0].knowledge,known);
  assert.equal(s.journal.at(-1).disposition,'monsters-withdrew-unpursued');
  assert.equal(getStatusModel(s).encounter,'Concluded · creatures withdrew');
  assert.match(narrateAuthoritativeResult(result),/creatures withdraw; the party does not pursue/);
  assert.doesNotMatch(narrateAuthoritativeResult(result),/goblin|30 feet|monster roll/i);
  assertValidState(s);
});
test('both disposition types remain distinct and resume the same B53 check on next even turn',()=>{
  for(const kind of ['encounter.conclude','encounter.conclude.monster-withdrawal']){
    const s=ready(),closed=close(s,kind);
    assert.equal(closed.accepted,true);
    assert.equal(closed.state.turns,3);
    assert.equal(closed.state.rng.draws,5);
    const resumed=executeProposal(closed.state,op(closed.state,'dungeon.rest'));
    assert.equal(resumed.accepted,true);
    assert.equal(resumed.state.turns,4);
    assert.equal(resumed.state.rng.draws,6);
    assert.equal(resumed.state.light.remainingTurns,2);
    assert.equal(resumed.state.lastEncounter.disposition,closed.state.lastEncounter.disposition);
    assert.deepEqual(decodeSave(encodeSave(resumed.state)),resumed.state);
  }
});
test('unsupported evidence and wrong-side evidence cannot be exchanged, injected or overridden',()=>{
  const s=ready();
  for(const [kind,packet] of [
    ['encounter.conclude.monster-withdrawal',unpursuedWithdrawal],
    ['encounter.conclude',monsterWithdrawalUnpursued],
    ['encounter.conclude.monster-withdrawal',null],
    ['encounter.conclude.monster-withdrawal',{}],
    ['encounter.conclude.monster-withdrawal',{...monsterWithdrawalUnpursued,partyPursues:true}],
    ['encounter.conclude.monster-withdrawal',{...monsterWithdrawalUnpursued,monsterDecision:'fight'}],
    ['encounter.conclude.monster-withdrawal',{...monsterWithdrawalUnpursued,rounds:61}],
    ['encounter.conclude.monster-withdrawal',{...monsterWithdrawalUnpursued,combatStarted:true}],
    ['encounter.conclude.monster-withdrawal',{...monsterWithdrawalUnpursued,hiddenTreasure:100}],
    ['encounter.conclude.monster-withdrawal',{...monsterWithdrawalUnpursued,contactId:'different'}]
  ]){
    const r=close(s,kind,packet);
    assert.equal(r.accepted,false);assert.strictEqual(r.state,s);
    assert.equal(r.state.rng.draws,s.rng.draws);
  }
  const forged=[
    {...op(s,'encounter.conclude.monster-withdrawal'),baseRevision:s.revision-1},
    {...op(s,'encounter.conclude.monster-withdrawal'),operations:[{kind:'encounter.conclude.monster-withdrawal',partyPursues:false}]},
    {...op(s,'encounter.conclude.monster-withdrawal'),operations:[{kind:'encounter.conclude.monster-withdrawal'},{kind:'dungeon.rest'}]},
    {...op(s,'encounter.conclude.monster-withdrawal'),patch:{hp:1000}}
  ];
  for(const p of forged){const r=executeProposal(s,p);assert.equal(r.accepted,false);assert.strictEqual(r.state,s);}
  const done=close(s).state;
  for(const kind of ['encounter.conclude.monster-withdrawal','encounter.conclude','encounter.handoff']){
    const r=executeProposal(done,op(done,kind));assert.equal(r.accepted,false);assert.strictEqual(r.state,done);
  }
});
test('all recorded party perception cases remain separate from independent monster-withdrawal resolution',()=>{
  for(const [seed,ev,lit] of [[61,clearRecognized,true],[61,clearUnrecognized,true],
    [61,obstructed,true],[1,clearRecognized,true],[61,clearRecognized,false]]){
    const before=ready(seed,ev,lit),known=projectPlayerEncounterKnowledge(before);
    const r=close(before);
    assert.equal(r.accepted,true);
    assert.deepEqual(projectPlayerEncounterKnowledge(r.state),known);
    const publicOutput=JSON.stringify(r.outcomes)+narrateAuthoritativeResult(r);
    for(const denied of ['monsterRoll','partyRoll','distanceFeet','numberAppearing',
      'packetId','sourceId','evidenceId','70 feet','30 feet','two goblins'])
      assert.ok(!publicOutput.includes(denied),denied);
    assert.deepEqual(decodeSave(encodeSave(r.state)),r.state);
    assert.equal(r.state.light.remainingTurns,lit?3:0);
  }
});
test('exact v7 old concluded save migrates without altering fate, and rejects v8-only fake monster withdrawal',()=>{
  const s=close(ready(),'encounter.conclude').state;
  const historical={...s,schemaVersion:7};
  const migrated=decodeSave(JSON.stringify(historical));
  assert.equal(migrated.schemaVersion,10);
  assert.deepEqual(migrated.lastEncounter,s.lastEncounter);
  assert.deepEqual(migrated.rng,s.rng);assert.deepEqual(migrated.light,s.light);
  assert.deepEqual(projectPlayerEncounterKnowledge(migrated),projectPlayerEncounterKnowledge(s));
  assert.deepEqual(decodeSave(encodeSave(migrated)),migrated);
  const forged=close(ready()).state;
  assert.throws(()=>migrateSaveState({...forged,schemaVersion:7}));
  assert.throws(()=>migrateSaveState({...historical,
    journal:[...historical.journal,{kind:'encounter.closed',turn:3,disposition:'monsters-withdrew-unpursued'}]}));
  assert.throws(()=>migrateSaveState({...historical,
    lastEncounter:{...historical.lastEncounter,disposition:'monsters-withdrew-unpursued'}}));
});
test('archived monster-withdrawal tampering is detected in current save schema',()=>{
  const s=close(ready()).state,a=s.lastEncounter;
  for(const mod of [
    {lastEncounter:{...a,sourceId:unpursuedWithdrawal.id}},
    {lastEncounter:{...a,disposition:'party-withdrew-unpursued'}},
    {lastEncounter:{...a,closedTurn:999}},
    {lastEncounter:{...a,contact:{...a.contact,stage:'combat'}}},
    {lastEncounter:{...a,lightBefore:{kind:'torch',remainingTurns:0}}},
    {lastEncounter:{...a,extra:'secret'}},
    {journal:[...s.journal,{kind:'encounter.closed',turn:999,disposition:'monsters-withdrew-unpursued'}]}
  ])assert.throws(()=>assertValidState({...s,...mod}));
});
test('exact offline command is not a general monster movement or AI authorization',()=>{
  assert.deepEqual(parseLocalIntent('resolve public demo monster withdrawal',9),
    {contract:'bx.intent.v1',baseRevision:9,operations:[{kind:'encounter.conclude.monster-withdrawal'}]});
  for(const prompt of ['goblins flee','monster runs away','the party gives chase',
    'resolve public demo monster withdrawal and take treasure','resolve public demo monster withdrawal now'])
    assert.equal(parseLocalIntent(prompt,9),null);
});
