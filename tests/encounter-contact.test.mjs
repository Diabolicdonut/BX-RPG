import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,executeProposal,assertValidState,migrateSaveState} from '../src/state/state.js';
import {encodeSave,decodeSave} from '../src/state/storage.js';
import {rollDie} from '../src/state/rng.js';
import {levelOneGoblinContact as fixture} from '../src/content/encounters/level1-goblin.js';
import {validateEncounterPacket} from '../src/rules/encounter-data.js';
import {parseLocalIntent,narrateAuthoritativeResult} from '../src/ai/contract.js';
import {getStatusModel} from '../src/ui/view.js';
const intent=(s,kind='encounter.establish')=>({contract:'bx.intent.v1',baseRevision:s.revision,operations:[{kind}]});
const rest=s=>executeProposal(s,intent(s,'dungeon.rest'));
function triggered(){
  for(let seed=0;seed<5000;seed++){
    const first=rollDie({state:seed,draws:0},6);
    if(first.value!==1)continue;
    const initial=createDemoState(seed);
    const one=rest(initial),two=rest(one.state);
    assert.equal(two.accepted,true);
    return two.state;
  }
  throw Error('No deterministic trigger seed');
}
test('B53 public packet contains only source-bound, non-secret fields, count 2 within 2–8',()=>{
  assert.deepEqual(Object.keys(fixture).sort(),['format','id','level','monster','numberAppearing','distance','reference'].sort());
  assert.equal(validateEncounterPacket(fixture),fixture);
  assert.equal(fixture.level,1);assert.equal(fixture.monster,'goblin');assert.equal(fixture.numberAppearing,2);
  assert.deepEqual(fixture.distance,{dice:2,sides:6,feetPerPoint:10});
});
test('pending check remains hidden by public UI before any contact is established',()=>{
  const before=triggered();
  assert.deepEqual(before.pendingEncounter,{kind:'wandering',dueTurn:3});
  assert.equal(getStatusModel(before).encounter,'None');
  assert.equal(before.turns,2);
});
test('one typed referee action converts pending event to contact using two seeded B/X dice, without consuming a turn',()=>{
  const pending=triggered(),proposal=intent(pending);
  const first=rollDie(pending.rng,6),second=rollDie(first.rng,6);
  const result=executeProposal(pending,proposal);
  assert.ok(result.accepted);
  assert.equal(result.state.pendingEncounter,null);
  assert.equal(result.state.activeEncounter.distanceFeet,(first.value+second.value)*10);
  assert.equal(result.state.activeEncounter.packetId,fixture.id);
  assert.equal(result.state.activeEncounter.numberAppearing,2);
  assert.equal(result.state.activeEncounter.dueTurn,3);
  assert.equal(result.state.activeEncounter.stage,'awaiting-encounter-adjudication');
  assert.equal(result.state.rng.draws,pending.rng.draws+2);
  assert.deepEqual(result.state.rng,second.rng);
  assert.equal(result.state.turns,2);assert.deepEqual(result.state.light,pending.light);
  assert.equal(result.state.revision,pending.revision+1);
  assert.deepEqual(result.outcomes,[{kind:'encounter.contact',stage:'awaiting-referee'}]);
  assert.equal(getStatusModel(result.state).encounter,'Contact awaiting referee');
  assert.equal(pending.activeEncounter,null);
  assertValidState(result.state);
});
test('contact results do not disclose monster, count, distance, private rolls, or visibility guesses',()=>{
  const result=executeProposal(triggered(),intent(triggered()));
  assert.ok(result.accepted);
  const outcome=JSON.stringify(result.outcomes);const story=narrateAuthoritativeResult(result);
  for(const secret of ['goblin','distanceFeet','numberAppearing','packetId','2d6','surprise','reaction']) {
    assert.ok(!outcome.toLowerCase().includes(secret.toLowerCase()),secret);
    assert.ok(!story.toLowerCase().includes(secret.toLowerCase()),secret);
  }
  assert.match(story,/further referee adjudication/i);
});
test('rejected unknown/stale/referee-forged proposals and unsupported packets do not draw RNG or change state',()=>{
  const pending=triggered();
  const mutations=[
    {...intent(pending),baseRevision:pending.revision-1},
    {...intent(pending),operations:[{kind:'encounter.establish',monster:'dragon'}]},
    {...intent(pending),operations:[{kind:'encounter.establish',distanceFeet:20}]},
    {...intent(pending),operations:[{kind:'encounter.establish',value:6}]},
    {...intent(pending),operations:[{kind:'encounter.establish'},{kind:'dungeon.rest'}]},
    {...intent(pending),extra:1},
    intent(pending,'encounter.clear'),
  ];
  for(const proposal of mutations){const result=executeProposal(pending,proposal);assert.equal(result.accepted,false);assert.strictEqual(result.state,pending);}
  const badPackets=[
    {...fixture,id:'basic-b53-level1-dragon'},
    {...fixture,numberAppearing:0},
    {...fixture,numberAppearing:9},
    {...fixture,distance:{dice:3,sides:6,feetPerPoint:10}},
    {...fixture,hidden:'private door'},
    {...fixture,reference:'Unknown'},
    null,{},
  ];
  for(const packet of badPackets){
    assert.throws(()=>validateEncounterPacket(packet));
    const result=executeProposal(pending,intent(pending),packet);
    assert.equal(result.accepted,false);assert.strictEqual(result.state,pending);
  }
  assert.equal(pending.rng.draws,1);assert.equal(pending.turns,2);
});
test('cannot establish nonexistent contact, repeat resolution or skip unresolved contact with another turn',()=>{
  const empty=createDemoState(0);const refusal=executeProposal(empty,intent(empty));
  assert.equal(refusal.accepted,false);assert.strictEqual(refusal.state,empty);
  const resolved=executeProposal(triggered(),intent(triggered())).state;
  for(const kind of ['encounter.establish','dungeon.rest']) {
    const r=executeProposal(resolved,intent(resolved,kind));
    assert.equal(r.accepted,false);assert.strictEqual(r.state,resolved);
  }
  assert.equal(resolved.turns,2);
});
test('identical seed and migrated/reloaded pending event reproduce full contact, without reroll after load',()=>{
  const pending=triggered();
  const oldSave={...pending,schemaVersion:2};delete oldSave.activeEncounter;
  const migrated=decodeSave(JSON.stringify(oldSave));
  assert.equal(migrated.schemaVersion,3);assert.equal(migrated.activeEncounter,null);
  assert.deepEqual(migrated.rng,pending.rng);assert.deepEqual(migrated.pendingEncounter,pending.pendingEncounter);
  const a=executeProposal(pending,intent(pending));const b=executeProposal(migrated,intent(migrated));
  assert.deepEqual(a,b);
  const reloaded=decodeSave(encodeSave(a.state));
  assert.deepEqual(reloaded,a.state);
  assert.deepEqual(executeProposal(reloaded,intent(reloaded)),executeProposal(a.state,intent(a.state)));
  assert.equal(reloaded.rng.draws,pending.rng.draws+2);
});
test('schema v1 migration still creates no light or encounters; rejects forged saves and unknown fields',()=>{
  const s=createDemoState(12);
  const old={schemaVersion:1,ruleset:s.ruleset,revision:0,character:s.character,turns:0,rng:s.rng,journal:[]};
  const fresh=migrateSaveState(old);
  assert.deepEqual(fresh.light,{kind:'none',remainingTurns:0});
  assert.equal(fresh.pendingEncounter,null);assert.equal(fresh.activeEncounter,null);
  const established=executeProposal(triggered(),intent(triggered())).state;
  for(const patch of [
    {activeEncounter:{...established.activeEncounter,monster:'dragon'}},
    {activeEncounter:{...established.activeEncounter,extraHidden:'x'}},
    {activeEncounter:false},{activeEncounter:{...established.activeEncounter,distanceFeet:15}},
    {pendingEncounter:{kind:'wandering',dueTurn:3}}
  ])assert.throws(()=>assertValidState({...established,...patch}));
});
test('exact offline whitelist is not a live AI and never accepts player-supplied monster facts',()=>{
  const baseRevision=4;
  assert.deepEqual(parseLocalIntent('establish pending encounter',baseRevision),
    {contract:'bx.intent.v1',baseRevision,operations:[{kind:'encounter.establish'}]});
  for(const phrase of ['I summon 10 goblins','establish pending encounter with dragons',
    'resolve encounter and win','we attack the goblin','encounter.establish'])
    assert.equal(parseLocalIntent(phrase,baseRevision),null);
});
