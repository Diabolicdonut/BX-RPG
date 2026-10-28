import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,executeProposal,assertValidState,migrateSaveState,SCHEMA_VERSION} from '../src/state/state.js';
import {encodeSave,decodeSave} from '../src/state/storage.js';
import {projectPlayerEncounterKnowledge} from '../src/state/player-knowledge.js';
import {parseLocalIntent,narrateAuthoritativeResult} from '../src/ai/contract.js';
import {getStatusModel} from '../src/ui/view.js';
import {levelOneGoblinContact} from '../src/content/encounters/level1-goblin.js';
import {publicPursuitRateReview,validatePursuitRateReview,playerRateForEstablishedBand,
  PUBLIC_GOBLIN_RATE,B19_BANDS} from '../src/rules/pursuit-rates.js';
const op=(s,k)=>({contract:'bx.intent.v1',baseRevision:s.revision,operations:[{kind:k}]});
function pursued(seed=61) {
 let s=createDemoState(seed);
 for(const k of ['dungeon.rest','dungeon.rest','encounter.establish','encounter.surprise',
     'encounter.perceive','encounter.handoff','encounter.pursuit-decision']) {
   const r=executeProposal(s,op(s,k));assert.equal(r.accepted,true,k);s=r.state;
 }
 return s;
}
const review=(s,review=publicPursuitRateReview,packet=levelOneGoblinContact)=>
  executeProposal(s,op(s,'encounter.pursuit-rate-review'),packet,undefined,undefined,undefined,review);
