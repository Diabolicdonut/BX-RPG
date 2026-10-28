import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,executeProposal,assertValidState,migrateSaveState,SCHEMA_VERSION} from '../src/state/state.js';
import {encodeSave,decodeSave} from '../src/state/storage.js';
import {projectPlayerEncounterKnowledge} from '../src/state/player-knowledge.js';
import {getStatusModel} from '../src/ui/view.js';
import {parseLocalIntent,narrateAuthoritativeResult} from '../src/ai/contract.js';
import {publicPursuitRoundBudget,validatePublicPursuitRoundBudget,
  potentialRunningBudget,B24_SECONDS_PER_ROUND,B24_RUNNING_LIMIT_ROUNDS} from '../src/rules/pursuit-round-budget.js';
import {canonicalPartyLoad} from '../src/rules/equipment-evidence.js';
import {PUBLIC_GOBLIN_RATE} from '../src/rules/pursuit-rates.js';
import {levelOneGoblinContact} from '../src/content/encounters/level1-goblin.js';
const op=(s,kind)=>({contract:'bx.intent.v1',baseRevision:s.revision,operations:[{kind}]});
function awaitingBudget(seed=61) {
  let s=createDemoState(seed);
  for(const kind of ['dungeon.rest','dungeon.rest','encounter.establish','encounter.surprise',
    'encounter.perceive','encounter.handoff','encounter.pursuit-decision',
    'encounter.pursuit-rate-review','encounter.party-load-establish']) {
    const r=executeProposal(s,op(s,kind)); assert.equal(r.accepted,true,kind);s=r.state;
  }
  return s;
}
const budget=(s,packet=publicPursuitRoundBudget,contact=levelOneGoblinContact)=>
  executeProposal(s,op(s,'encounter.pursuit-round-budget-review'),contact,
    undefined,undefined,undefined,undefined,undefined,packet);
