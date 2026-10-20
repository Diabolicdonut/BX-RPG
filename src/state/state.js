import {sampleCharacter} from '../content/demo.js';
import {RULESET} from '../rules/scope.js';
import {rollDie} from './rng.js';
import {validateEncounterPacket} from '../rules/encounter-data.js';
import {levelOneGoblinContact} from '../content/encounters/level1-goblin.js';

export const SCHEMA_VERSION = 3;
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const exact = (v, keys) => object(v) && Object.keys(v).length === keys.length && keys.every(k=>own(v,k));
const nonnegative = v => Number.isSafeInteger(v) && v >= 0;
const initialKeys = ['schemaVersion','ruleset','revision','character','turns','rng','journal'];

export function createDemoState(seed = 0x19811011) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw Error('Invalid seed');
  return {schemaVersion:SCHEMA_VERSION,ruleset:RULESET,revision:0,
    character:sampleCharacter(),turns:0,rng:{state:seed>>>0,draws:0},journal:[],
    light:{kind:'torch',remainingTurns:6},pendingEncounter:null,activeEncounter:null};
}

function validShared(s) {
  const c=s.character,r=s.rng;
  return s.ruleset===RULESET && nonnegative(s.revision) && nonnegative(s.turns) &&
    exact(c,['id','name','classId','level','hp','hpMax','ac','xp','abilities']) &&
    c.id==='demo-fighter' && c.name==='Sample Fighter' && c.classId==='fighter' &&
    c.level===1 && c.hp===4 && c.hpMax===4 && c.ac===9 && c.xp===0 &&
    exact(c.abilities,['str','int','wis','dex','con','cha']) &&
    ['str','int','wis','dex','con','cha'].every(k=>c.abilities[k]===10) &&
    exact(r,['state','draws']) && Number.isInteger(r.state) && r.state>=0 && r.state<=0xffffffff &&
    nonnegative(r.draws) && Array.isArray(s.journal) && s.journal.length<=20;
}
function validDiagnostic(e) {
  return exact(e,['kind','sides','value']) && e.kind==='diagnostic.roll' &&
    e.sides===6 && Number.isInteger(e.value) && e.value>=1 && e.value<=6;
}
function validRest(e,s) {
  return exact(e,['kind','turn','lightRemaining','torchExpired']) && e.kind==='dungeon.rest' &&
    Number.isSafeInteger(e.turn) && e.turn>=1 && e.turn<=s.turns &&
    Number.isInteger(e.lightRemaining) && e.lightRemaining>=0 && e.lightRemaining<=6 &&
    typeof e.torchExpired==='boolean';
}
function validContact(e,s){
  return exact(e,['kind','dueTurn','packetId','monster','numberAppearing','distanceFeet','stage']) &&
    e.kind==='wandering-contact' && e.dueTurn===s.turns+1 && s.turns>0 &&
    s.turns%2===0 && e.packetId===levelOneGoblinContact.id &&
    e.monster==='goblin' && Number.isSafeInteger(e.numberAppearing) &&
    e.numberAppearing>=2 && e.numberAppearing<=8 &&
    Number.isSafeInteger(e.distanceFeet) && e.distanceFeet>=20 &&
    e.distanceFeet<=120 && e.distanceFeet%10===0 &&
    e.stage==='awaiting-encounter-adjudication';
}
function validContactRecord(e,s){
  return exact(e,['kind','dueTurn']) && e.kind==='encounter.contact' &&
    Number.isSafeInteger(e.dueTurn) && e.dueTurn>=1 && e.dueTurn<=s.turns+1;
}
export function assertValidState(state) {
  if (!exact(state,[...initialKeys,'light','pendingEncounter','activeEncounter']) || state.schemaVersion!==SCHEMA_VERSION ||
    !validShared(state) || !state.journal.every(e=>validDiagnostic(e)||validRest(e,state)||validContactRecord(e,state)) ||
    !exact(state.light,['kind','remainingTurns']) ||
    !['torch','none'].includes(state.light.kind) ||
    !Number.isInteger(state.light.remainingTurns) || state.light.remainingTurns<0 ||
    state.light.remainingTurns>6 || (state.light.kind==='none' && state.light.remainingTurns!==0) ||
    !(state.pendingEncounter===null ||
      (exact(state.pendingEncounter,['kind','dueTurn']) &&
      state.pendingEncounter.kind==='wandering' &&
      state.turns>0 && state.turns%2===0 &&
      state.pendingEncounter.dueTurn===state.turns+1)) ||
    !(state.activeEncounter===null||validContact(state.activeEncounter,state)) ||
    (state.pendingEncounter!==null && state.activeEncounter!==null))
    throw Error('Invalid or unsupported B/X demo save');
  return state;
}

