import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,executeProposal,assertValidState,migrateSaveState,SCHEMA_VERSION} from '../src/state/state.js';
import {decodeSave,encodeSave} from '../src/state/storage.js';
import {projectPlayerEncounterKnowledge} from '../src/state/player-knowledge.js';
import {parseLocalIntent,narrateAuthoritativeResult} from '../src/ai/contract.js';
import {getStatusModel} from '../src/ui/view.js';
import {clearRecognized,clearUnrecognized,obstructed} from '../src/content/encounters/public-perception.js';
import {unpursuedWithdrawal} from '../src/content/encounters/public-disposition.js';
import {validateDispositionEvidence} from '../src/rules/disposition-evidence.js';
import {levelOneGoblinContact} from '../src/content/encounters/level1-goblin.js';
const intent=(s,k)=>({contract:'bx.intent.v1',baseRevision:s.revision,operations:[{kind:k}]});
function ready(seed=61,evidence=clearRecognized,lit=true){
  let s=createDemoState(seed);
  if(!lit)s={...s,light:{kind:'none',remainingTurns:0}};
  for(const k of ['dungeon.rest','dungeon.rest','encounter.establish','encounter.surprise']){
    const r=executeProposal(s,intent(s,k));assert.equal(r.accepted,true,k);s=r.state;
  }
  const p=executeProposal(s,intent(s,'encounter.perceive'),undefined,evidence);
  assert.equal(p.accepted,true);s=p.state;
  const h=executeProposal(s,intent(s,'encounter.handoff'));
  assert.equal(h.accepted,true);return h.state;
}
const conclude=(s,e=unpursuedWithdrawal,p=levelOneGoblinContact)=>
 executeProposal(s,intent(s,'encounter.conclude'),p,clearRecognized,e);
