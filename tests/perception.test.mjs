import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,executeProposal,assertValidState,migrateSaveState,SCHEMA_VERSION} from '../src/state/state.js';
import {encodeSave,decodeSave} from '../src/state/storage.js';
import {narrateAuthoritativeResult,parseLocalIntent} from '../src/ai/contract.js';
import {getStatusModel} from '../src/ui/view.js';
import {clearRecognized,clearUnrecognized,obstructed} from '../src/content/encounters/public-perception.js';
import {validatePerceptionEvidence} from '../src/rules/perception-evidence.js';
import {levelOneGoblinContact} from '../src/content/encounters/level1-goblin.js';
const intent=(state,kind)=>({contract:'bx.intent.v1',baseRevision:state.revision,operations:[{kind}]});
function prepare(seed=61,hasTorch=true) {
  let state=createDemoState(seed);
  if(!hasTorch)state={...state,light:{kind:'none',remainingTurns:0}};
  for(const kind of ['dungeon.rest','dungeon.rest','encounter.establish','encounter.surprise']){
    const result=executeProposal(state,intent(state,kind));
    assert.equal(result.accepted,true,kind);
    state=result.state;
  }
  return state;
}
const perceive=(s,e=clearRecognized,packet=levelOneGoblinContact)=>
  executeProposal(s,intent(s,'encounter.perceive'),packet,e);
const unknown={presence:'unestablished',identity:'unestablished',distance:'unestablished'};

