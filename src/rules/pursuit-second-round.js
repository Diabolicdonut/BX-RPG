// Original independently authored demonstration, NOT a real scenario map
// or an extrapolation from movement speed alone. The second running
// round has its OWN witnessed choices and continuous-lit-path evidence.
import {publicFirstPursuitRound,validateFirstPursuitRound} from './pursuit-first-round.js';
import {publicCorridorRouteEvidence} from './pursuit-route.js';
import {canonicalPartyLoad} from './equipment-evidence.js';
import {PUBLIC_GOBLIN_RATE} from './pursuit-rates.js';
import {B24_SECONDS_PER_ROUND,B24_RUNNING_LIMIT_ROUNDS} from './pursuit-round-budget.js';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export const publicSecondPursuitRound=Object.freeze({
 format:'bx.public-second-running-round.v1',
 id:'public-original-clear-corridor-second-pace-matched-round',
 contactId:PUBLIC_GOBLIN_RATE.contactId,
 routeId:publicCorridorRouteEvidence.id,
 priorRoundId:publicFirstPursuitRound.id,
 partyDecision:'continue-paced-running',
 monsterDecision:'continue-withdrawal-running',
 partyMoveFeet:60,
 monsterMoveFeet:60,
 fullClearRouteThroughFeet:180,
 continuousStraightSight:true,
 intermediateObstacles:false,
 turnOrDoorwayDuringRound:false,
 lightRemainsLit:true,
 encounterRound:2,
 roundSeconds:B24_SECONDS_PER_ROUND,
 totalEncounterSeconds:2*B24_SECONDS_PER_ROUND,
 movementApplied:true,
 captureOrEscape:'unresolved',
 source:'Original public second-round scene witness; Moldvay Basic (1981), B19/B23/B24'
});
export function validateSecondPursuitRound(packet,contact,light) {
 const keys=Object.keys(publicSecondPursuitRound);
 if(packet===null||typeof packet!=='object'||Array.isArray(packet)||
    Object.keys(packet).length!==keys.length ||
    keys.some(k=>!own(packet,k)||packet[k]!==publicSecondPursuitRound[k]))
   throw Error('Unsupported second-round action or invented route witness');
 const first=validateFirstPursuitRound(publicFirstPursuitRound,contact,light);
 if(packet.encounterRound>B24_RUNNING_LIMIT_ROUNDS||
    packet.partyMoveFeet>canonicalPartyLoad.runningFeetPerRound||
    packet.monsterMoveFeet>PUBLIC_GOBLIN_RATE.runningFeetPerRound||
    packet.fullClearRouteThroughFeet>publicCorridorRouteEvidence.corridorLengthFeet||
    first.partyPositionFeet+packet.partyMoveFeet>packet.fullClearRouteThroughFeet||
    first.monsterPositionFeet+packet.monsterMoveFeet>packet.fullClearRouteThroughFeet)
   throw Error('Second-round path, speed or running limit not supported');
 const endParty=first.partyPositionFeet+packet.partyMoveFeet;
 const endMonster=first.monsterPositionFeet+packet.monsterMoveFeet;
 const separation=endMonster-endParty;
 if(separation<=0||separation>30)
   throw Error('Second running round would need contact or lost-sight adjudication');
 return Object.freeze({
   evidence:publicSecondPursuitRound,
   partyPositionFeet:endParty,monsterPositionFeet:endMonster,
   separationFeet:separation,sightAfter:'visible'
 });
}