const unknown={presence:'unestablished',identity:'unestablished',distance:'unestablished'};
test('B23 short documented no-pursuit escape closes at scheduled turn with one torch consumption',()=>{
  const before=ready(),r=conclude(before);assert.equal(r.accepted,true);
  const s=r.state;assert.equal(s.schemaVersion,SCHEMA_VERSION);
  assert.equal(s.turns,3);assert.equal(s.revision,before.revision+1);
  assert.deepEqual(s.rng,before.rng);assert.deepEqual(s.light,{kind:'torch',remainingTurns:3});
  assert.deepEqual(s.character,before.character);assert.equal(s.activeEncounter,null);
  assert.equal(s.pendingEncounter,null);assert.equal(s.lastEncounter.closedTurn,3);
  assert.deepEqual(s.lastEncounter.contact,before.activeEncounter);
  assert.deepEqual(s.lastEncounter.lightBefore,before.light);
  assert.equal(s.journal.at(-1).kind,'encounter.closed');
  assert.equal(getStatusModel(s).encounter,'Concluded · withdrew without pursuit');assertValidState(s);
});
test('unknown and forged disposition packets refuse before RNG or state mutation',()=>{
  const s=ready();
  for(const e of [null,{},false,{...unpursuedWithdrawal,monstersFollow:true},
    {...unpursuedWithdrawal,combatStarted:true},{...unpursuedWithdrawal,rounds:61},
    {...unpursuedWithdrawal,partyDecision:'fight'},
    {...unpursuedWithdrawal,secret:'goblins defeated'}]){
    assert.throws(()=>validateDispositionEvidence(e));
    const r=conclude(s,e);assert.equal(r.accepted,false);assert.strictEqual(r.state,s);
  }
  const r=conclude(s,unpursuedWithdrawal,{...levelOneGoblinContact,monster:'dragon'});
  assert.equal(r.accepted,false);assert.strictEqual(r.state,s);assert.equal(s.rng.draws,5);
});
test('premature resolution, stale/forged proposals, and duplicate conclusion refuse unchanged',()=>{
  let s=createDemoState(61);assert.equal(conclude(s).accepted,false);
  for(const kind of ['dungeon.rest','dungeon.rest','encounter.establish',
    'encounter.surprise','encounter.perceive']){
    s=executeProposal(s,intent(s,kind)).state;
    const r=conclude(s);assert.equal(r.accepted,false);assert.strictEqual(r.state,s);
  }
  s=ready();
  const bad=[
    {...intent(s,'encounter.conclude'),baseRevision:s.revision-1},
    {...intent(s,'encounter.conclude'),operations:[{kind:'encounter.conclude',victory:true}]},
    {...intent(s,'encounter.conclude'),operations:[{kind:'encounter.conclude'},{kind:'dungeon.rest'}]},
    {...intent(s,'encounter.conclude'),patch:{xp:10000}},intent(s,'encounter.win')];
  for(const p of bad){const r=executeProposal(s,p);assert.equal(r.accepted,false);assert.strictEqual(r.state,s);}
  const ended=conclude(s).state;
  for(const kind of ['encounter.conclude','encounter.handoff','encounter.perceive']){
    const r=executeProposal(ended,intent(ended,kind));assert.equal(r.accepted,false);assert.strictEqual(r.state,ended);
  }
});
test('all known and unknown perceptions persist across close, save and next exploration turn',()=>{
  for(const [seed,ev,lit] of [[61,clearRecognized,true],[61,clearUnrecognized,true],
    [61,obstructed,true],[1,clearRecognized,true],[61,clearRecognized,false]]){
    const before=ready(seed,ev,lit),know=projectPlayerEncounterKnowledge(before);
    const r=conclude(before);assert.equal(r.accepted,true);
    assert.deepEqual(r.outcomes[0].knowledge,know);
    assert.deepEqual(projectPlayerEncounterKnowledge(r.state),know);
    assert.deepEqual(decodeSave(encodeSave(r.state)),r.state);
    const rest=executeProposal(r.state,intent(r.state,'dungeon.rest'));
    assert.equal(rest.accepted,true);
    assert.equal(rest.state.turns,4);assert.equal(rest.state.rng.draws,6);
    assert.equal(rest.state.light.remainingTurns,lit?2:0);
    assert.deepEqual(projectPlayerEncounterKnowledge(rest.state),know);
  }
});
test('conclusion never publishes raw distance, count, enemy rolls or unknown identity',()=>{
  for(const [seed,ev] of [[61,clearRecognized],[61,clearUnrecognized],[61,obstructed],[1,clearRecognized]]){
    const r=conclude(ready(seed,ev)),publicText=JSON.stringify(r.outcomes)+' '+narrateAuthoritativeResult(r);
    for(const term of ['numberAppearing','distanceFeet','monsterRoll','partyRoll',
      'evidenceId','packetId','sourceId','30 feet','70 feet','two goblins'])
      assert.ok(!publicText.includes(term),term);
    assert.match(narrateAuthoritativeResult(r),/do not pursue/);
    if(seed===1||ev===obstructed)assert.deepEqual(r.outcomes[0].knowledge.visibility,unknown);
  }
});
test('v6 save migration retains unresolved contact and does not fabricate a conclusion',()=>{
  const s=ready();const {lastEncounter,...previous}=s;const v6={...previous,schemaVersion:6};
  const migrated=decodeSave(JSON.stringify(v6));
  assert.equal(migrated.schemaVersion,11);assert.equal(migrated.lastEncounter,null);
  assert.deepEqual(migrated.rng,s.rng);assert.deepEqual(migrated.activeEncounter,s.activeEncounter);
  assert.deepEqual(conclude(migrated),conclude(s));
  assert.throws(()=>migrateSaveState({...v6,lastEncounter:{}}));
  assert.throws(()=>migrateSaveState({...v6,journal:[...v6.journal,
    {kind:'encounter.closed',turn:3,disposition:'party-withdrew-unpursued'}]}));
});
test('tampered archived contact, past illumination, wrong fate, and extraneous data rejected',()=>{
  const s=conclude(ready()).state,last=s.lastEncounter;
  for(const patch of [
    {lastEncounter:{...last,sourceId:'invented'}},
    {lastEncounter:{...last,disposition:'slain'}},
    {lastEncounter:{...last,closedTurn:999}},
    {lastEncounter:{...last,lightBefore:{kind:'torch',remainingTurns:0}}},
    {lastEncounter:{...last,contact:{...last.contact,monster:'dragon'}}},
    {lastEncounter:{...last,contact:{...last.contact,stage:'surprise-adjudicated'}}},
    {lastEncounter:{...last,unknownTreasure:'1000gp'}},
    {journal:[...s.journal,{kind:'encounter.closed',turn:999,disposition:'party-withdrew-unpursued'}]},
    {forged:true}
  ])assert.throws(()=>assertValidState({...s,...patch}));
});
test('offline phrase names only the PUBLIC diagnostic; general wins and escapes are unsupported',()=>{
  assert.deepEqual(parseLocalIntent('resolve public demo nonpursuit',7),
    {contract:'bx.intent.v1',baseRevision:7,operations:[{kind:'encounter.conclude'}]});
  for(const p of ['end encounter','kill goblins','resolve pursuit',
    'resolve public demo nonpursuit and loot','the goblins flee'])
    assert.equal(parseLocalIntent(p,7),null);
});
