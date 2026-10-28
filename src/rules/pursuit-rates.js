// Source: Moldvay Basic (1981) B19/B20, Character Movement;
 // B24 encounter movement, running and evasion; B53 level-one goblin.
 // These are rate RULES, not evidence of the sample fighter's equipment.
export const B19_BANDS=Object.freeze({
  'unarmored-or-up-to-400':Object.freeze({baseFeetPerTurn:120,encounterFeetPerRound:40,runningFeetPerRound:120}),
  'leather-or-401-to-600':Object.freeze({baseFeetPerTurn:90,encounterFeetPerRound:30,runningFeetPerRound:90}),
  'metal-or-601-to-800':Object.freeze({baseFeetPerTurn:60,encounterFeetPerRound:20,runningFeetPerRound:60}),
  'metal-treasure-or-801-to-1600':Object.freeze({baseFeetPerTurn:30,encounterFeetPerRound:10,runningFeetPerRound:30})
});
export function playerRateForEstablishedBand(band) {
  if(typeof band!=='string'||!Object.prototype.hasOwnProperty.call(B19_BANDS,band))
    throw Error('An exact source-backed B19 band is required');
  return B19_BANDS[band];
}
export const PUBLIC_GOBLIN_RATE=Object.freeze({
  contactId:'basic-b53-level1-goblin',
  baseFeetPerTurn:60,encounterFeetPerRound:20,runningFeetPerRound:60,
  source:'Moldvay Basic (1981), B53 and B24'
});
export const publicPursuitRateReview=Object.freeze({
  format:'bx.pursuit-rate-review.v1',
  id:'public-b19-b24-goblin-pursuit-rate-prerequisite',
  contactId:PUBLIC_GOBLIN_RATE.contactId,
  monsterBaseFeetPerTurn:PUBLIC_GOBLIN_RATE.baseFeetPerTurn,
  monsterEncounterFeetPerRound:PUBLIC_GOBLIN_RATE.encounterFeetPerRound,
  monsterRunningFeetPerRound:PUBLIC_GOBLIN_RATE.runningFeetPerRound,
  partyBand:'unestablished',partyRunningFeetPerRound:null,
  runningRounds:0,comparison:'unestablished',
  reference:'Moldvay Basic (1981), B19/B24/B53'
});
export function validatePursuitRateReview(packet) {
  if(packet===null || typeof packet!=='object' || Array.isArray(packet) ||
    Object.keys(packet).length!==Object.keys(publicPursuitRateReview).length ||
    Object.keys(publicPursuitRateReview).some(k=>!Object.prototype.hasOwnProperty.call(packet,k) ||
      packet[k]!==publicPursuitRateReview[k]))
    throw Error('Unverified or invented B/X rate evidence');
  return publicPursuitRateReview;
}
