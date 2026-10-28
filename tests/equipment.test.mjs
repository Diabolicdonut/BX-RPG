import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,executeProposal,assertValidState,migrateSaveState,SCHEMA_VERSION} from '../src/state/state.js';
import {encodeSave,decodeSave} from '../src/state/storage.js';
import {projectPlayerEncounterKnowledge} from '../src/state/player-knowledge.js';
import {parseLocalIntent,narrateAuthoritativeResult} from '../src/ai/contract.js';
import {getStatusModel} from '../src/ui/view.js';
import {B20_ITEM_COINS,publicPartyLoadEvidence,validatePublicPartyLoad,
  calculateSourceLoad,canonicalPartyLoad} from '../src/rules/equipment-evidence.js';
const op=(s,k)=>({contract:'bx.intent.v1',baseRevision:s.revision,operations:[{kind:k}]});
function awaitingLoad(seed=61){
  let s=createDemoState(seed);
  for(const kind of ['dungeon.rest','dungeon.rest','encounter.establish','encounter.surprise',
    'encounter.perceive','encounter.handoff','encounter.pursuit-decision','encounter.pursuit-rate-review']){
    const r=executeProposal(s,op(s,kind));assert.equal(r.accepted,true,kind);s=r.state;
  }
  return s;
}
const witness=(s,load=publicPartyLoadEvidence)=>
 executeProposal(s,op(s,'encounter.party-load-establish'),undefined,undefined,undefined,undefined,undefined,load);
test('Moldvay B20 strict source coin-weight inventory and independent public snapshot',()=>{
  assert.equal(B20_ITEM_COINS['chain-mail'],400);
  assert.equal(B20_ITEM_COINS['leather-armor'],200);
  assert.equal(B20_ITEM_COINS['plate-mail'],500);
  assert.equal(B20_ITEM_COINS['shield'],100);
  assert.equal(B20_ITEM_COINS['normal-sword'],60);
  assert.equal(B20_ITEM_COINS['bow-and-20-arrows'],30);
  assert.equal(B20_ITEM_COINS['miscellaneous-equipment-and-provisions'],80);
  assert.equal(B20_ITEM_COINS.coin,1);
  assert.equal(Object.isFrozen(publicPartyLoadEvidence),true);
  assert.equal(publicPartyLoadEvidence.characterId,'demo-fighter');
  assert.equal(publicPartyLoadEvidence.wornArmor,'none');
  assert.equal(publicPartyLoadEvidence.carryingTreasure,false);
  assert.strictEqual(validatePublicPartyLoad(publicPartyLoadEvidence).evidence,publicPartyLoadEvidence);
  assert.deepEqual(canonicalPartyLoad,{
    evidence:publicPartyLoadEvidence,totalCoins:170,
    band:'unarmored-or-up-to-400',
    baseFeetPerTurn:120,encounterFeetPerRound:40,runningFeetPerRound:120
  });
});
const c=(items,wornArmor='none',carryingTreasure=false)=>
 calculateSourceLoad({wornArmor,carryingTreasure,items});
