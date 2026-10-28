import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,executeProposal,assertValidState,migrateSaveState,SCHEMA_VERSION} from '../src/state/state.js';
import {decodeSave,encodeSave} from '../src/state/storage.js';
import {parseLocalIntent,narrateAuthoritativeResult} from '../src/ai/contract.js';
import {getStatusModel} from '../src/ui/view.js';
import {projectPlayerEncounterKnowledge} from '../src/state/player-knowledge.js';
import {publicFirstPursuitRound,validateFirstPursuitRound} from '../src/rules/pursuit-first-round.js';
import {publicCorridorRouteEvidence} from '../src/rules/pursuit-route.js';
import {canonicalPartyLoad} from '../src/rules/equipment-evidence.js';
const op=(s,kind)=>({contract:'bx.intent.v1',baseRevision:s.revision,operations:[{kind}]});
const sequence=['dungeon.rest','dungeon.rest','encounter.establish',
 'encounter.surprise','encounter.perceive','encounter.handoff',
 'encounter.pursuit-decision','encounter.pursuit-rate-review',
 'encounter.party-load-establish','encounter.pursuit-round-budget-review',
 'encounter.pursuit-route-establish'];
function ready(seed=61){
  let s=createDemoState(seed);
  for(const k of sequence){const r=executeProposal(s,op(s,k));
    assert.equal(r.accepted,true,k);s=r.state;}
  return s;
}
const advance=(s,w=publicFirstPursuitRound)=>
 executeProposal(s,op(s,'encounter.pursuit-first-round'),undefined,undefined,undefined,
   undefined,undefined,undefined,undefined,undefined,w);
