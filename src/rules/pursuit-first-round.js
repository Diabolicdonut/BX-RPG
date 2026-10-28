// Original, publicly inspectable encounter-scene witness, NOT an official
// adventure map or a general B/X AI referee decision. B24: pursuit rounds,
// both parties run. Pace selection and full-route visibility must be authored
// separately. The party CHOOSES 60 feet, below its B19 120-foot maximum,
// deliberately avoiding an unevidenced encounter/capture at full pace.
import {canonicalPartyLoad} from './equipment-evidence.js';
import {PUBLIC_GOBLIN_RATE} from './pursuit-rates.js';
import {publicCorridorRouteEvidence} from './pursuit-route.js';
import {B24_SECONDS_PER_ROUND,B24_RUNNING_LIMIT_ROUNDS} from './pursuit-round-budget.js';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export const publicFirstPursuitRound=Object.freeze({
  format:'bx.public-first-running-round.v1',
  id:'public-original-clear-corridor-first-pace-matched-round',
  contactId:PUBLIC_GOBLIN_RATE.contactId,
  routeId:publicCorridorRouteEvidence.id,
  characterId:canonicalPartyLoad.evidence.characterId,
  partyDecision:'run-matching-evader-pace',
  monsterDecision:'continue-withdrawal-running',
  partyMoveFeet:60,
  monsterMoveFeet:60,
  verifiedClearSpanFeet:120,
  fullSpanClearSight:true,
  intermediateObstacles:false,
  turnOrDoorwayDuringRound:false,
  lightRemainsLit:true,
  encounterRound:1,
  secondsElapsed:B24_SECONDS_PER_ROUND,
  actualMovement:true,
  captureOrEscape:'unresolved',
  source:'Original public corridor action witness; Moldvay Basic (1981), B19/B23/B24'
});
export function validateFirstPursuitRound(packet,contact,light) {
  const keys=Object.keys(publicFirstPursuitRound);
  if(packet===null||typeof packet!=='object'||Array.isArray(packet)||
     Object.keys(packet).length!==keys.length ||
     keys.some(k=>!own(packet,k)||packet[k]!==publicFirstPursuitRound[k]))
    throw Error('Missing or invented public first-round action evidence');
  if(contact===null||typeof contact!=='object'||Array.isArray(contact) ||
     contact.packetId!==packet.contactId ||
     contact.visibility?.presence!=='visible' ||
     !Number.isSafeInteger(contact.distanceFeet)||
     contact.distanceFeet<20||contact.distanceFeet>30||
     contact.distanceFeet%10!==0 ||
     light?.kind!=='torch'||!Number.isInteger(light.remainingTurns)||
     light.remainingTurns<=0 ||
     packet.partyMoveFeet>canonicalPartyLoad.runningFeetPerRound ||
     packet.monsterMoveFeet>PUBLIC_GOBLIN_RATE.runningFeetPerRound ||
     packet.encounterRound>B24_RUNNING_LIMIT_ROUNDS ||
     packet.partyMoveFeet+contact.distanceFeet>packet.verifiedClearSpanFeet ||
     packet.monsterMoveFeet+contact.distanceFeet>packet.verifiedClearSpanFeet ||
     packet.monsterMoveFeet+contact.distanceFeet>publicCorridorRouteEvidence.corridorLengthFeet)
    throw Error('First round lacks safe, lit, straight, source-backed passage');
  const separation=contact.distanceFeet+packet.monsterMoveFeet-packet.partyMoveFeet;
  if(separation<=0||separation>30)throw Error('No supported sight or safe separation');
  return Object.freeze({
    evidence:publicFirstPursuitRound,
    partyPositionFeet:packet.partyMoveFeet,
    monsterPositionFeet:contact.distanceFeet+packet.monsterMoveFeet,
    separationFeet:separation,
    sightAfter:'visible'
  });
}