// Migrate only exact historical v1/v2 save envelopes. Never infer missing
// resources, encounters or random results. All legacy fields remain unchanged.
export function migrateSaveState(state) {
  if(state?.schemaVersion===SCHEMA_VERSION)return assertValidState(state);
  if(exact(state,[...initialKeys,'light','pendingEncounter']) && state.schemaVersion===2 &&
    validShared(state) && state.journal.every(e=>validDiagnostic(e)||validRest(e,state))) {
    // Validate the original v2 envelope separately before adding new fields.
    const old={...state,schemaVersion:SCHEMA_VERSION,activeEncounter:null};
    return assertValidState(old);
  }
  if(!exact(state,initialKeys) || state.schemaVersion!==1 || !validShared(state) ||
      !state.journal.every(validDiagnostic)) throw Error('Invalid or unsupported B/X demo save');
  return assertValidState({...state,schemaVersion:SCHEMA_VERSION,
    light:{kind:'none',remainingTurns:0},pendingEncounter:null,activeEncounter:null});
}

function validProposal(state,p) {
  if (!exact(p,['contract','baseRevision','operations']) ||
      p.contract!=='bx.intent.v1' || p.baseRevision!==state.revision ||
      !Array.isArray(p.operations) || p.operations.length!==1) return null;
  const op=p.operations[0];
  if (exact(op,['kind','sides']) && op.kind==='diagnostic.roll' && op.sides===6) return 'diagnostic.roll';
  if (exact(op,['kind']) && op.kind==='dungeon.rest') return 'dungeon.rest';
  if (exact(op,['kind']) && op.kind==='encounter.establish') return 'encounter.establish';
  return null;
}
export function executeProposal(state,proposal,encounterPacket=levelOneGoblinContact) {
  assertValidState(state);
  const kind=validProposal(state,proposal);
  if (!kind) return {accepted:false,state,outcomes:[],error:'Unsupported or stale proposal'};
  if (kind==='dungeon.rest' && (state.pendingEncounter||state.activeEncounter))
    return {accepted:false,state,outcomes:[],error:'Encounter adjudication is required before another turn'};
  if (kind==='diagnostic.roll') {
    const roll=rollDie(state.rng,6);
    const outcome={kind:'diagnostic.roll',sides:6,value:roll.value};
    const next={...state,revision:state.revision+1,rng:roll.rng,
      journal:[...state.journal,outcome].slice(-20)};
    assertValidState(next);
    return {accepted:true,state:next,outcomes:[outcome]};
  }
  if(kind==='encounter.establish'){
    // Refuse before touching RNG; no 'no-event' shortcut. Data is supplied
    // as a complete, exact packet, never as an arbitrary AI state patch.
    if(!state.pendingEncounter || state.activeEncounter)
      return {accepted:false,state,outcomes:[],error:'No pending wandering contact to establish'};
    try {validateEncounterPacket(encounterPacket);} catch {
      return {accepted:false,state,outcomes:[],error:'Unsupported encounter data'};
    }
    const first=rollDie(state.rng,6),second=rollDie(first.rng,6);
    const dueTurn=state.pendingEncounter.dueTurn;
    const contact={kind:'wandering-contact',dueTurn,
      packetId:encounterPacket.id,monster:encounterPacket.monster,
      numberAppearing:encounterPacket.numberAppearing,
      distanceFeet:(first.value+second.value)*10,
      stage:'awaiting-encounter-adjudication'};
    // The clock and torch do not advance until the encounter is played.
    // Neither monster nor distance appears in the narration-only outcome.
    const next={...state,revision:state.revision+1,rng:second.rng,
      pendingEncounter:null,activeEncounter:contact,
      journal:[...state.journal,{kind:'encounter.contact',dueTurn}].slice(-20)};
    assertValidState(next);
    return {accepted:true,state:next,outcomes:[{kind:'encounter.contact',stage:'awaiting-referee'}]};
  }
  // Moldvay B19, B21, B53: rest is one ten-minute turn; a lit torch burns
  // one turn; wandering check at the end of each second exploration turn.
  const turn=state.turns+1;
  const remaining=state.light.kind==='torch' ? Math.max(0,state.light.remainingTurns-1) : 0;
  const torchExpired=state.light.kind==='torch' && state.light.remainingTurns===1;
  const outcome={kind:'dungeon.rest',turn,minutes:10,lightKind:state.light.kind,
    lightRemaining:remaining,torchExpired};
  const record={kind:'dungeon.rest',turn,lightRemaining:remaining,torchExpired};
  let rng=state.rng,pendingEncounter=null;
  if(turn%2===0) {
    const check=rollDie(rng,6);rng=check.rng;
    if(check.value===1) pendingEncounter={kind:'wandering',dueTurn:turn+1};
  }
  const next={...state,revision:state.revision+1,turns:turn,rng,
    light:{kind:state.light.kind,remainingTurns:remaining},pendingEncounter,
    journal:[...state.journal,record].slice(-20)};
  assertValidState(next);
  // No encounter-check result or hidden content is supplied to narration.
  return {accepted:true,state:next,outcomes:[outcome]};
}