test('original public action witness selects safe slower pursuit pace under B19/B24',()=>{
 const w=publicFirstPursuitRound;
 assert.ok(Object.isFrozen(w));
 assert.match(w.source,/Original public corridor action witness/);
 assert.equal(w.partyDecision,'run-matching-evader-pace');
 assert.equal(w.monsterDecision,'continue-withdrawal-running');
 assert.equal(w.partyMoveFeet,60);
 assert.equal(w.monsterMoveFeet,60);
 assert.ok(w.partyMoveFeet<=canonicalPartyLoad.runningFeetPerRound);
 assert.equal(w.verifiedClearSpanFeet,120);
 assert.equal(w.intermediateObstacles,false);
 assert.equal(w.turnOrDoorwayDuringRound,false);
 assert.equal(w.fullSpanClearSight,true);
 assert.equal(w.encounterRound,1);
 assert.equal(w.secondsElapsed,10);
 assert.equal(w.captureOrEscape,'unresolved');
 assert.equal(w.actualMovement,true);
});
test('first round derives positions from existing authoritative contact, with no arbitrary map distance',()=>{
 const s=ready(),derived=validateFirstPursuitRound(publicFirstPursuitRound,s.activeEncounter,s.light);
 assert.strictEqual(derived.evidence,publicFirstPursuitRound);
 assert.equal(derived.partyPositionFeet,60);
 assert.equal(derived.monsterPositionFeet,s.activeEncounter.distanceFeet+60);
 assert.equal(derived.separationFeet,s.activeEncounter.distanceFeet);
 assert.equal(derived.sightAfter,'visible');
 for(const initial of [20,30]){
  const contact={...s.activeEncounter,distanceFeet:initial};
  const d=validateFirstPursuitRound(publicFirstPursuitRound,contact,s.light);
  assert.equal(d.separationFeet,initial);
  assert.ok(d.monsterPositionFeet<=90);
 }
 for(const distance of [0,10,31,40,100,120,undefined,NaN]){
  assert.throws(()=>validateFirstPursuitRound(publicFirstPursuitRound,
    {...s.activeEncounter,distanceFeet:distance},s.light));
 }
 assert.throws(()=>validateFirstPursuitRound(publicFirstPursuitRound,
   {...s.activeEncounter,visibility:{presence:'unestablished'}},s.light));
 assert.throws(()=>validateFirstPursuitRound(publicFirstPursuitRound,
   s.activeEncounter,{kind:'none',remainingTurns:0}));
});
test('independent action evidence rejects forged speed, lighting, geography and outcome',()=>{
 const s=ready(),w=publicFirstPursuitRound;
 for(const evidence of [null,{},false,
   {...w,partyMoveFeet:120},{...w,monsterMoveFeet:120},
   {...w,verifiedClearSpanFeet:60},{...w,fullSpanClearSight:false},
   {...w,intermediateObstacles:true},{...w,turnOrDoorwayDuringRound:true},
   {...w,lightRemainsLit:false},{...w,partyDecision:'catch'},
   {...w,monsterDecision:'stop-to-fight'},{...w,encounterRound:2},
   {...w,secondsElapsed:60},{...w,actualMovement:false},
   {...w,captureOrEscape:'captured'},
   {...w,secretGoblinPosition:90}]) {
    assert.throws(()=>validateFirstPursuitRound(evidence,s.activeEncounter,s.light));
    const r=advance(s,evidence);
    assert.equal(r.accepted,false);assert.strictEqual(r.state,s);
 }
});
test('first pursuit round advances encounter-only seconds/movement, not dungeon turn/light',()=>{
 const before=ready(),priorKnowledge=projectPlayerEncounterKnowledge(before),r=advance(before);
 assert.equal(r.accepted,true);
 const s=r.state;assert.equal(s.schemaVersion,SCHEMA_VERSION);
 assert.equal(s.activeEncounter.stage,'awaiting-second-pursuit-round-evidence');
 assert.deepEqual({...s.activeEncounter,stage:before.activeEncounter.stage},before.activeEncounter);
 assert.equal(s.revision,before.revision+1);
 assert.equal(s.turns,2);assert.equal(s.light.remainingTurns,4);
 assert.deepEqual(s.rng,before.rng);assert.deepEqual(s.character,before.character);
 assert.equal(s.lastEncounter,null);assert.equal(s.pendingEncounter,null);
 assert.deepEqual(projectPlayerEncounterKnowledge(s),priorKnowledge);
 assert.deepEqual(s.journal.at(-1),{
  kind:'encounter.pursuit-first-round',dueTurn:s.activeEncounter.dueTurn,
  evidenceId:publicFirstPursuitRound.id,round:1,elapsedSeconds:10,
  partyMoveFeet:60,monsterMoveFeet:60,sightAfter:'visible',result:'unresolved'
 });
 assert.deepEqual(r.outcomes,[{
  kind:'encounter.pursuit-first-round',round:1,elapsedSeconds:10,
  partyMoveFeet:60,sightAfter:'visible',result:'unresolved',knowledge:priorKnowledge
 }]);
 assert.equal(getStatusModel(s).encounter,
  'Pursuit round 1 recorded · target still visible · unresolved');
 const narration=narrateAuthoritativeResult(r);
 assert.match(narration,/ten-second pursuit round/);
 assert.match(narration,/each travel 60 feet/);
 assert.match(narration,/creature remains visible/);
 assert.match(narration,/chase is still unresolved/);
 for(const secret of ['goblin','distanceFeet','monsterPositionFeet','privateMap'])
  assert.ok(!narration.includes(secret));
 assertValidState(s);
});
test('round operation cannot run early, duplicate, fabricate or change another action',()=>{
 let s=createDemoState(61);
 assert.equal(advance(s).accepted,false);
 for(const k of sequence.slice(0,-1)){
   const r=executeProposal(s,op(s,k));assert.equal(r.accepted,true,k);s=r.state;
   const premature=advance(s);assert.equal(premature.accepted,false);
   assert.strictEqual(premature.state,s);
 }
 s=ready();
 for(const proposal of [
  {...op(s,'encounter.pursuit-first-round'),baseRevision:s.revision-1},
  {...op(s,'encounter.pursuit-first-round'),operations:[{kind:'encounter.pursuit-first-round',moves:120}]},
  {...op(s,'encounter.pursuit-first-round'),operations:[{kind:'encounter.pursuit-first-round'},{kind:'dungeon.rest'}]},
  {...op(s,'encounter.pursuit-first-round'),patch:{light:{remainingTurns:0}}}
 ]){
  const r=executeProposal(s,proposal);assert.equal(r.accepted,false);
  assert.strictEqual(r.state,s);
 }
 const after=advance(s).state;
 for(const k of ['encounter.pursuit-first-round','dungeon.rest','diagnostic.roll',
    'encounter.conclude','encounter.conclude.monster-withdrawal',
    'encounter.pursuit-route-establish','encounter.pursuit-decision']){
  const r=executeProposal(after,op(after,k));
  assert.equal(r.accepted,false,k);assert.strictEqual(r.state,after);
 }
});
test('v13 exact save migration and v14 sealed event / stage',()=>{
 const before=ready(),legacy={...before,schemaVersion:13};
 assert.deepEqual(decodeSave(JSON.stringify(legacy)),before);
 const after=advance(before).state;
 assert.deepEqual(decodeSave(encodeSave(after)),after);
 assert.throws(()=>migrateSaveState({...after,schemaVersion:13}));
 assert.throws(()=>migrateSaveState({...legacy,
  activeEncounter:{...legacy.activeEncounter,stage:'awaiting-second-pursuit-round-evidence'}}));
 for(const patch of [
  {activeEncounter:{...after.activeEncounter,stage:'awaiting-first-pursuit-round-evidence'}},
  {activeEncounter:{...after.activeEncounter,visibility:{presence:'unestablished'}}},
  {journal:after.journal.slice(0,-1)},
  {journal:[...after.journal.slice(0,-1),{...after.journal.at(-1),round:2}]},
  {journal:[...after.journal.slice(0,-1),{...after.journal.at(-1),elapsedSeconds:60}]},
  {journal:[...after.journal.slice(0,-1),{...after.journal.at(-1),monsterMoveFeet:120}]},
  {journal:[...after.journal.slice(0,-1),{...after.journal.at(-1),secretCoords:80}]},
  {journal:[...after.journal,{kind:'diagnostic.roll',sides:6,value:2}]},
  {realTimeSeconds:10}
 ]) assert.throws(()=>assertValidState({...after,...patch}));
});
test('offline command remains exact; no freeform AI movement',()=>{
 assert.deepEqual(parseLocalIntent('advance public demo first pursuit round',12),
  {contract:'bx.intent.v1',baseRevision:12,operations:[{kind:'encounter.pursuit-first-round'}]});
 for(const phrase of ['run as fast as possible','advance public demo first pursuit round now',
  'advance public demo first pursuit round and catch','catch goblin','fight while running'])
  assert.equal(parseLocalIntent(phrase,12),null);
});
