import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,executeProposal,assertValidState,migrateSaveState,SCHEMA_VERSION} from '../src/state/state.js';
import {encodeSave,decodeSave} from '../src/state/storage.js';
import {projectPlayerEncounterKnowledge} from '../src/state/player-knowledge.js';
import {parseLocalIntent,narrateAuthoritativeResult} from '../src/ai/contract.js';
import {getStatusModel} from '../src/ui/view.js';
import {publicCorridorRouteEvidence,validatePublicCorridorRouteEvidence} from '../src/rules/pursuit-route.js';
import {levelOneGoblinContact} from '../src/content/encounters/level1-goblin.js';
const op=(s,k)=>({contract:'bx.intent.v1',baseRevision:s.revision,operations:[{kind:k}]});
function awaitingRoute(seed=61){
 let s=createDemoState(seed);
 for(const k of ['dungeon.rest','dungeon.rest','encounter.establish','encounter.surprise',
 'encounter.perceive','encounter.handoff','encounter.pursuit-decision',
 'encounter.pursuit-rate-review','encounter.party-load-establish','encounter.pursuit-round-budget-review']){
   const r=executeProposal(s,op(s,k));assert.equal(r.accepted,true,k);s=r.state;
 }
 return s;
}
const establish=(s,route=publicCorridorRouteEvidence,contact=levelOneGoblinContact)=>
 executeProposal(s,op(s,'encounter.pursuit-route-establish'),contact,undefined,undefined,
   undefined,undefined,undefined,undefined,route);