test('original B19 four movement/encumbrance bands derive unambiguous encounter/running rates',()=>{
 assert.deepEqual(Object.keys(B19_BANDS),[
  'unarmored-or-up-to-400','leather-or-401-to-600','metal-or-601-to-800',
  'metal-treasure-or-801-to-1600']);
 for(const [band,base,normal,run] of [
   ['unarmored-or-up-to-400',120,40,120],
   ['leather-or-401-to-600',90,30,90],
   ['metal-or-601-to-800',60,20,60],
   ['metal-treasure-or-801-to-1600',30,10,30]]) {
    const value=playerRateForEstablishedBand(band);
    assert.deepEqual(value,{baseFeetPerTurn:base,encounterFeetPerRound:normal,runningFeetPerRound:run});
    assert.equal(value.encounterFeetPerRound*3,value.runningFeetPerRound);
 }
 assert.deepEqual(PUBLIC_GOBLIN_RATE,{contactId:levelOneGoblinContact.id,
  baseFeetPerTurn:60,encounterFeetPerRound:20,runningFeetPerRound:60,
  source:'Moldvay Basic (1981), B53 and B24'});
 for(const band of [undefined,null,0,400,1600,1601,{},'40',false,'metal', 'unestablished']){
   assert.throws(()=>playerRateForEstablishedBand(band),'cannot guess armor/load or overloaded rate');
 }
});
test('strict authored rate-review data explicitly preserves absent player gear and zero elapsed rounds',()=>{
 assert.strictEqual(validatePursuitRateReview(publicPursuitRateReview),publicPursuitRateReview);
 assert.equal(publicPursuitRateReview.partyBand,'unestablished');
 assert.strictEqual(publicPursuitRateReview.partyRunningFeetPerRound,null);
 assert.equal(publicPursuitRateReview.runningRounds,0);
 assert.equal(publicPursuitRateReview.comparison,'unestablished');
 for(const packet of [null,{},false,{...publicPursuitRateReview,partyBand:'unarmored-or-up-to-400'},
   {...publicPursuitRateReview,partyRunningFeetPerRound:120},
   {...publicPursuitRateReview,runningRounds:1},
   {...publicPursuitRateReview,comparison:'goblin-caught'},
   {...publicPursuitRateReview,monsterRunningFeetPerRound:120},
   {...publicPursuitRateReview,secret:true}]){
  assert.throws(()=>validatePursuitRateReview(packet));
  const s=pursued(),r=review(s,packet);assert.equal(r.accepted,false);
  assert.strictEqual(r.state,s);assert.deepEqual(r.state.rng,s.rng);
 }
});
test('rate audit only changes revision, terminal record and unresolved stage',()=>{
 const before=pursued(),known=projectPlayerEncounterKnowledge(before),r=review(before);
 assert.equal(r.accepted,true);
 const s=r.state;
 assert.equal(s.schemaVersion,SCHEMA_VERSION);
 assert.equal(s.revision,before.revision+1);
 assert.equal(s.turns,before.turns);assert.deepEqual(s.rng,before.rng);
 assert.deepEqual(s.light,before.light);assert.deepEqual(s.character,before.character);
 assert.equal(s.activeEncounter.stage,'awaiting-party-rate-evidence');
 assert.equal(s.activeEncounter.distanceFeet,before.activeEncounter.distanceFeet);
 assert.equal(s.lastEncounter,null);
 assert.deepEqual(projectPlayerEncounterKnowledge(s),known);
 assert.equal(s.journal.at(-1).kind,'encounter.pursuit-rate-review');
 assert.equal(s.journal.at(-1).reviewId,publicPursuitRateReview.id);
 assert.deepEqual(r.outcomes,[{kind:'encounter.pursuit-rate-review',
  partyRate:'unestablished',comparison:'unestablished',knowledge:known}]);
 const text=narrateAuthoritativeResult(r);
 assert.match(text,/equipment load and movement rate are not established/i);
 for(const forbidden of ['goblin','60 feet','distanceFeet','numberAppearing','monsterRoll','partyRoll'])
   assert.ok(!text.includes(forbidden),forbidden);
 assert.equal(getStatusModel(s).encounter,'Pursuit rates reviewed · party equipment unestablished');
 assertValidState(s);
});
test('no movement/escape/rest/dice/old disposition can resolve an unaudited or audited pursuit',()=>{
 let s=createDemoState(61);
 assert.equal(review(s).accepted,false);
 for(const kind of ['dungeon.rest','dungeon.rest','encounter.establish','encounter.surprise',
  'encounter.perceive','encounter.handoff']){
   s=executeProposal(s,op(s,kind)).state;
   const r=review(s);assert.equal(r.accepted,false);assert.strictEqual(r.state,s);
 }
 s=pursued();const audited=review(s).state;
 for(const [source,action] of [[s,'encounter.pursuit-rate-review'],[audited,'encounter.pursuit-rate-review'],
   [audited,'dungeon.rest'],[audited,'diagnostic.roll'],[audited,'encounter.conclude'],
   [audited,'encounter.conclude.monster-withdrawal'],[audited,'encounter.pursuit-decision'],
   [audited,'encounter.handoff']].slice(1)){
  const r=executeProposal(source,op(source,action));assert.equal(r.accepted,false,action);
  assert.strictEqual(r.state,source);assert.equal(r.state.rng.draws,5);
 }
 for(const p of [
  {...op(s,'encounter.pursuit-rate-review'),baseRevision:s.revision-1},
  {...op(s,'encounter.pursuit-rate-review'),operations:[{kind:'encounter.pursuit-rate-review',partySpeed:120}]},
  {...op(s,'encounter.pursuit-rate-review'),operations:[{kind:'encounter.pursuit-rate-review'},{kind:'dungeon.rest'}]},
  {...op(s,'encounter.pursuit-rate-review'),patch:{turns:100}},
 ]){
  const r=executeProposal(s,p);assert.equal(r.accepted,false);assert.strictEqual(r.state,s);
 }
 assert.equal(review(s,publicPursuitRateReview,{...levelOneGoblinContact,monster:'dragon'}).accepted,false);
});
test('v9 pursued save migration preserves decision and refuses forged future rate record',()=>{
 const before=pursued(),old={...before,schemaVersion:9};
 assert.deepEqual(decodeSave(JSON.stringify(old)),before);
 assert.deepEqual(review(decodeSave(JSON.stringify(old))),review(before));
 const made=review(before).state;
 assert.deepEqual(decodeSave(encodeSave(made)),made);
 assert.throws(()=>migrateSaveState({...old,activeEncounter:{
  ...old.activeEncounter,stage:'awaiting-party-rate-evidence'}}));
 assert.throws(()=>migrateSaveState({...old,journal:[...old.journal,
  {kind:'encounter.pursuit-rate-review',dueTurn:3,reviewId:publicPursuitRateReview.id}]}));
});
test('forged v10 rate review history, sighting and state fail closed',()=>{
 const s=review(pursued()).state;
 for(const patch of [
  {activeEncounter:{...s.activeEncounter,stage:'awaiting-pursuit-adjudication'}},
  {activeEncounter:{...s.activeEncounter,visibility:{presence:'unestablished',identity:'unestablished',distance:'unestablished'}}},
  {journal:s.journal.slice(0,-1)},
  {journal:[...s.journal.slice(0,-1),{...s.journal.at(-1),reviewId:'arbitrary'}]},
  {journal:[...s.journal.slice(0,-1),{...s.journal.at(-1),dueTurn:999}]},
  {journal:[...s.journal.slice(0,-1),{...s.journal.at(-1),partySpeed:120}]},
  {journal:[...s.journal,{kind:'diagnostic.roll',sides:6,value:2}]},
  {partyEncumbrance:0},
 ])assert.throws(()=>assertValidState({...s,...patch}));
});
test('offline command is an exact non-AI public diagnostic, not a general chase resolver',()=>{
 assert.deepEqual(parseLocalIntent('review public demo pursuit rates',9),
   {contract:'bx.intent.v1',baseRevision:9,operations:[{kind:'encounter.pursuit-rate-review'}]});
 for(const phrase of ['pursuit rates','review public demo pursuit rates and catch them',
  'review public demo pursuit rates now','they run at 120','let us outrun the goblins'])
   assert.equal(parseLocalIntent(phrase,9),null);
});
