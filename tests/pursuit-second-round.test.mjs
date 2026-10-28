import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,executeProposal,assertValidState,migrateSaveState,SCHEMA_VERSION} from '../src/state/state.js';
import {encodeSave,decodeSave} from '../src/state/storage.js';
import {projectPlayerEncounterKnowledge} from '../src/state/player-knowledge.js';
import {parseLocalIntent,narrateAuthoritativeResult} from '../src/ai/contract.js';
import {getStatusModel} from '../src/ui/view.js';
import {publicSecondPursuitRound,validateSecondPursuitRound} from '../src/rules/pursuit-second-round.js';
import {publicFirstPursuitRound} from '../src/rules/pursuit-first-round.js';
import {publicCorridorRouteEvidence} from '../src/rules/pursuit-route.js';
const op=(s,k)=>({contract:'bx.intent.v1',baseRevision:s.revision,operations:[{kind:k}]});
const sequence=['dungeon.rest','dungeon.rest','encounter.establish',
  'encounter.surprise','encounter.perceive','encounter.handoff',
  'encounter.pursuit-decision','encounter.pursuit-rate-review',
  'encounter.party-load-establish','encounter.pursuit-round-budget-review',
  'encounter.pursuit-route-establish','encounter.pursuit-first-round'];
function ready(seed=61){
 let s=createDemoState(seed);
 for(const k of sequence){const r=executeProposal(s,op(s,k));assert.equal(r.accepted,true,k);s=r.state;}
 return s;
}
const advance=(s,w=publicSecondPursuitRound)=>
 executeProposal(s,op(s,'encounter.pursuit-second-round'),...Array(9).fill(undefined),w);
