import {sampleCharacter} from '../content/demo.js';
import {RULESET} from '../rules/scope.js';
import {rollDie} from './rng.js';
import {validateEncounterPacket} from '../rules/encounter-data.js';
import {levelOneGoblinContact} from '../content/encounters/level1-goblin.js';
import {clearRecognized,knownPerceptionEvidence} from '../content/encounters/public-perception.js';
import {validatePerceptionEvidence,derivePublicVisibility} from '../rules/perception-evidence.js';
import {projectPlayerEncounterKnowledge} from './player-knowledge.js';
import {unpursuedWithdrawal,monsterWithdrawalUnpursued} from '../content/encounters/public-disposition.js';
import {validateDispositionEvidence,dispositionForEvidenceId} from '../rules/disposition-evidence.js';
import {monsterWithdrawalPursued} from '../content/encounters/public-pursuit.js';
import {validatePursuitEvidence} from '../rules/pursuit-evidence.js';
import {publicPursuitRateReview,validatePursuitRateReview} from '../rules/pursuit-rates.js';
import {publicPartyLoadEvidence,validatePublicPartyLoad,canonicalPartyLoad} from '../rules/equipment-evidence.js';
import {publicPursuitRoundBudget,validatePublicPursuitRoundBudget} from '../rules/pursuit-round-budget.js';
import {publicCorridorRouteEvidence,validatePublicCorridorRouteEvidence} from '../rules/pursuit-route.js';
import {publicFirstPursuitRound,validateFirstPursuitRound} from '../rules/pursuit-first-round.js';
import {publicSecondPursuitRound,validateSecondPursuitRound} from '../rules/pursuit-second-round.js';

export const SCHEMA_VERSION = 15;
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const exact = (v, keys) => object(v) && Object.keys(v).length === keys.length && keys.every(k=>own(v,k));
const nonnegative = v => Number.isSafeInteger(v) && v >= 0;
const initialKeys = ['schemaVersion','ruleset','revision','character','turns','rng','journal'];
const unestablishedVisibility = () => ({
  presence:'unestablished',identity:'unestablished',distance:'unestablished'
});
const d6 = v => Number.isInteger(v) && v>=1 && v<=6;
function surpriseDisposition(party,monster) {
  if(party && monster) return 'mutual-surprise';
  if(party) return 'party-surprised';
  if(monster) return 'monster-surprised';
  return 'neither-surprised';
}
function validSurprise(v) {
  return exact(v,['partyRoll','monsterRoll','partySurprised','monsterSurprised','disposition']) &&
    d6(v.partyRoll) && d6(v.monsterRoll) &&
    v.partySurprised === (v.partyRoll<=2) &&
    v.monsterSurprised === (v.monsterRoll<=2) &&
    v.disposition === surpriseDisposition(v.partySurprised,v.monsterSurprised);
}

