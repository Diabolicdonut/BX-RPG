// Original Moldvay Basic (1981): B19/B24 and B53. Potential movement
// budgets are NOT evidence of a path, elapsed rounds, actual movement or fate.
import {canonicalPartyLoad} from './equipment-evidence.js';
import {PUBLIC_GOBLIN_RATE} from './pursuit-rates.js';
export const B24_RUNNING_LIMIT_ROUNDS=30;
export const B24_SECONDS_PER_ROUND=10;
export const publicPursuitRoundBudget=Object.freeze({
  format:'bx.public-pursuit-budget.v1',
  id:'public-b24-goblin-running-budget-prerequisite',
  contactId:PUBLIC_GOBLIN_RATE.contactId,
  partyLoadEvidenceId:canonicalPartyLoad.evidence.id,
  partyPotentialFeetPerRound:canonicalPartyLoad.runningFeetPerRound,
  monsterPotentialFeetPerRound:PUBLIC_GOBLIN_RATE.runningFeetPerRound,
  roundSeconds:B24_SECONDS_PER_ROUND,
  maximumCharacterRunningRounds:B24_RUNNING_LIMIT_ROUNDS,
  runningRoundsElapsed:0,
  mapAndRoute:'unestablished',
  lineOfSightContinuity:'unestablished',
  movementApplied:false,
  chaseOutcome:'unresolved',
  source:'Moldvay Basic (1981), B19/B24/B53'
});
export function validatePublicPursuitRoundBudget(evidence) {
  if(evidence===null || typeof evidence!=='object' || Array.isArray(evidence) ||
    Object.keys(evidence).length!==Object.keys(publicPursuitRoundBudget).length ||
    Object.keys(publicPursuitRoundBudget).some(key=>
      !Object.prototype.hasOwnProperty.call(evidence,key) ||
      evidence[key]!==publicPursuitRoundBudget[key]))
    throw Error('Unsupported B24 running budget or invented movement evidence');
  return publicPursuitRoundBudget;
}
export function potentialRunningBudget(rounds) {
  if(!Number.isSafeInteger(rounds)||rounds<0||rounds>B24_RUNNING_LIMIT_ROUNDS)
    throw Error('B24 hypothetical running interval is unsupported');
  return Object.freeze({
    hypotheticalRounds:rounds,
    partyPotentialFeet:rounds*canonicalPartyLoad.runningFeetPerRound,
    monsterPotentialFeet:rounds*PUBLIC_GOBLIN_RATE.runningFeetPerRound,
    movementApplied:false
  });
}