test('new second-round witness is original independent decision, not an extrapolated move',()=>{
 const w=publicSecondPursuitRound;
 assert.ok(Object.isFrozen(w));
 assert.match(w.source,/Original public second-round scene witness/);
 assert.equal(w.partyDecision,'continue-paced-running');
 assert.equal(w.monsterDecision,'continue-withdrawal-running');
 assert.equal(w.priorRoundId,publicFirstPursuitRound.id);
 assert.equal(w.routeId,publicCorridorRouteEvidence.id);
 assert.equal(w.encounterRound,2);
 assert.equal(w.roundSeconds,10);
 assert.equal(w.totalEncounterSeconds,20);
 assert.equal(w.partyMoveFeet,60);assert.equal(w.monsterMoveFeet,60);
 assert.equal(w.fullClearRouteThroughFeet,180);
 assert.equal(w.continuousStraightSight,true);
 assert.equal(w.intermediateObstacles,false);
 assert.equal(w.turnOrDoorwayDuringRound,false);
 assert.equal(w.captureOrEscape,'unresolved');
});
test('second round keeps true seeded separation, within public 180-foot corridor',()=>{
 const s=ready(),d=validateSecondPursuitRound(publicSecondPursuitRound,s.activeEncounter,s.light);
 assert.equal(d.partyPositionFeet,120);
 assert.equal(d.monsterPositionFeet,120+s.activeEncounter.distanceFeet);
 assert.equal(d.separationFeet,s.activeEncounter.distanceFeet);
 assert.equal(d.sightAfter,'visible');
 assert.ok(d.monsterPositionFeet<=180);
 for(const initial of [20,30]){
  const x=validateSecondPursuitRound(publicSecondPursuitRound,
   {...s.activeEncounter,distanceFeet:initial},s.light);
  assert.equal(x.partyPositionFeet,120);
  assert.equal(x.monsterPositionFeet,120+initial);
  assert.equal(x.separationFeet,initial);
 }
 for(const initial of [0,10,31,40,100,120,undefined,null,NaN]){
   assert.throws(()=>validateSecondPursuitRound(publicSecondPursuitRound,
    {...s.activeEncounter,distanceFeet:initial},s.light));
 }
 assert.throws(()=>validateSecondPursuitRound(publicSecondPursuitRound,
   s.activeEncounter,{kind:'none',remainingTurns:0}));
});
test('independent next-round witness rejects fake position, obscured sight, extra time and catch',()=>{
 const s=ready(),w=publicSecondPursuitRound;
 for(const forged of [null,{},false,
  {...w,encounterRound:1},{...w,encounterRound:3},
  {...w,partyMoveFeet:120},{...w,monsterMoveFeet:120},
  {...w,fullClearRouteThroughFeet:120},{...w,continuousStraightSight:false},
  {...w,intermediateObstacles:true},{...w,turnOrDoorwayDuringRound:true},
  {...w,lightRemainsLit:false},{...w,totalEncounterSeconds:600},
  {...w,captureOrEscape:'captured'},
  {...w,priorRoundId:'no-evidence'},
  {...w,secretMonsterPositionFeet:150}]){
  assert.throws(()=>validateSecondPursuitRound(forged,s.activeEncounter,s.light));
  const r=advance(s,forged);
  assert.equal(r.accepted,false);
  assert.strictEqual(r.state,s);
 }
});
test('exact second round moves both parties and advances encounter seconds, not torch or turn',()=>{
 const before=ready(),oldKnowledge=projectPlayerEncounterKnowledge(before),r=advance(before);
 assert.equal(r.accepted,true);
 const s=r.state;assert.equal(s.schemaVersion,SCHEMA_VERSION);
 assert.equal(s.activeEncounter.stage,'awaiting-third-pursuit-round-boundary');
 assert.deepEqual({...s.activeEncounter,stage:before.activeEncounter.stage},before.activeEncounter);
 assert.equal(s.turns,2);assert.equal(s.light.remainingTurns,4);
 assert.deepEqual(s.rng,before.rng);assert.deepEqual(s.character,before.character);
 assert.equal(s.lastEncounter,null);assert.equal(s.pendingEncounter,null);
 assert.deepEqual(projectPlayerEncounterKnowledge(s),oldKnowledge);
 assert.equal(s.revision,before.revision+1);
 assert.deepEqual(s.journal.at(-1),{
   kind:'encounter.pursuit-second-round',dueTurn:s.activeEncounter.dueTurn,
   evidenceId:publicSecondPursuitRound.id,round:2,elapsedSeconds:10,
   totalEncounterSeconds:20,partyMoveFeet:60,monsterMoveFeet:60,
   sightAfter:'visible',result:'unresolved'
 });
 assert.deepEqual(r.outcomes,[{
   kind:'encounter.pursuit-second-round',round:2,elapsedSeconds:20,
   partyMoveFeet:60,sightAfter:'visible',result:'unresolved',knowledge:oldKnowledge
 }]);
 assert.equal(getStatusModel(s).encounter,'Pursuit round 2 recorded · corridor end awaits referee');
 const narrative=narrateAuthoritativeResult(r);
 assert.match(narrative,/second independently witnessed ten-second running round/i);
 assert.match(narrative,/twenty encounter seconds/i);
 assert.match(narrative,/still visible/i);
 assert.match(narrative,/corridor end now requires further adjudication/i);
 assert.doesNotMatch(narrative,/goblin|monsterPositionFeet|caught|escaped/i);
 assertValidState(s);
});
test('second round demands an accepted first round, cannot run twice or bypass turn boundary',()=>{
 let s=createDemoState(61);assert.equal(advance(s).accepted,false);
 for(const k of sequence.slice(0,-1)){
  s=executeProposal(s,op(s,k)).state;
  const r=advance(s);assert.equal(r.accepted,false,k);assert.strictEqual(r.state,s);
 }
 s=ready();
 for(const p of [
  {...op(s,'encounter.pursuit-second-round'),baseRevision:s.revision-1},
  {...op(s,'encounter.pursuit-second-round'),operations:[{kind:'encounter.pursuit-second-round',caught:true}]},
  {...op(s,'encounter.pursuit-second-round'),operations:[{kind:'encounter.pursuit-second-round'},{kind:'dungeon.rest'}]},
  {...op(s,'encounter.pursuit-second-round'),patch:{turns:999}}
 ]){
  const r=executeProposal(s,p);assert.equal(r.accepted,false);assert.strictEqual(r.state,s);
 }
 const after=advance(s).state;
 for(const k of ['encounter.pursuit-second-round','encounter.pursuit-first-round',
   'dungeon.rest','diagnostic.roll','encounter.conclude',
   'encounter.conclude.monster-withdrawal','encounter.pursuit-route-establish']){
  const r=executeProposal(after,op(after,k));assert.equal(r.accepted,false,k);
  assert.strictEqual(r.state,after);assert.deepEqual(r.state.rng,after.rng);
 }
});
test('v14 history migrates without second-round claim; v15 saves reject forged records',()=>{
 const before=ready(),old={...before,schemaVersion:14};
 assert.deepEqual(decodeSave(JSON.stringify(old)),before);
 const after=advance(before).state;
 assert.deepEqual(decodeSave(encodeSave(after)),after);
 assert.throws(()=>migrateSaveState({...after,schemaVersion:14}));
 assert.throws(()=>migrateSaveState({...old,
   activeEncounter:{...old.activeEncounter,stage:'awaiting-third-pursuit-round-boundary'}}));
 for(const patch of [
  {activeEncounter:{...after.activeEncounter,stage:'awaiting-second-pursuit-round-evidence'}},
  {activeEncounter:{...after.activeEncounter,visibility:{presence:'unestablished'}}},
  {journal:after.journal.slice(0,-1)},
  {journal:[...after.journal.slice(0,-1),{...after.journal.at(-1),round:3}]},
  {journal:[...after.journal.slice(0,-1),{...after.journal.at(-1),totalEncounterSeconds:30}]},
  {journal:[...after.journal.slice(0,-1),{...after.journal.at(-1),monsterMoveFeet:120}]},
  {journal:[...after.journal.slice(0,-1),{...after.journal.at(-1),secretPosition:150}]},
  {journal:[...after.journal,{kind:'diagnostic.roll',sides:6,value:2}]},
  {realTimeSeconds:20}
 ])assert.throws(()=>assertValidState({...after,...patch}));
});
test('one exact offline second round command; no freeform monster AI',()=>{
 assert.deepEqual(parseLocalIntent('advance public demo second pursuit round',13),
   {contract:'bx.intent.v1',baseRevision:13,operations:[{kind:'encounter.pursuit-second-round'}]});
 for(const p of ['advance public demo second pursuit round now',
   'catch them','run 120 feet','run into the goblins','advance public demo second pursuit round and catch'])
   assert.equal(parseLocalIntent(p,13),null);
});