const item=(id,quantity=1)=>({item:id,quantity});
test('exact B20 thresholds at 400/401/600/601/800/801/1600, armor floors and treasure penalty',()=>{
  const examples=[
   [400,'unarmored-or-up-to-400',120],
   [401,'leather-or-401-to-600',90],
   [600,'leather-or-401-to-600',90],
   [601,'metal-or-601-to-800',60],
   [800,'metal-or-601-to-800',60],
   [801,'metal-treasure-or-801-to-1600',30],
   [1600,'metal-treasure-or-801-to-1600',30]
  ];
  for(const [quantity,band,rate] of examples){
    const observed=c([item('coin',quantity)],'none',true);
    assert.equal(observed.totalCoins,quantity);
    assert.equal(observed.band,band);assert.equal(observed.runningFeetPerRound,rate);
  }
  assert.equal(c([item('leather-armor')],'leather').runningFeetPerRound,90);
  assert.equal(c([item('chain-mail')],'metal').runningFeetPerRound,60);
  assert.equal(c([item('leather-armor'),item('coin',1)],'leather',true).runningFeetPerRound,60);
  assert.equal(c([item('chain-mail'),item('coin',1)],'metal',true).runningFeetPerRound,30);
  assert.throws(()=>c([item('coin',1601)],'none',true));
  assert.throws(()=>c([item('normal-sword',27)])); // 1,620 coin-weights
});
test('missing, null, zero, false, unknown and forged load fields do not establish encumbrance',()=>{
 const p=publicPartyLoadEvidence;
 for(const fake of [
   null,{},false,{...p,wornArmor:'leather'},
   {...p,carryingTreasure:true},{...p,characterId:'different'},
   {...p,secret:1},{...p,items:p.items.slice(1)},
   {...p,items:p.items.map(x=>({...x,quantity:0}))},
   {...p,items:p.items.map(x=>({...x,quantity:2}))},
   {...p,items:[...p.items,{item:'coin',quantity:1}]}
 ]){
   assert.throws(()=>validatePublicPartyLoad(fake));
   const before=awaitingLoad(),r=witness(before,fake);
   assert.equal(r.accepted,false);
   assert.strictEqual(r.state,before);
   assert.deepEqual(r.state.rng,before.rng);
 }
 for(const bad of [
  {wornArmor:null,carryingTreasure:false,items:[item('normal-sword')]},
  {wornArmor:'none',carryingTreasure:null,items:[item('normal-sword')]},
  {wornArmor:'none',carryingTreasure:false,items:[]},
  {wornArmor:'none',carryingTreasure:false,items:[item('normal-sword',0)]},
  {wornArmor:'none',carryingTreasure:false,items:[item('normal-sword'),item('normal-sword')]},
  {wornArmor:'leather',carryingTreasure:false,items:[item('normal-sword')]},
  {wornArmor:'none',carryingTreasure:false,items:[item('leather-armor')]},
  {wornArmor:'metal',carryingTreasure:false,items:[item('chain-mail'),item('plate-mail')]},
  {wornArmor:'none',carryingTreasure:false,items:[item('mystery')]},
  {wornArmor:'none',carryingTreasure:false,items:[item('coin',1)]}
 ])assert.throws(()=>calculateSourceLoad(bad));
});
test('public encounter-scoped witness establishes B/X speed with zero pursuit mechanics',()=>{
 const before=awaitingLoad(),knowledge=projectPlayerEncounterKnowledge(before),r=witness(before);
 assert.equal(r.accepted,true);
 const s=r.state;
 assert.equal(s.schemaVersion,SCHEMA_VERSION);
 assert.equal(s.activeEncounter.stage,'awaiting-chase-adjudication');
 assert.equal(s.revision,before.revision+1);assert.equal(s.turns,before.turns);
 assert.deepEqual(s.rng,before.rng);assert.deepEqual(s.light,before.light);
 assert.deepEqual(s.character,before.character);
 assert.equal(s.lastEncounter,null);
 assert.equal(s.activeEncounter.distanceFeet,before.activeEncounter.distanceFeet);
 assert.deepEqual(projectPlayerEncounterKnowledge(s),knowledge);
 assert.deepEqual(r.outcomes,[{
  kind:'encounter.party-load-established',weightCoins:170,runningFeetPerRound:120,
  stage:'awaiting-chase-adjudication',knowledge
 }]);
 assert.equal(s.journal.at(-1).evidenceId,publicPartyLoadEvidence.id);
 assert.equal(s.journal.at(-1).weightCoins,170);
 assert.equal(s.journal.at(-1).band,'unarmored-or-up-to-400');
 assert.equal(getStatusModel(s).encounter,'Public party load established · chase unresolved');
 assert.match(narrateAuthoritativeResult(r),/170 coin-weights/);
 assert.match(narrateAuthoritativeResult(r),/120 feet per round/);
 assert.doesNotMatch(narrateAuthoritativeResult(r),/goblin|monster|30 feet|chase succeeded/i);
 assertValidState(s);
});
test('every unverified state transition is blocked before witnessing and after witnessing',()=>{
 let s=createDemoState(61);assert.equal(witness(s).accepted,false);
 for(const kind of ['dungeon.rest','dungeon.rest','encounter.establish','encounter.surprise',
  'encounter.perceive','encounter.handoff','encounter.pursuit-decision']){
   const r=executeProposal(s,op(s,kind));assert.equal(r.accepted,true,kind);s=r.state;
   const rejected=witness(s);assert.equal(rejected.accepted,false);
   assert.strictEqual(rejected.state,s);
 }
 const rateReview=executeProposal(s,op(s,'encounter.pursuit-rate-review'));assert.equal(rateReview.accepted,true);
 const after=witness(rateReview.state).state;
 for(const kind of ['encounter.party-load-establish','encounter.pursuit-rate-review',
  'encounter.pursuit-decision','dungeon.rest','diagnostic.roll','encounter.conclude',
  'encounter.conclude.monster-withdrawal','encounter.handoff','encounter.establish']){
  const r=executeProposal(after,op(after,kind));
  assert.equal(r.accepted,false,kind);assert.strictEqual(r.state,after);
 }
 for(const proposal of [
  {...op(rateReview.state,'encounter.party-load-establish'),baseRevision:rateReview.state.revision-1},
  {...op(rateReview.state,'encounter.party-load-establish'),patch:{hp:999}},
  {...op(rateReview.state,'encounter.party-load-establish'),
    operations:[{kind:'encounter.party-load-establish',coins:170}]},
  {...op(rateReview.state,'encounter.party-load-establish'),
    operations:[{kind:'encounter.party-load-establish'},{kind:'diagnostic.roll',sides:6}]}
 ]){
  const r=executeProposal(rateReview.state,proposal);
  assert.equal(r.accepted,false);assert.strictEqual(r.state,rateReview.state);
 }
});
test('historical v10 saves migrate exactly, v11-only witnesses cannot masquerade as v10 history',()=>{
 const rate=awaitingLoad(),old={...rate,schemaVersion:10};
 assert.deepEqual(decodeSave(JSON.stringify(old)),rate);
 const completed=witness(rate).state;
 assert.deepEqual(decodeSave(encodeSave(completed)),completed);
 assert.throws(()=>migrateSaveState({...completed,schemaVersion:10}));
 assert.throws(()=>migrateSaveState({...old,activeEncounter:{
  ...old.activeEncounter,stage:'awaiting-chase-adjudication'}}));
 assert.throws(()=>migrateSaveState({...old,journal:[...old.journal,
  {kind:'encounter.party-load-established',dueTurn:3,evidenceId:publicPartyLoadEvidence.id,
   weightCoins:170,band:'unarmored-or-up-to-400'}]}));
});
test('v11 save rejects missing, altered or forged equipment evidence and cross-encounter facts',()=>{
 const s=witness(awaitingLoad()).state;
 const old=s.journal.at(-1);
 for(const patch of [
   {journal:s.journal.slice(0,-1)},
   {journal:[...s.journal.slice(0,-1),{...old,weightCoins:169}]},
   {journal:[...s.journal.slice(0,-1),{...old,band:'metal-or-601-to-800'}]},
   {journal:[...s.journal.slice(0,-1),{...old,dueTurn:5}]},
   {journal:[...s.journal.slice(0,-1),{...old,evidenceId:'forged'}]},
   {journal:[...s.journal.slice(0,-1),{...old,hiddenMap:true}]},
   {journal:[...s.journal,{kind:'diagnostic.roll',sides:6,value:5}]},
   {activeEncounter:{...s.activeEncounter,stage:'awaiting-party-rate-evidence'}},
   {activeEncounter:{...s.activeEncounter,dueTurn:7}},
   {partyEquipment:{armor:'plate-mail'}},
 ]) assert.throws(()=>assertValidState({...s,...patch}));
});
test('exact public diagnostic command is not general equipment or autonomous AI adjudication',()=>{
 assert.deepEqual(parseLocalIntent('establish public demo party load',8),
 {contract:'bx.intent.v1',baseRevision:8,operations:[{kind:'encounter.party-load-establish'}]});
 for(const phrase of ['I have a sword and some arrows','encumbered',
  'establish public demo party load and chase','establish public demo party load now',
  'the goblins have caught us'])assert.equal(parseLocalIntent(phrase,8),null);
});