export function createDemoState(seed = 0x19811011) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw Error('Invalid seed');
  return {schemaVersion:SCHEMA_VERSION,ruleset:RULESET,revision:0,
    character:sampleCharacter(),turns:0,rng:{state:seed>>>0,draws:0},journal:[],
    light:{kind:'torch',remainingTurns:6},pendingEncounter:null,activeEncounter:null,lastEncounter:null};
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
const visibilityKeys=['presence','identity','distance'];
function sameVisibility(a,b){
  return exact(a,visibilityKeys)&&visibilityKeys.every(k=>a[k]===b[k]);
}
function validContact(e,s){
  return exact(e,['kind','dueTurn','packetId','monster','numberAppearing','distanceFeet','stage','surprise','visibility','evidenceId']) &&
    e.kind==='wandering-contact' && e.dueTurn===s.turns+1 && s.turns>0 &&
    s.turns%2===0 && e.packetId===levelOneGoblinContact.id &&
    e.monster==='goblin' && Number.isSafeInteger(e.numberAppearing) &&
    e.numberAppearing>=2 && e.numberAppearing<=8 &&
    Number.isSafeInteger(e.distanceFeet) && e.distanceFeet>=20 &&
    e.distanceFeet<=120 && e.distanceFeet%10===0 &&
    exact(e.visibility,visibilityKeys) &&
    ((e.stage==='awaiting-encounter-adjudication' && e.surprise===null &&
      e.evidenceId===null && sameVisibility(e.visibility,unestablishedVisibility())) ||
     (e.stage==='surprise-adjudicated' && validSurprise(e.surprise) &&
      e.evidenceId===null && sameVisibility(e.visibility,unestablishedVisibility())) ||
     ((e.stage==='perception-adjudicated' || e.stage==='awaiting-referee-continuation' ||
       e.stage==='awaiting-pursuit-adjudication' ||
       e.stage==='awaiting-party-rate-evidence' ||
       e.stage==='awaiting-chase-adjudication' ||
       e.stage==='awaiting-route-and-round-evidence' ||
       e.stage==='awaiting-first-pursuit-round-evidence' ||
       e.stage==='awaiting-second-pursuit-round-evidence' ||
       e.stage==='awaiting-third-pursuit-round-boundary' && validSurprise(e.surprise) &&
      typeof e.evidenceId==='string' && knownPerceptionEvidence(e.evidenceId)!==null &&
      sameVisibility(e.visibility,derivePublicVisibility(
        knownPerceptionEvidence(e.evidenceId),s.light,e.distanceFeet))));
}
function validLastEncounter(e,s) {
  if(!exact(e,['kind','disposition','closedTurn','lightBefore','contact','sourceId']) ||
    e.kind!=='concluded-wandering' ||
    e.disposition!==dispositionForEvidenceId(e.sourceId) ||
    !Number.isSafeInteger(e.closedTurn) ||
    e.closedTurn<3 || e.closedTurn>s.turns ||
    !exact(e.lightBefore,['kind','remainingTurns']) ||
    !['torch','none'].includes(e.lightBefore.kind) ||
    !Number.isSafeInteger(e.lightBefore.remainingTurns) ||
    e.lightBefore.remainingTurns<0 || e.lightBefore.remainingTurns>6 ||
    (e.lightBefore.kind==='none' && e.lightBefore.remainingTurns!==0) ||
    e.contact?.stage!=='awaiting-referee-continuation' ||
    e.contact?.dueTurn!==e.closedTurn)
    return false;
  return validContact(e.contact,{...s,turns:e.closedTurn-1,light:e.lightBefore});
}
function validCloseRecord(e,s){
  return exact(e,['kind','turn','disposition']) &&
    e.kind==='encounter.closed' &&
    (e.disposition==='party-withdrew-unpursued' ||
     e.disposition==='monsters-withdrew-unpursued') &&
    Number.isSafeInteger(e.turn) && e.turn>=1 && e.turn<=s.turns;
}
function validContactRecord(e,s){
  return exact(e,['kind','dueTurn']) && e.kind==='encounter.contact' &&
    Number.isSafeInteger(e.dueTurn) && e.dueTurn>=1 && e.dueTurn<=s.turns+1;
}
function validSurpriseRecord(e,s) {
  return exact(e,['kind','dueTurn']) && e.kind==='encounter.surprise' &&
    Number.isSafeInteger(e.dueTurn) && e.dueTurn>=1 && e.dueTurn<=s.turns+1;
}
function validHandoffRecord(e,s) {
  return exact(e,['kind','dueTurn']) && e.kind==='encounter.handoff' &&
    Number.isSafeInteger(e.dueTurn) && e.dueTurn>=1 && e.dueTurn<=s.turns+1;
}
function validPursuitRecord(e,s) {
  return exact(e,['kind','dueTurn','evidenceId']) &&
    e.kind==='encounter.pursuit-decision' &&
    Number.isSafeInteger(e.dueTurn) && e.dueTurn>=1 && e.dueTurn<=s.turns+1 &&
    e.evidenceId===monsterWithdrawalPursued.id;
}
function validRateRecord(e,s) {
  return exact(e,['kind','dueTurn','reviewId']) &&
    e.kind==='encounter.pursuit-rate-review' &&
    Number.isSafeInteger(e.dueTurn) && e.dueTurn>=1 && e.dueTurn<=s.turns+1 &&
    e.reviewId===publicPursuitRateReview.id;
}
function validEquipmentRecord(e,s) {
  return exact(e,['kind','dueTurn','evidenceId','weightCoins','band']) &&
    e.kind==='encounter.party-load-established' &&
    Number.isSafeInteger(e.dueTurn)&&e.dueTurn>=1&&e.dueTurn<=s.turns+1 &&
    e.evidenceId===publicPartyLoadEvidence.id &&
    e.weightCoins===canonicalPartyLoad.totalCoins &&
    e.band===canonicalPartyLoad.band;
}
function validBudgetRecord(e,s) {
  return exact(e,['kind','dueTurn','budgetId']) &&
    e.kind==='encounter.pursuit-round-budget-reviewed' &&
    Number.isSafeInteger(e.dueTurn) && e.dueTurn>=1 &&
    e.dueTurn<=s.turns+1 && e.budgetId===publicPursuitRoundBudget.id;
}
function validRouteRecord(e,s) {
  return exact(e,['kind','dueTurn','routeId']) &&
    e.kind==='encounter.pursuit-route-established' &&
    Number.isSafeInteger(e.dueTurn)&&e.dueTurn>=1&&e.dueTurn<=s.turns+1 &&
    e.routeId===publicCorridorRouteEvidence.id;
}
function validFirstRoundRecord(e,s) {
  if(!exact(e,['kind','dueTurn','evidenceId','round','elapsedSeconds',
      'partyMoveFeet','monsterMoveFeet','sightAfter','result']))return false;
  const c=s.activeEncounter;
  if(e.kind!=='encounter.pursuit-first-round'||!c||
     e.dueTurn!==c.dueTurn||
     e.evidenceId!==publicFirstPursuitRound.id||
     e.round!==1||e.elapsedSeconds!==10||
     e.partyMoveFeet!==publicFirstPursuitRound.partyMoveFeet||
     e.monsterMoveFeet!==publicFirstPursuitRound.monsterMoveFeet||
     e.sightAfter!=='visible'||e.result!=='unresolved')return false;
  try {return validateFirstPursuitRound(publicFirstPursuitRound,c,s.light).sightAfter===e.sightAfter;}
  catch {return false;}
}
function validSecondRoundRecord(e,s) {
  if(!exact(e,['kind','dueTurn','evidenceId','round','elapsedSeconds',
      'totalEncounterSeconds','partyMoveFeet','monsterMoveFeet','sightAfter','result']))return false;
  const c=s.activeEncounter;
  if(e.kind!=='encounter.pursuit-second-round'||!c||
     e.dueTurn!==c.dueTurn||e.evidenceId!==publicSecondPursuitRound.id||
     e.round!==2||e.elapsedSeconds!==10||e.totalEncounterSeconds!==20||
     e.partyMoveFeet!==publicSecondPursuitRound.partyMoveFeet||
     e.monsterMoveFeet!==publicSecondPursuitRound.monsterMoveFeet||
     e.sightAfter!=='visible'||e.result!=='unresolved')return false;
  try {return validateSecondPursuitRound(publicSecondPursuitRound,c,s.light).sightAfter===e.sightAfter;}
  catch {return false;}
}
function validPerceptionRecord(e,s) {
  return exact(e,['kind','dueTurn']) && e.kind==='encounter.perception' &&
    Number.isSafeInteger(e.dueTurn) && e.dueTurn>=1 && e.dueTurn<=s.turns+1;
}
function validEncounterTrail(s) {
  const stage=s.activeEncounter?.stage, last=s.journal.at(-1),prev=s.journal.at(-2),before=s.journal.at(-3),fourth=s.journal.at(-4),fifth=s.journal.at(-5),sixth=s.journal.at(-6),seventh=s.journal.at(-7);
  const due=s.activeEncounter?.dueTurn;
  const pursuit=e=>e?.kind==='encounter.pursuit-decision' &&
    e.dueTurn===due && e.evidenceId===monsterWithdrawalPursued.id;
  const reviewed=e=>e?.kind==='encounter.pursuit-rate-review' &&
    e.dueTurn===due && e.reviewId===publicPursuitRateReview.id;
  const witnessed=e=>e?.kind==='encounter.party-load-established' &&
    e.dueTurn===due && e.evidenceId===publicPartyLoadEvidence.id &&
    e.weightCoins===canonicalPartyLoad.totalCoins &&
    e.band===canonicalPartyLoad.band;
  const budgeted=e=>e?.kind==='encounter.pursuit-round-budget-reviewed' &&
    e.dueTurn===due && e.budgetId===publicPursuitRoundBudget.id;
  const routed=e=>e?.kind==='encounter.pursuit-route-established' &&
    e.dueTurn===due && e.routeId===publicCorridorRouteEvidence.id;
  const advanced=e=>e?.kind==='encounter.pursuit-first-round'&&
    validFirstRoundRecord(e,s)&&e.dueTurn===due;
  const second=e=>e?.kind==='encounter.pursuit-second-round'&&
    validSecondRoundRecord(e,s)&&e.dueTurn===due;
  if(stage==='awaiting-third-pursuit-round-boundary')
    return s.activeEncounter.visibility.presence==='visible'&&
      pursuit(seventh)&&reviewed(sixth)&&witnessed(fifth)&&
      budgeted(fourth)&&routed(before)&&advanced(prev)&&second(last);
  if(stage==='awaiting-second-pursuit-round-evidence')
    return s.activeEncounter.visibility.presence==='visible' &&
      pursuit(sixth)&&reviewed(fifth)&&witnessed(fourth)&&budgeted(before)&&
      routed(prev)&&advanced(last);
  if(stage==='awaiting-first-pursuit-round-evidence')
    return s.activeEncounter.visibility.presence==='visible' &&
      pursuit(fifth)&&reviewed(fourth)&&witnessed(before)&&budgeted(prev)&&
      routed(last);
  if(stage==='awaiting-route-and-round-evidence')
    return s.activeEncounter.visibility.presence==='visible' &&
      pursuit(fourth)&&reviewed(before)&&witnessed(prev)&&budgeted(last);
  if(stage==='awaiting-chase-adjudication')
    return s.activeEncounter.visibility.presence==='visible' &&
      pursuit(before)&&reviewed(prev)&&witnessed(last);
  if(stage==='awaiting-party-rate-evidence')
    return s.activeEncounter.visibility.presence==='visible' &&
      pursuit(prev)&&reviewed(last);
  if(stage==='awaiting-pursuit-adjudication')
    return s.activeEncounter.visibility.presence==='visible'&&pursuit(last);
  return !['encounter.pursuit-decision','encounter.pursuit-rate-review',
    'encounter.party-load-established','encounter.pursuit-round-budget-reviewed',
    'encounter.pursuit-route-established','encounter.pursuit-first-round',
    'encounter.pursuit-second-round'].includes(last?.kind);
}
export function assertValidState(state) {
  if (!exact(state,[...initialKeys,'light','pendingEncounter','activeEncounter','lastEncounter']) || state.schemaVersion!==SCHEMA_VERSION ||
    !validShared(state) || !state.journal.every(e=>validDiagnostic(e)||validRest(e,state)||validContactRecord(e,state)||validSurpriseRecord(e,state)||validPerceptionRecord(e,state)||validHandoffRecord(e,state)||validCloseRecord(e,state)||validPursuitRecord(e,state)||validRateRecord(e,state)||validEquipmentRecord(e,state)||validBudgetRecord(e,state)||validRouteRecord(e,state)||validFirstRoundRecord(e,state)||validSecondRoundRecord(e,state)) ||
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
    (state.pendingEncounter!==null && state.activeEncounter!==null) ||
    !(state.lastEncounter===null || validLastEncounter(state.lastEncounter,state)) ||
    !validEncounterTrail(state))
    throw Error('Invalid or unsupported B/X demo save');
  return state;
}

// Exact historical save migrations: no new dice rolls, visibility, or resources.
export function migrateSaveState(state) {
  if(state?.schemaVersion===SCHEMA_VERSION)return assertValidState(state);
  if(exact(state,[...initialKeys,'light','pendingEncounter','activeEncounter','lastEncounter']) &&
    state.schemaVersion===14 && validShared(state) &&
    state.activeEncounter?.stage!=='awaiting-third-pursuit-round-boundary' &&
    state.journal.every(e=>validDiagnostic(e)||validRest(e,state)||
      validContactRecord(e,state)||validSurpriseRecord(e,state)||
      validPerceptionRecord(e,state)||validHandoffRecord(e,state)||
      validCloseRecord(e,state)||validPursuitRecord(e,state)||
      validRateRecord(e,state)||validEquipmentRecord(e,state)||
      validBudgetRecord(e,state)||validRouteRecord(e,state)||validFirstRoundRecord(e,state))) {
    return assertValidState({...state,schemaVersion:SCHEMA_VERSION});
  }
  if(exact(state,[...initialKeys,'light','pendingEncounter','activeEncounter','lastEncounter']) &&
    state.schemaVersion===13 && validShared(state) &&
    state.activeEncounter?.stage!=='awaiting-second-pursuit-round-evidence' &&
    state.journal.every(e=>validDiagnostic(e)||validRest(e,state)||
      validContactRecord(e,state)||validSurpriseRecord(e,state)||
      validPerceptionRecord(e,state)||validHandoffRecord(e,state)||
      validCloseRecord(e,state)||validPursuitRecord(e,state)||
      validRateRecord(e,state)||validEquipmentRecord(e,state)||
      validBudgetRecord(e,state)||validRouteRecord(e,state))) {
    return assertValidState({...state,schemaVersion:SCHEMA_VERSION});
  }
  if(exact(state,[...initialKeys,'light','pendingEncounter','activeEncounter','lastEncounter']) &&
    state.schemaVersion===12 && validShared(state) &&
    state.activeEncounter?.stage!=='awaiting-first-pursuit-round-evidence' &&
    state.journal.every(e=>validDiagnostic(e)||validRest(e,state)||
      validContactRecord(e,state)||validSurpriseRecord(e,state)||
      validPerceptionRecord(e,state)||validHandoffRecord(e,state)||
      validCloseRecord(e,state)||validPursuitRecord(e,state)||
      validRateRecord(e,state)||validEquipmentRecord(e,state)||validBudgetRecord(e,state))) {
    return assertValidState({...state,schemaVersion:SCHEMA_VERSION});
  }
  if(exact(state,[...initialKeys,'light','pendingEncounter','activeEncounter','lastEncounter']) &&
    state.schemaVersion===11 && validShared(state) &&
    state.activeEncounter?.stage!=='awaiting-route-and-round-evidence' &&
    state.journal.every(e=>validDiagnostic(e)||validRest(e,state)||
      validContactRecord(e,state)||validSurpriseRecord(e,state)||
      validPerceptionRecord(e,state)||validHandoffRecord(e,state)||
      validCloseRecord(e,state)||validPursuitRecord(e,state)||
      validRateRecord(e,state)||validEquipmentRecord(e,state))) {
    return assertValidState({...state,schemaVersion:SCHEMA_VERSION});
  }
  if(exact(state,[...initialKeys,'light','pendingEncounter','activeEncounter','lastEncounter']) &&
    state.schemaVersion===10 && validShared(state) &&
    state.activeEncounter?.stage!=='awaiting-chase-adjudication' &&
    state.journal.every(e=>validDiagnostic(e)||validRest(e,state)||
      validContactRecord(e,state)||validSurpriseRecord(e,state)||
      validPerceptionRecord(e,state)||validHandoffRecord(e,state)||
      validCloseRecord(e,state)||validPursuitRecord(e,state)||validRateRecord(e,state))) {
    // v10 history cannot retroactively assert public v11 equipment evidence.
    return assertValidState({...state,schemaVersion:SCHEMA_VERSION});
  }
  if(exact(state,[...initialKeys,'light','pendingEncounter','activeEncounter','lastEncounter']) &&
    state.schemaVersion===9 && validShared(state) &&
    state.activeEncounter?.stage!=='awaiting-party-rate-evidence' &&
    state.journal.every(e=>validDiagnostic(e)||validRest(e,state)||validContactRecord(e,state)||
      validSurpriseRecord(e,state)||validPerceptionRecord(e,state)||validHandoffRecord(e,state)||
      validCloseRecord(e,state)||validPursuitRecord(e,state))) {
    // Historical v9 records never carried B19 rate review decisions.
    return assertValidState({...state,schemaVersion:SCHEMA_VERSION});
  }
  if(exact(state,[...initialKeys,'light','pendingEncounter','activeEncounter','lastEncounter']) &&
    state.schemaVersion===8 && validShared(state) &&
    state.activeEncounter?.stage!=='awaiting-pursuit-adjudication' &&
    state.journal.every(e=>validDiagnostic(e)||validRest(e,state)||
      validContactRecord(e,state)||validSurpriseRecord(e,state)||
      validPerceptionRecord(e,state)||validHandoffRecord(e,state)||validCloseRecord(e,state))) {
    // No v9-only pursuit event or stage may appear in a historical v8 save.
    return assertValidState({...state,schemaVersion:SCHEMA_VERSION});
  }
  if(exact(state,[...initialKeys,'light','pendingEncounter','activeEncounter','lastEncounter']) &&
    state.schemaVersion===7 && validShared(state) &&
    state.journal.every(e=>validDiagnostic(e)||validRest(e,state)||validContactRecord(e,state)||
      validSurpriseRecord(e,state)||validPerceptionRecord(e,state)||validHandoffRecord(e,state)||
      (validCloseRecord(e,state)&&e.disposition==='party-withdrew-unpursued')) &&
    (state.lastEncounter===null ||
      (state.lastEncounter.sourceId===unpursuedWithdrawal.id &&
       state.lastEncounter.disposition==='party-withdrew-unpursued'))) {
    // Historical v7 saves cannot assert a v8-only monster-withdrawal fact.
    return assertValidState({...state,schemaVersion:SCHEMA_VERSION});
  }
  if(exact(state,[...initialKeys,'light','pendingEncounter','activeEncounter']) && state.schemaVersion===6 &&
    validShared(state) && state.journal.every(e=>validDiagnostic(e)||validRest(e,state)||
      validContactRecord(e,state)||validSurpriseRecord(e,state)||
      validPerceptionRecord(e,state)||validHandoffRecord(e,state))) {
    if(state.activeEncounter!==null&&!exact(state.activeEncounter,
      ['kind','dueTurn','packetId','monster','numberAppearing','distanceFeet',
       'stage','surprise','visibility','evidenceId']))
      throw Error('Invalid v6 encounter envelope');
    return assertValidState({...state,schemaVersion:SCHEMA_VERSION,lastEncounter:null});
  }
  if(exact(state,[...initialKeys,'light','pendingEncounter','activeEncounter']) && state.schemaVersion===5 &&
    validShared(state) && state.journal.every(e=>validDiagnostic(e)||validRest(e,state)||
      validContactRecord(e,state)||validSurpriseRecord(e,state)||validPerceptionRecord(e,state))) {
    // v5 had no handoff stage or handoff journal. Do not let the migration
    // retroactively authorize a future transition or invented observation.
    if(state.activeEncounter!==null &&
      (state.activeEncounter.stage==='awaiting-referee-continuation' ||
      !exact(state.activeEncounter,['kind','dueTurn','packetId','monster',
        'numberAppearing','distanceFeet','stage','surprise','visibility','evidenceId'])))
      throw Error('Invalid v5 contact envelope');
    return assertValidState({...state,schemaVersion:SCHEMA_VERSION,lastEncounter:null});
  }
  if(exact(state,[...initialKeys,'light','pendingEncounter','activeEncounter']) && state.schemaVersion===4 &&
    validShared(state) &&
    state.journal.every(e=>validDiagnostic(e)||validRest(e,state)||validContactRecord(e,state)||validSurpriseRecord(e,state))) {
    if(state.activeEncounter!==null && !exact(state.activeEncounter,
      ['kind','dueTurn','packetId','monster','numberAppearing','distanceFeet','stage','surprise','visibility']))
      throw Error('Invalid v4 contact envelope');
    const activeEncounter=state.activeEncounter===null?null:{...state.activeEncounter,evidenceId:null};
    return assertValidState({...state,schemaVersion:SCHEMA_VERSION,activeEncounter,lastEncounter:null});
  }
  if(exact(state,[...initialKeys,'light','pendingEncounter','activeEncounter']) && state.schemaVersion===3 &&
    validShared(state) &&
    state.journal.every(e=>validDiagnostic(e)||validRest(e,state)||validContactRecord(e,state))) {
    if(state.activeEncounter!==null &&
      !exact(state.activeEncounter,['kind','dueTurn','packetId','monster',
        'numberAppearing','distanceFeet','stage']))
      throw Error('Invalid v3 encounter envelope');
    const contact=state.activeEncounter===null ? null : {
      ...state.activeEncounter,surprise:null,visibility:unestablishedVisibility(),evidenceId:null
    };
    return assertValidState({...state,schemaVersion:SCHEMA_VERSION,activeEncounter:contact,lastEncounter:null});
  }
  if(exact(state,[...initialKeys,'light','pendingEncounter']) && state.schemaVersion===2 &&
    validShared(state) && state.journal.every(e=>validDiagnostic(e)||validRest(e,state))) {
    return assertValidState({...state,schemaVersion:SCHEMA_VERSION,activeEncounter:null,lastEncounter:null});
  }
  if(!exact(state,initialKeys) || state.schemaVersion!==1 || !validShared(state) ||
    !state.journal.every(validDiagnostic)) throw Error('Invalid or unsupported B/X demo save');
  return assertValidState({...state,schemaVersion:SCHEMA_VERSION,
    light:{kind:'none',remainingTurns:0},pendingEncounter:null,activeEncounter:null,lastEncounter:null});
}

function validProposal(state,p) {
  if (!exact(p,['contract','baseRevision','operations']) ||
      p.contract!=='bx.intent.v1' || p.baseRevision!==state.revision ||
      !Array.isArray(p.operations) || p.operations.length!==1) return null;
  const op=p.operations[0];
  if (exact(op,['kind','sides']) && op.kind==='diagnostic.roll' && op.sides===6) return 'diagnostic.roll';
  if (exact(op,['kind']) && op.kind==='dungeon.rest') return 'dungeon.rest';
  if (exact(op,['kind']) && op.kind==='encounter.establish') return 'encounter.establish';
  if (exact(op,['kind']) && op.kind==='encounter.surprise') return 'encounter.surprise';
  if (exact(op,['kind']) && op.kind==='encounter.perceive') return 'encounter.perceive';
  if (exact(op,['kind']) && op.kind==='encounter.handoff') return 'encounter.handoff';
  if (exact(op,['kind']) && op.kind==='encounter.pursuit-second-round') return 'encounter.pursuit-second-round';
  if (exact(op,['kind']) && op.kind==='encounter.pursuit-first-round') return 'encounter.pursuit-first-round';
  if (exact(op,['kind']) && op.kind==='encounter.pursuit-route-establish') return 'encounter.pursuit-route-establish';
  if (exact(op,['kind']) && op.kind==='encounter.pursuit-round-budget-review') return 'encounter.pursuit-round-budget-review';
  if (exact(op,['kind']) && op.kind==='encounter.party-load-establish') return 'encounter.party-load-establish';
  if (exact(op,['kind']) && op.kind==='encounter.pursuit-rate-review') return 'encounter.pursuit-rate-review';
  if (exact(op,['kind']) && op.kind==='encounter.pursuit-decision') return 'encounter.pursuit-decision';
  if (exact(op,['kind']) && op.kind==='encounter.conclude') return 'encounter.conclude';
  if (exact(op,['kind']) && op.kind==='encounter.conclude.monster-withdrawal') return 'encounter.conclude.monster-withdrawal';
  return null;
}
export function executeProposal(state,proposal,encounterPacket=levelOneGoblinContact,
  perceptionEvidence=clearRecognized, dispositionEvidence=undefined,
  pursuitEvidence=monsterWithdrawalPursued,
  rateReview=publicPursuitRateReview,
  partyLoad=publicPartyLoadEvidence,
  roundBudget=publicPursuitRoundBudget,
  routeEvidence=publicCorridorRouteEvidence,
  firstRoundEvidence=publicFirstPursuitRound,
  secondRoundEvidence=publicSecondPursuitRound) {
  assertValidState(state);
  const kind=validProposal(state,proposal);
  if (!kind) return {accepted:false,state,outcomes:[],error:'Unsupported or stale proposal'};
  if (kind==='dungeon.rest' && (state.pendingEncounter||state.activeEncounter))
    return {accepted:false,state,outcomes:[],error:'Encounter adjudication is required before another turn'};
  if (kind==='diagnostic.roll' && ['awaiting-pursuit-adjudication','awaiting-party-rate-evidence','awaiting-chase-adjudication','awaiting-route-and-round-evidence','awaiting-first-pursuit-round-evidence','awaiting-second-pursuit-round-evidence','awaiting-third-pursuit-round-boundary'].includes(state.activeEncounter?.stage))
    return {accepted:false,state,outcomes:[],error:'Pursuit needs referee adjudication first'};
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
      stage:'awaiting-encounter-adjudication',surprise:null,
      visibility:unestablishedVisibility(),evidenceId:null};
    // The clock and torch do not advance until the encounter is played.
    // Neither monster nor distance appears in the narration-only outcome.
    const next={...state,revision:state.revision+1,rng:second.rng,
      pendingEncounter:null,activeEncounter:contact,
      journal:[...state.journal,{kind:'encounter.contact',dueTurn}].slice(-20)};
    assertValidState(next);
    return {accepted:true,state:next,outcomes:[{kind:'encounter.contact',stage:'awaiting-referee'}]};
  }
  if(kind==='encounter.surprise') {
    // Moldvay Basic B23: each side rolls 1d6, 1–2 is surprised.
    // The public goblin fixture has no source-backed exception or modifier.
    // No appearance, distance visibility, initiative or round is inferred.
    const active=state.activeEncounter;
    if(!active || active.stage!=='awaiting-encounter-adjudication' || active.surprise!==null)
      return {accepted:false,state,outcomes:[],error:'No unresolved surprise check'};
    try {
      validateEncounterPacket(encounterPacket);
      if(active.packetId!==encounterPacket.id ||
        active.monster!==encounterPacket.monster ||
        active.numberAppearing!==encounterPacket.numberAppearing)
        throw Error('Encounter packet does not match active contact');
    } catch {
      return {accepted:false,state,outcomes:[],error:'Unsupported encounter data'};
    }
    const party=rollDie(state.rng,6),monster=rollDie(party.rng,6);
    const partySurprised=party.value<=2,monsterSurprised=monster.value<=2;
    const surprise={partyRoll:party.value,monsterRoll:monster.value,
      partySurprised,monsterSurprised,
      disposition:surpriseDisposition(partySurprised,monsterSurprised)};
    const next={...state,revision:state.revision+1,rng:monster.rng,
      activeEncounter:{...active,stage:'surprise-adjudicated',surprise},
      journal:[...state.journal,{kind:'encounter.surprise',dueTurn:active.dueTurn}].slice(-20)};
    assertValidState(next);
    // Own-side surprise is a player condition. Other-side dice, identity,
    // separation, and all unestablished perception remain undisclosed.
    return {accepted:true,state:next,outcomes:[{kind:'encounter.surprise',
      partySurprised,perception:'unestablished'}]};
  }
  if(kind==='encounter.perceive') {
    const active=state.activeEncounter;
    if(!active || active.stage!=='surprise-adjudicated' ||
      active.evidenceId!==null)
      return {accepted:false,state,outcomes:[],error:'No contact awaiting perception evidence'};
    let evidence;
    try {
      validateEncounterPacket(encounterPacket);
      evidence=validatePerceptionEvidence(perceptionEvidence);
      if(active.packetId!==encounterPacket.id ||
        active.monster!==encounterPacket.monster ||
        active.numberAppearing!==encounterPacket.numberAppearing ||
        evidence.contactId!==active.packetId)
        throw Error('Fixture does not match contact');
    } catch {
      return {accepted:false,state,outcomes:[],error:'Unsupported perception evidence'};
    }
    const visibility=derivePublicVisibility(evidence,state.light,active.distanceFeet);
    const next={...state,revision:state.revision+1,
      activeEncounter:{...active,stage:'perception-adjudicated',
        evidenceId:evidence.id,visibility:{...visibility}},
      journal:[...state.journal,{kind:'encounter.perception',dueTurn:active.dueTurn}].slice(-20)};
    assertValidState(next);
    // Only justified player-visible knowledge crosses the narration boundary.
    return {accepted:true,state:next,outcomes:[{kind:'encounter.perception',
      visibility:{...visibility}}]};
  }
  if(kind==='encounter.handoff') {
    // Administrative, non-resolving transition only. B23 encounter actions,
    // reaction and initiative are not implemented, so the contact stays open.
    const active=state.activeEncounter;
    if(!active || active.stage!=='perception-adjudicated')
      return {accepted:false,state,outcomes:[],error:'No completed perception ready for referee handoff'};
    const next={...state,revision:state.revision+1,
      activeEncounter:{...active,stage:'awaiting-referee-continuation'},
      journal:[...state.journal,{kind:'encounter.handoff',dueTurn:active.dueTurn}].slice(-20)};
    assertValidState(next);
    return {accepted:true,state:next,outcomes:[{
      kind:'encounter.handoff',
      knowledge:projectPlayerEncounterKnowledge(next),
      stage:'awaiting-referee'
    }]};
  }
  if(kind==='encounter.pursuit-second-round') {
    const c=state.activeEncounter;
    if(!c||c.stage!=='awaiting-second-pursuit-round-evidence')
      return {accepted:false,state,outcomes:[],error:'No validated first running round to continue'};
    let motion;
    try {
      validateEncounterPacket(encounterPacket);
      validatePublicCorridorRouteEvidence(routeEvidence,c);
      motion=validateSecondPursuitRound(secondRoundEvidence,c,state.light);
      if(c.packetId!==encounterPacket.id||
         c.monster!==encounterPacket.monster||
         c.numberAppearing!==encounterPacket.numberAppearing||
         c.dueTurn!==state.turns+1||
         motion.evidence.routeId!==routeEvidence.id||
         motion.evidence.priorRoundId!==publicFirstPursuitRound.id||
         state.character.id!==publicFirstPursuitRound.characterId)
        throw Error('Second-round witness mismatch');
    } catch {
      return {accepted:false,state,outcomes:[],error:'Unsupported second pursuit round or sight evidence'};
    }
    const event={kind:'encounter.pursuit-second-round',dueTurn:c.dueTurn,
      evidenceId:motion.evidence.id,round:2,
      elapsedSeconds:motion.evidence.roundSeconds,
      totalEncounterSeconds:motion.evidence.totalEncounterSeconds,
      partyMoveFeet:motion.evidence.partyMoveFeet,
      monsterMoveFeet:motion.evidence.monsterMoveFeet,
      sightAfter:motion.sightAfter,result:'unresolved'};
    const next={...state,revision:state.revision+1,
      activeEncounter:{...c,stage:'awaiting-third-pursuit-round-boundary'},
      journal:[...state.journal,event].slice(-20)};
    assertValidState(next);
    return {accepted:true,state:next,outcomes:[{
      kind:event.kind,round:2,elapsedSeconds:20,
      partyMoveFeet:event.partyMoveFeet,sightAfter:'visible',result:'unresolved',
      knowledge:projectPlayerEncounterKnowledge(next)
    }]};
  }
  if(kind==='encounter.pursuit-first-round') {
    const contact=state.activeEncounter;
    if(!contact || contact.stage!=='awaiting-first-pursuit-round-evidence')
      return {accepted:false,state,outcomes:[],error:'No verified first pursuit round pending'};
    let derived;
    try {
      validateEncounterPacket(encounterPacket);
      validatePublicCorridorRouteEvidence(routeEvidence,contact);
      derived=validateFirstPursuitRound(firstRoundEvidence,contact,state.light);
      if(contact.packetId!==encounterPacket.id ||
        contact.monster!==encounterPacket.monster ||
        contact.numberAppearing!==encounterPacket.numberAppearing ||
        contact.dueTurn!==state.turns+1 ||
        state.character.id!==derived.evidence.characterId ||
        routeEvidence.id!==derived.evidence.routeId)
        throw Error('First-round witness does not match public pursuit');
    } catch {
      return {accepted:false,state,outcomes:[],error:'Unsupported first-round motion or line-of-sight evidence'};
    }
    // B23: round time counts inside an unresolved encounter. No ten-minute
    // dungeon turn or torch-turn is consumed until encounter closure.
    const event={kind:'encounter.pursuit-first-round',dueTurn:contact.dueTurn,
      evidenceId:derived.evidence.id,round:1,
      elapsedSeconds:derived.evidence.secondsElapsed,
      partyMoveFeet:derived.evidence.partyMoveFeet,
      monsterMoveFeet:derived.evidence.monsterMoveFeet,
      sightAfter:derived.sightAfter,result:'unresolved'};
    const next={...state,revision:state.revision+1,
      activeEncounter:{...contact,stage:'awaiting-second-pursuit-round-evidence'},
      journal:[...state.journal,event].slice(-20)};
    assertValidState(next);
    return {accepted:true,state:next,outcomes:[{
      kind:event.kind,round:1,elapsedSeconds:event.elapsedSeconds,
      partyMoveFeet:event.partyMoveFeet,
      sightAfter:event.sightAfter,result:event.result,
      knowledge:projectPlayerEncounterKnowledge(next)
    }]};
  }
  if(kind==='encounter.pursuit-route-establish') {
    const contact=state.activeEncounter;
    if(!contact || contact.stage!=='awaiting-route-and-round-evidence')
      return {accepted:false,state,outcomes:[],error:'No source-rate pursuit awaiting original route evidence'};
    try {
      validateEncounterPacket(encounterPacket);
      const derived=validatePublicCorridorRouteEvidence(routeEvidence,contact);
      if(contact.packetId!==encounterPacket.id ||
        contact.monster!==encounterPacket.monster ||
        contact.numberAppearing!==encounterPacket.numberAppearing ||
        contact.packetId!==derived.evidence.contactId ||
        contact.dueTurn!==state.turns+1)
        throw Error('Public route does not match established active encounter');
    } catch {
      return {accepted:false,state,outcomes:[],error:'Unsupported or invented route/sight evidence'};
    }
    // This is an authored static corridor, not a chase. Initial visibility
    // was established by the earlier perception check. Visibility AFTER
    // hypothetical motion and actual round progression remain unknown.
    const next={...state,revision:state.revision+1,
      activeEncounter:{...contact,stage:'awaiting-first-pursuit-round-evidence'},
      journal:[...state.journal,{kind:'encounter.pursuit-route-established',
        dueTurn:contact.dueTurn,routeId:publicCorridorRouteEvidence.id}].slice(-20)};
    assertValidState(next);
    return {accepted:true,state:next,outcomes:[{
      kind:'encounter.pursuit-route-established',
      routeShape:'straight',obstaclesAtDecision:'none-authored',
      sightAfterMovement:'unestablished',roundsElapsed:0,chaseOutcome:'unresolved',
      knowledge:projectPlayerEncounterKnowledge(next)
    }]};
  }
  if(kind==='encounter.pursuit-round-budget-review') {
    const contact=state.activeEncounter;
    if(!contact || contact.stage!=='awaiting-chase-adjudication')
      return {accepted:false,state,outcomes:[],error:'No witnessed pursuit rates awaiting B24 round review'};
    try {
      validateEncounterPacket(encounterPacket);
      const budget=validatePublicPursuitRoundBudget(roundBudget);
      if(contact.packetId!==encounterPacket.id ||
        contact.monster!==encounterPacket.monster ||
        contact.numberAppearing!==encounterPacket.numberAppearing ||
        contact.packetId!==budget.contactId ||
        budget.partyLoadEvidenceId!==publicPartyLoadEvidence.id ||
        contact.dueTurn!==state.turns+1 ||
        contact.visibility.presence!=='visible')
        throw Error('B24 budget does not match a witnessed visible contact');
    } catch {
      return {accepted:false,state,outcomes:[],error:'Unverified or invented pursuit-round evidence'};
    }
    // Administrative evidence preflight only; movement and round count remain zero.
    const next={...state,revision:state.revision+1,
      activeEncounter:{...contact,stage:'awaiting-route-and-round-evidence'},
      journal:[...state.journal,{kind:'encounter.pursuit-round-budget-reviewed',
        dueTurn:contact.dueTurn,budgetId:publicPursuitRoundBudget.id}].slice(-20)};
    assertValidState(next);
    return {accepted:true,state:next,outcomes:[{
      kind:'encounter.pursuit-round-budget-reviewed',
      partyPotentialFeetPerRound:publicPursuitRoundBudget.partyPotentialFeetPerRound,
      runningLimitRounds:publicPursuitRoundBudget.maximumCharacterRunningRounds,
      roundsElapsed:0,chaseOutcome:'unresolved',
      knowledge:projectPlayerEncounterKnowledge(next)
    }]};
  }
  if(kind==='encounter.party-load-establish') {
    const contact=state.activeEncounter;
    if(!contact || contact.stage!=='awaiting-party-rate-evidence')
      return {accepted:false,state,outcomes:[],error:'No pending B/X pursuit awaiting party equipment witness'};
    let derived;
    try {
      validateEncounterPacket(encounterPacket);
      derived=validatePublicPartyLoad(partyLoad);
      if(contact.packetId!==encounterPacket.id || contact.monster!==encounterPacket.monster ||
        contact.numberAppearing!==encounterPacket.numberAppearing ||
        contact.packetId!==derived.evidence.contactId ||
        state.character.id!==derived.evidence.characterId ||
        contact.dueTurn!==state.turns+1 || contact.visibility.presence!=='visible' ||
        (derived.evidence.wornArmor==='none' && state.character.ac!==9))
        throw Error('Equipment witness does not match this public contact');
    } catch {
      return {accepted:false,state,outcomes:[],error:'Unsupported or unevidenced B/X loadout'};
    }
    // This is a publicly authored *encounter snapshot*, not an inventory
    // mutation. Only the canonical witnessed load may establish its speed.
    const next={...state,revision:state.revision+1,
      activeEncounter:{...contact,stage:'awaiting-chase-adjudication'},
      journal:[...state.journal,{kind:'encounter.party-load-established',
        dueTurn:contact.dueTurn,evidenceId:derived.evidence.id,
        weightCoins:derived.totalCoins,band:derived.band}].slice(-20)};
    assertValidState(next);
    return {accepted:true,state:next,outcomes:[{
      kind:'encounter.party-load-established',weightCoins:derived.totalCoins,
      runningFeetPerRound:derived.runningFeetPerRound,
      stage:'awaiting-chase-adjudication',
      knowledge:projectPlayerEncounterKnowledge(next)
    }]};
  }
  if(kind==='encounter.pursuit-rate-review') {
    const contact=state.activeEncounter;
    if(!contact || contact.stage!=='awaiting-pursuit-adjudication')
      return {accepted:false,state,outcomes:[],error:'No unresolved pursuit decision awaiting source rates'};
    try {
      validateEncounterPacket(encounterPacket);
      const review=validatePursuitRateReview(rateReview);
      if(contact.packetId!==encounterPacket.id ||
        contact.monster!==encounterPacket.monster ||
        contact.numberAppearing!==encounterPacket.numberAppearing ||
        review.contactId!==contact.packetId ||
        contact.dueTurn!==state.turns+1 ||
        contact.visibility.presence!=='visible')
        throw Error('Unverified pursuit contact or rate evidence');
    } catch {
      return {accepted:false,state,outcomes:[],error:'Unsupported or invented pursuit-rate evidence'};
    }
    // B19 lists speed bands but this demo fighter's gear and carried
    // weight are UNKNOWN; do not guess a party band or relative speed.
    const next={...state,revision:state.revision+1,
      activeEncounter:{...contact,stage:'awaiting-party-rate-evidence'},
      journal:[...state.journal,{kind:'encounter.pursuit-rate-review',
        dueTurn:contact.dueTurn,reviewId:publicPursuitRateReview.id}].slice(-20)};
    assertValidState(next);
    return {accepted:true,state:next,outcomes:[{
      kind:'encounter.pursuit-rate-review',partyRate:'unestablished',
      comparison:'unestablished',knowledge:projectPlayerEncounterKnowledge(next)
    }]};
  }
  if(kind==='encounter.pursuit-decision') {
    // B24: the monsters wish to evade; the party elects to follow.
    // This records a pending choice, not speed/position, a pursuit
    // round, dice, time, escape, or a concluded encounter.
    const contact=state.activeEncounter;
    if(!contact || contact.stage!=='awaiting-referee-continuation')
      return {accepted:false,state,outcomes:[],error:'No referee-ready encounter for pursuit choice'};
    if(contact.visibility.presence!=='visible')
      return {accepted:false,state,outcomes:[],error:'No confirmed visible target in the public demonstration'};
    try {
      validateEncounterPacket(encounterPacket);
      const evidence=validatePursuitEvidence(pursuitEvidence);
      if(contact.packetId!==encounterPacket.id ||
        contact.monster!==encounterPacket.monster ||
        contact.numberAppearing!==encounterPacket.numberAppearing ||
        contact.packetId!==evidence.contactId ||
        contact.dueTurn!==state.turns+1)
        throw Error('Pursuit evidence and contact do not match');
    } catch {
      return {accepted:false,state,outcomes:[],error:'Unverified or unsupported public pursuit choice'};
    }
    const next={...state,revision:state.revision+1,
      activeEncounter:{...contact,stage:'awaiting-pursuit-adjudication'},
      journal:[...state.journal,{kind:'encounter.pursuit-decision',
        dueTurn:contact.dueTurn,evidenceId:monsterWithdrawalPursued.id}].slice(-20)};
    assertValidState(next);
    return {accepted:true,state:next,outcomes:[{
      kind:'encounter.pursuit-decision',stage:'awaiting-referee',
      knowledge:projectPlayerEncounterKnowledge(next)
    }]};
  }
  if(kind==='encounter.conclude' || kind==='encounter.conclude.monster-withdrawal') {
    // Only this independently authored PUBLIC demo disposition is supported.
    // Basic B23: if the party withdraws and monsters do not pursue, the
    // encounter ends. <=60 rounds counts as one dungeon turn (B23).
    const contact=state.activeEncounter;
    if(!contact || contact.stage!=='awaiting-referee-continuation')
      return {accepted:false,state,outcomes:[],error:'No referee-ready encounter to conclude'};
    let evidence;
    try {
      validateEncounterPacket(encounterPacket);
      const requestedEvidence=dispositionEvidence===undefined ?
        (kind==='encounter.conclude.monster-withdrawal' ?
          monsterWithdrawalUnpursued : unpursuedWithdrawal) : dispositionEvidence;
      evidence=validateDispositionEvidence(requestedEvidence);
      const expectedId=kind==='encounter.conclude.monster-withdrawal' ?
        monsterWithdrawalUnpursued.id : unpursuedWithdrawal.id;
      if(evidence.id!==expectedId)throw Error('Disposition operation and evidence mismatch');
      if(contact.packetId!==encounterPacket.id ||
        contact.monster!==encounterPacket.monster ||
        contact.numberAppearing!==encounterPacket.numberAppearing ||
        evidence.contactId!==contact.packetId ||
        contact.dueTurn!==state.turns+1)
        throw Error('Disposition does not match active contact');
    } catch {
      return {accepted:false,state,outcomes:[],error:'Unsupported or unverified encounter disposition'};
    }
    const turn=state.turns+1,lightBefore={...state.light};
    const remaining=state.light.kind==='torch'?Math.max(0,state.light.remainingTurns-1):0;
    const light={kind:state.light.kind,remainingTurns:remaining};
    const knowledge=projectPlayerEncounterKnowledge(state);
    const lastEncounter={
      kind:'concluded-wandering',disposition:dispositionForEvidenceId(evidence.id),
      closedTurn:turn,lightBefore,contact,sourceId:evidence.id
    };
    const next={...state,revision:state.revision+1,turns:turn,light,
      activeEncounter:null,lastEncounter,
      journal:[...state.journal,{kind:'encounter.closed',turn,
        disposition:dispositionForEvidenceId(evidence.id)}].slice(-20)};
    // Existing due-turn timing guarantees the conclusion is an odd turn.
    // No wandering roll is owed on this turn; later turns retain B53 rules.
    assertValidState(next);
    return {accepted:true,state:next,outcomes:[{
      kind:'encounter.closed',turn,disposition:dispositionForEvidenceId(evidence.id),
      lightKind:light.kind,lightRemaining:remaining,
      torchExpired:state.light.kind==='torch'&&state.light.remainingTurns===1,
      knowledge
    }]};
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