test('B21 and authored clear recognizable contact inside thirty feet disclose only supported fields',()=>{
  const before=prepare(61),result=perceive(before);
  assert.equal(before.activeEncounter.distanceFeet,30);
  assert.equal(result.accepted,true);
  assert.deepEqual(result.state.activeEncounter.visibility,{
    presence:'visible',identity:'goblin',distance:'within-torchlight'});
  assert.equal(result.state.activeEncounter.evidenceId,clearRecognized.id);
  assert.equal(result.state.activeEncounter.stage,'perception-adjudicated');
  assert.deepEqual(result.outcomes,[{kind:'encounter.perception',visibility:{
    presence:'visible',identity:'goblin',distance:'within-torchlight'}}]);
  assert.equal(getStatusModel(result.state).encounter,'Goblin visible · within torchlight');
  const narration=narrateAuthoritativeResult(result);
  assert.match(narration,/A goblin is visible within torchlight/);
  assert.doesNotMatch(narration,/30 feet|2 goblins|exactly|monsterRoll|d6/);
  assert.equal(result.state.rng.draws,before.rng.draws);
  assert.equal(result.state.turns,before.turns);
  assert.deepEqual(result.state.light,before.light);
  assert.deepEqual(result.state.activeEncounter.surprise,before.activeEncounter.surprise);
  assert.equal(result.state.revision,before.revision+1);
  assert.equal(result.state.journal.at(-1).kind,'encounter.perception');
  assertValidState(result.state);
});
test('clear illuminated sight without recognition reveals presence but not goblin identity or count',()=>{
  const result=perceive(prepare(61),clearUnrecognized);
  assert.deepEqual(result.state.activeEncounter.visibility,{
    presence:'visible',identity:'unestablished',distance:'within-torchlight'});
  assert.equal(getStatusModel(result.state).encounter,'Creature visible · within torchlight');
  assert.doesNotMatch(narrateAuthoritativeResult(result),/goblin|two creatures|30 feet/i);
});
test('Moldvay B21 illumination limit is not an automatic long-range sight/identity claim',()=>{
  const s=prepare(1);
  assert.equal(s.activeEncounter.distanceFeet,70);
  const result=perceive(s,clearRecognized);
  assert.deepEqual(result.state.activeEncounter.visibility,unknown);
  assert.deepEqual(result.outcomes,[{kind:'encounter.perception',visibility:unknown}]);
  assert.match(narrateAuthoritativeResult(result),/does not establish that none is present/);
  assert.doesNotMatch(narrateAuthoritativeResult(result),/goblin|70 feet/);
});
test('blocked line of sight and absent recorded torch both leave presence unknown',()=>{
  const blocked=perceive(prepare(61),obstructed);
  const unlit=perceive(prepare(61,false),clearRecognized);
  assert.deepEqual(blocked.state.activeEncounter.visibility,unknown);
  assert.deepEqual(unlit.state.activeEncounter.visibility,unknown);
  assert.equal(unlit.state.light.kind,'none');
  assert.equal(getStatusModel(blocked.state).encounter,'Perception assessed · no confirmed sighting');
  assert.equal(unlit.state.activeEncounter.evidenceId,clearRecognized.id);
  assert.equal(unlit.state.rng.draws,5);
});
test('invalid, stale, fabricated, unknown, or repeated evidence is refused atomically',()=>{
  const original=prepare(61);
  const forged=[
    {...clearRecognized,id:'secret-room'},
    {...clearRecognized,lineOfSight:'through-wall'},
    {...clearRecognized,source:'Invented'},
    {...clearRecognized,hiddenReferee:'treasure'},
    {...clearRecognized,recognition:'dragon'},
    null,{},42
  ];
  for(const candidate of forged) {
    assert.throws(()=>validatePerceptionEvidence(candidate));
    const refused=perceive(original,candidate);
    assert.equal(refused.accepted,false);
    assert.strictEqual(refused.state,original);
    assert.equal(refused.state.rng.draws,5);
  }
  const stale={...intent(original,'encounter.perceive'),baseRevision:original.revision-1};
  const extra={...intent(original,'encounter.perceive'),operations:[{kind:'encounter.perceive',visible:true}]};
  const double={...intent(original,'encounter.perceive'),operations:[{kind:'encounter.perceive'},{kind:'dungeon.rest'}]};
  const wrongContact={...levelOneGoblinContact,monster:'dragon'};
  for(const p of [stale,extra,double]) {
    const refused=executeProposal(original,p);
    assert.equal(refused.accepted,false);
    assert.strictEqual(refused.state,original);
  }
  assert.equal(perceive(original,clearRecognized,wrongContact).accepted,false);
  const finished=perceive(original).state;
  for(const kind of ['encounter.perceive','encounter.surprise','encounter.establish','dungeon.rest']){
    const rejected=executeProposal(finished,intent(finished,kind));
    assert.equal(rejected.accepted,false);
    assert.strictEqual(rejected.state,finished);
  }
  assert.equal(executeProposal(createDemoState(61),intent(createDemoState(61),'encounter.perceive')).accepted,false);
});
test('player-visible encounter result cannot expose unestablished distance, count, or opponent dice',()=>{
  for(const [seed,evidence] of [[61,clearRecognized],[61,clearUnrecognized],[61,obstructed],[1,clearRecognized]]) {
    const result=perceive(prepare(seed),evidence);
    const publicText=JSON.stringify(result.outcomes)+' '+narrateAuthoritativeResult(result);
    for(const term of ['numberAppearing','distanceFeet','monsterRoll','partyRoll','packetId','evidenceId','private','2 goblins'])
      assert.ok(!publicText.includes(term),term);
  }
});
test('v4 contact and surprise migrate exactly to v5 with no inferred perception, RNG or light',()=>{
  const state=prepare(61);
  const {evidenceId,...oldActive}=state.activeEncounter;
  const {lastEncounter,...v4State}=state;const v4={...v4State,schemaVersion:4,activeEncounter:oldActive};
  const migrated=decodeSave(JSON.stringify(v4));
  assert.equal(migrated.schemaVersion,SCHEMA_VERSION);
  assert.equal(migrated.activeEncounter.evidenceId,null);
  assert.deepEqual(migrated.activeEncounter.visibility,unknown);
  assert.deepEqual(migrated.rng,state.rng);
  assert.deepEqual(migrated.light,state.light);
  assert.deepEqual(perceive(migrated),perceive(state));
  assert.deepEqual(decodeSave(encodeSave(migrated)),migrated);
  assert.throws(()=>migrateSaveState({...v4,activeEncounter:{...oldActive,privateNotes:'no'}}));
  assert.throws(()=>migrateSaveState({...v4,activeEncounter:{...oldActive,visibility:{...unknown,presence:'visible'}}}));
});
test('v5 visibility is validated against actual source evidence and light/range',()=>{
  for(const [seed,packet] of [[61,clearRecognized],[61,clearUnrecognized],[61,obstructed],[1,clearRecognized]]){
    const state=perceive(prepare(seed),packet).state;
    assert.deepEqual(decodeSave(encodeSave(state)),state);
    const a=state.activeEncounter;
    const tampered=[
      {visibility:{...a.visibility,distance:'70 feet'}},
      {visibility:{...a.visibility,identity:'dragon'}},
      {visibility:{...a.visibility,presence:'visible',identity:'goblin',distance:'within-torchlight'}},
      {evidenceId:'unknown-packet'},
      {stage:'surprise-adjudicated'},
      {visibility:{presence:'visible',identity:'goblin',distance:'within-torchlight',secret:true}},
      {surprise:null}
    ];
    for(const patch of tampered) {
      const candidate={...state,activeEncounter:{...a,...patch}};
      // A redundant no-op patch in the lit recognizable seed is valid; skip it.
      if(JSON.stringify(candidate)===JSON.stringify(state))continue;
      assert.throws(()=>assertValidState(candidate));
    }
    assert.equal(state.rng.draws,5);
  }
});
test('offline parser cannot forge recognition or environmental sight evidence',()=>{
  assert.deepEqual(parseLocalIntent('assess encounter visibility',9),
    {contract:'bx.intent.v1',baseRevision:9,operations:[{kind:'encounter.perceive'}]});
  for(const phrase of ['I see goblins','assess encounter visibility and see dragons',
    'identify all enemies now','set line of sight clear','assess encounter visibility at 20 feet'])
    assert.equal(parseLocalIntent(phrase,9),null);
});