test('original authored public corridor is not a claim of official B/X map geography',()=>{
 const e=publicCorridorRouteEvidence;
 assert.equal(e.format,'bx.public-pursuit-route.v1');
 assert.equal(e.corridorLengthFeet,180);
 assert.equal(e.partyAnchorFeet,0);
 assert.equal(e.monsterAnchor,'encounter-distance-from-party');
 assert.equal(e.corridorShape,'straight');
 assert.equal(e.obstaclesAtDecision,'none-authored');
 assert.equal(e.sightAtDecision,'requires-existing-visibility');
 assert.equal(e.sightAfterMovement,'unestablished');
 assert.equal(e.roundsElapsed,0);
 assert.equal(e.movementApplied,false);
 assert.equal(e.chaseOutcome,'unresolved');
 assert.match(e.source,/Original authored demo corridor/);
 assert.ok(Object.isFrozen(e));
});
test('corridor validator reconciles map with real authoritative encounter distance but never fabricates it',()=>{
 const s=awaitingRoute();
 const d=validatePublicCorridorRouteEvidence(publicCorridorRouteEvidence,s.activeEncounter);
 assert.strictEqual(d.evidence,publicCorridorRouteEvidence);
 assert.equal(d.initialSeparationFeet,s.activeEncounter.distanceFeet);
 assert.ok(d.initialSeparationFeet>=20&&d.initialSeparationFeet<=120);
 for(const gap of [20,30,40,50,60,70,80,90,100,110,120]){
   const e={...s.activeEncounter,distanceFeet:gap};
   assert.equal(validatePublicCorridorRouteEvidence(publicCorridorRouteEvidence,e).initialSeparationFeet,gap);
 }
 for(const gap of [0,10,15,125,130,180,null,undefined,NaN]) {
   assert.throws(()=>validatePublicCorridorRouteEvidence(publicCorridorRouteEvidence,
     {...s.activeEncounter,distanceFeet:gap}));
 }
 assert.throws(()=>validatePublicCorridorRouteEvidence(publicCorridorRouteEvidence,
     {...s.activeEncounter,visibility:{presence:'unestablished'}}));
 assert.throws(()=>validatePublicCorridorRouteEvidence(publicCorridorRouteEvidence,
     {...s.activeEncounter,packetId:'somewhere-else'}));
});
test('authored evidence is exact; no invented obstacles, sight, map size or elapsed rounds',()=>{
 const s=awaitingRoute();
 for(const forged of [
  null,{},false,
  {...publicCorridorRouteEvidence,corridorLengthFeet:160},
  {...publicCorridorRouteEvidence,partyAnchorFeet:10},
  {...publicCorridorRouteEvidence,monsterAnchor:120},
  {...publicCorridorRouteEvidence,obstaclesAtDecision:'hidden-door'},
  {...publicCorridorRouteEvidence,sightAfterMovement:'confirmed'},
  {...publicCorridorRouteEvidence,sightAtDecision:'always-visible'},
  {...publicCorridorRouteEvidence,roundsElapsed:1},
  {...publicCorridorRouteEvidence,movementApplied:true},
  {...publicCorridorRouteEvidence,chaseOutcome:'escaped'},
  {...publicCorridorRouteEvidence,privateMonsterPositionFeet:100}
 ]){
   assert.throws(()=>validatePublicCorridorRouteEvidence(forged,s.activeEncounter));
   const r=establish(s,forged);assert.equal(r.accepted,false);
   assert.strictEqual(r.state,s);assert.deepEqual(r.state.rng,s.rng);
 }
});
test('authored corridor changes only the administrative stage, not game-state geography or time',()=>{
 const before=awaitingRoute(),known=projectPlayerEncounterKnowledge(before);
 const r=establish(before);assert.equal(r.accepted,true);
 const s=r.state;assert.equal(s.schemaVersion,SCHEMA_VERSION);
 assert.equal(s.activeEncounter.stage,'awaiting-first-pursuit-round-evidence');
 assert.deepEqual({...s.activeEncounter,stage:before.activeEncounter.stage},before.activeEncounter);
 assert.equal(s.revision,before.revision+1);
 assert.equal(s.turns,before.turns);assert.deepEqual(s.rng,before.rng);
 assert.deepEqual(s.light,before.light);assert.deepEqual(s.character,before.character);
 assert.deepEqual(projectPlayerEncounterKnowledge(s),known);
 assert.equal(s.lastEncounter,null);assert.equal(s.pendingEncounter,null);
 assert.deepEqual(s.journal.at(-1),{kind:'encounter.pursuit-route-established',
   dueTurn:s.activeEncounter.dueTurn,routeId:publicCorridorRouteEvidence.id});
 assert.deepEqual(r.outcomes,[{
  kind:'encounter.pursuit-route-established',routeShape:'straight',
  obstaclesAtDecision:'none-authored',sightAfterMovement:'unestablished',
  roundsElapsed:0,chaseOutcome:'unresolved',knowledge:known
 }]);
 assert.equal(getStatusModel(s).encounter,'Public corridor verified · pursuit rounds unresolved');
 const narration=narrateAuthoritativeResult(r);
 assert.match(narration,/independently authored straight corridor/i);
 assert.match(narration,/not established/i);
 assert.match(narration,/No running round/i);
 for(const secret of ['goblin','distanceFeet','60 feet','120 feet','20 feet','monsterRoll','private'])
   assert.ok(!narration.includes(secret),secret);
 assertValidState(s);
});
test('strict operation requires completed prior steps, exact contact and fresh revision',()=>{
 let s=createDemoState(61);assert.equal(establish(s).accepted,false);
 for(const k of ['dungeon.rest','dungeon.rest','encounter.establish','encounter.surprise',
 'encounter.perceive','encounter.handoff','encounter.pursuit-decision',
 'encounter.pursuit-rate-review','encounter.party-load-establish']){
   s=executeProposal(s,op(s,k)).state;
   const bad=establish(s);assert.equal(bad.accepted,false,k);assert.strictEqual(bad.state,s);
 }
 s=awaitingRoute();
 assert.equal(establish(s,publicCorridorRouteEvidence,{...levelOneGoblinContact,monster:'dragon'}).accepted,false);
 for(const bad of [
  {...op(s,'encounter.pursuit-route-establish'),baseRevision:s.revision-1},
  {...op(s,'encounter.pursuit-route-establish'),operations:[{kind:'encounter.pursuit-route-establish',speed:60}]},
  {...op(s,'encounter.pursuit-route-establish'),operations:[{kind:'encounter.pursuit-route-establish'},{kind:'dungeon.rest'}]},
  {...op(s,'encounter.pursuit-route-establish'),patch:{distanceFeet:50}}
 ]) {
   const r=executeProposal(s,bad);assert.equal(r.accepted,false);assert.strictEqual(r.state,s);
 }
 const routed=establish(s).state;
 for(const k of ['encounter.pursuit-route-establish','encounter.pursuit-round-budget-review',
 'encounter.party-load-establish','encounter.pursuit-decision','dungeon.rest',
 'diagnostic.roll','encounter.conclude','encounter.conclude.monster-withdrawal']){
   const r=executeProposal(routed,op(routed,k));
   assert.equal(r.accepted,false,k);assert.strictEqual(r.state,routed);
 }
});
test('v12 saves migrate unchanged and cannot fabricate the v13 route stage',()=>{
 const prior=awaitingRoute(),old={...prior,schemaVersion:12};
 assert.deepEqual(decodeSave(JSON.stringify(old)),prior);
 const routed=establish(prior).state;
 assert.deepEqual(decodeSave(encodeSave(routed)),routed);
 assert.throws(()=>migrateSaveState({...old,activeEncounter:{...old.activeEncounter,stage:'awaiting-first-pursuit-round-evidence'}}));
 assert.throws(()=>migrateSaveState({...routed,schemaVersion:12}));
});
test('tampered v13 stage, route journal or visible encounter fails closed',()=>{
 const s=establish(awaitingRoute()).state;
 for(const patch of [
  {activeEncounter:{...s.activeEncounter,stage:'awaiting-route-and-round-evidence'}},
  {activeEncounter:{...s.activeEncounter,visibility:{presence:'unestablished',identity:'unestablished',distance:'unestablished'}}},
  {journal:s.journal.slice(0,-1)},
  {journal:[...s.journal.slice(0,-1),{...s.journal.at(-1),routeId:'other'}]},
  {journal:[...s.journal.slice(0,-1),{...s.journal.at(-1),dueTurn:6}]},
  {journal:[...s.journal.slice(0,-1),{...s.journal.at(-1),routeLengthFeet:180}]},
  {journal:[...s.journal,{kind:'diagnostic.roll',sides:6,value:1}]},
  {sightAfterMovement:'visible'}
 ])assert.throws(()=>assertValidState({...s,...patch}));
});
test('exact offline command, not a player-selected or freeform map',()=>{
 assert.deepEqual(parseLocalIntent('establish public demo pursuit corridor',11),
   {contract:'bx.intent.v1',baseRevision:11,operations:[{kind:'encounter.pursuit-route-establish'}]});
 for(const text of ['establish 200 foot corridor','chase them','pursue around the corner',
 'establish public demo pursuit corridor and catch','establish public demo pursuit corridor now'])
   assert.equal(parseLocalIntent(text,11),null);
});