test('B24 running round budget uses independently validated B19/B20/B53 rates, not travel',()=>{
  assert.equal(B24_SECONDS_PER_ROUND,10);
  assert.equal(B24_RUNNING_LIMIT_ROUNDS,30);
  assert.equal(publicPursuitRoundBudget.partyPotentialFeetPerRound,canonicalPartyLoad.runningFeetPerRound);
  assert.equal(publicPursuitRoundBudget.monsterPotentialFeetPerRound,PUBLIC_GOBLIN_RATE.runningFeetPerRound);
  assert.equal(publicPursuitRoundBudget.partyPotentialFeetPerRound,120);
  assert.equal(publicPursuitRoundBudget.monsterPotentialFeetPerRound,60);
  assert.equal(publicPursuitRoundBudget.maximumCharacterRunningRounds,30);
  assert.equal(publicPursuitRoundBudget.runningRoundsElapsed,0);
  assert.equal(publicPursuitRoundBudget.mapAndRoute,'unestablished');
  assert.equal(publicPursuitRoundBudget.lineOfSightContinuity,'unestablished');
  assert.equal(publicPursuitRoundBudget.movementApplied,false);
  assert.equal(publicPursuitRoundBudget.chaseOutcome,'unresolved');
  assert.strictEqual(validatePublicPursuitRoundBudget(publicPursuitRoundBudget),publicPursuitRoundBudget);
});
test('pure hypothetical running budget rejects negative/fractional/unbounded intervals',()=>{
  assert.deepEqual(potentialRunningBudget(0),{
    hypotheticalRounds:0,partyPotentialFeet:0,monsterPotentialFeet:0,movementApplied:false
  });
  assert.deepEqual(potentialRunningBudget(1),{
    hypotheticalRounds:1,partyPotentialFeet:120,monsterPotentialFeet:60,movementApplied:false
  });
  assert.deepEqual(potentialRunningBudget(30),{
    hypotheticalRounds:30,partyPotentialFeet:3600,monsterPotentialFeet:1800,movementApplied:false
  });
  for(const n of [null,undefined,false,'1',NaN,Infinity,-1,0.1,1.5,31,99999,{},[]])
    assert.throws(()=>potentialRunningBudget(n));
});
test('strict independent canonical budget rejects any injected chase/outcome facts without mutation',()=>{
 const s=awaitingBudget();
 for(const packet of [null,{},false,
  {...publicPursuitRoundBudget,partyPotentialFeetPerRound:10},
  {...publicPursuitRoundBudget,monsterPotentialFeetPerRound:120},
  {...publicPursuitRoundBudget,maximumCharacterRunningRounds:31},
  {...publicPursuitRoundBudget,runningRoundsElapsed:1},
  {...publicPursuitRoundBudget,movementApplied:true},
  {...publicPursuitRoundBudget,mapAndRoute:'straight corridor'},
  {...publicPursuitRoundBudget,lineOfSightContinuity:'visible'},
  {...publicPursuitRoundBudget,chaseOutcome:'caught'},
  {...publicPursuitRoundBudget,positionFeet:0}]) {
   assert.throws(()=>validatePublicPursuitRoundBudget(packet));
   const r=budget(s,packet);
   assert.equal(r.accepted,false);assert.strictEqual(r.state,s);
 }
});
test('successful B24 budget review is a pending evidence checkpoint, never a chase round',()=>{
 const before=awaitingBudget(),know=projectPlayerEncounterKnowledge(before),r=budget(before);
 assert.equal(r.accepted,true);
 const s=r.state; assert.equal(s.schemaVersion,SCHEMA_VERSION);
 assert.equal(s.activeEncounter.stage,'awaiting-route-and-round-evidence');
 assert.deepEqual({...s.activeEncounter,stage:before.activeEncounter.stage},before.activeEncounter);
 assert.equal(s.turns,before.turns);assert.deepEqual(s.light,before.light);
 assert.deepEqual(s.rng,before.rng);assert.deepEqual(s.character,before.character);
 assert.equal(s.lastEncounter,null);assert.equal(s.pendingEncounter,null);
 assert.equal(s.revision,before.revision+1);
 assert.equal(s.journal.at(-1).kind,'encounter.pursuit-round-budget-reviewed');
 assert.equal(s.journal.at(-1).dueTurn,s.activeEncounter.dueTurn);
 assert.equal(s.journal.at(-1).budgetId,publicPursuitRoundBudget.id);
 assert.deepEqual(projectPlayerEncounterKnowledge(s),know);
 assert.deepEqual(r.outcomes,[{
    kind:'encounter.pursuit-round-budget-reviewed',
    partyPotentialFeetPerRound:120,runningLimitRounds:30,
    roundsElapsed:0,chaseOutcome:'unresolved',knowledge:know
 }]);
 const narration=narrateAuthoritativeResult(r);
 assert.match(narration,/hypothetical running round/i);
 assert.match(narration,/no round has elapsed/i);
 assert.doesNotMatch(narration,/goblin|60 feet|captured|escaped|caught/i);
 assert.equal(getStatusModel(s).encounter,'Running budget reviewed · route and rounds unresolved');
 assertValidState(s);
});
test('B24 review rejects wrong encounter, preconditions, duplicate, stale and follow-on actions',()=>{
 let s=createDemoState(61);
 assert.equal(budget(s).accepted,false);
 for(const k of ['dungeon.rest','dungeon.rest','encounter.establish','encounter.surprise',
    'encounter.perceive','encounter.handoff','encounter.pursuit-decision',
    'encounter.pursuit-rate-review']) {
    s=executeProposal(s,op(s,k)).state;
    const r=budget(s); assert.equal(r.accepted,false,k);assert.strictEqual(r.state,s);
 }
 s=awaitingBudget();
 assert.equal(budget(s,publicPursuitRoundBudget,{...levelOneGoblinContact,monster:'dragon'}).accepted,false);
 for(const p of [
    {...op(s,'encounter.pursuit-round-budget-review'),baseRevision:s.revision-1},
    {...op(s,'encounter.pursuit-round-budget-review'),operations:[{kind:'encounter.pursuit-round-budget-review',caught:true}]},
    {...op(s,'encounter.pursuit-round-budget-review'),operations:[{kind:'encounter.pursuit-round-budget-review'},{kind:'dungeon.rest'}]},
    {...op(s,'encounter.pursuit-round-budget-review'),patch:{rounds:1}}
 ]){const r=executeProposal(s,p);assert.equal(r.accepted,false);assert.strictEqual(r.state,s);}
 const pending=budget(s).state;
 for(const action of ['encounter.pursuit-round-budget-review','encounter.party-load-establish',
    'encounter.pursuit-rate-review','encounter.pursuit-decision','dungeon.rest',
    'diagnostic.roll','encounter.conclude','encounter.conclude.monster-withdrawal','encounter.handoff']){
    const r=executeProposal(pending,op(pending,action));assert.equal(r.accepted,false,action);
    assert.strictEqual(r.state,pending);assert.deepEqual(r.state.rng,pending.rng);
 }
});
test('v11 history migrates unchanged, v11 cannot forge v12-only running-budget record',()=>{
 const before=awaitingBudget(),old={...before,schemaVersion:11};
 assert.deepEqual(decodeSave(JSON.stringify(old)),before);
 const after=budget(before).state;
 assert.deepEqual(decodeSave(encodeSave(after)),after);
 assert.throws(()=>migrateSaveState({...old,activeEncounter:{...old.activeEncounter,stage:'awaiting-route-and-round-evidence'}}));
 assert.throws(()=>migrateSaveState({...after,schemaVersion:11}));
});
test('tampered v12 pending stage fails closed without canonical terminal evidence',()=>{
 const s=budget(awaitingBudget()).state;
 for(const patch of [
  {activeEncounter:{...s.activeEncounter,stage:'awaiting-chase-adjudication'}},
  {activeEncounter:{...s.activeEncounter,visibility:{presence:'unestablished',identity:'unestablished',distance:'unestablished'}}},
  {journal:s.journal.slice(0,-1)},
  {journal:[...s.journal.slice(0,-1),{...s.journal.at(-1),budgetId:'fiction'}]},
  {journal:[...s.journal.slice(0,-1),{...s.journal.at(-1),dueTurn:999}]},
  {journal:[...s.journal.slice(0,-1),{...s.journal.at(-1),rounds:1}]},
  {journal:[...s.journal,{kind:'diagnostic.roll',sides:6,value:2}]},
  {elapsedRounds:1}
 ])assert.throws(()=>assertValidState({...s,...patch}));
});
test('one explicit offline fixture command, not player-authored pursuit adjudication',()=>{
 assert.deepEqual(parseLocalIntent('review public demo pursuit round budget',9),op({revision:9},'encounter.pursuit-round-budget-review'));
 for(const phrase of ['chase them','run after goblins','review public demo pursuit round budget and catch',
   'review public demo pursuit round budget now','run 1 round','review pursuit budget'])
   assert.equal(parseLocalIntent(phrase,9),null);
});
