// This is ORIGINAL scenario geometry authored for one inspectable browser
// demonstration, NOT copied from Moldvay or an official adventure.
// B24 governs pursuit procedure; the map facts must come separately from
// a referee-controlled route witness. Browser fixtures are not private.
export const publicCorridorRouteEvidence=Object.freeze({
  format:'bx.public-pursuit-route.v1',
  id:'public-original-straight-corridor-180ft',
  contactId:'basic-b53-level1-goblin',
  corridorLengthFeet:180,
  partyAnchorFeet:0,
  monsterAnchor:'encounter-distance-from-party',
  corridorShape:'straight',
  obstaclesAtDecision:'none-authored',
  sightAtDecision:'requires-existing-visibility',
  sightAfterMovement:'unestablished',
  roundsElapsed:0,
  movementApplied:false,
  chaseOutcome:'unresolved',
  source:'Original authored demo corridor; Moldvay Basic (1981), B24 pursuit'
});
export function validatePublicCorridorRouteEvidence(packet,contact) {
  const keys=Object.keys(publicCorridorRouteEvidence);
  if(packet===null||typeof packet!=='object'||Array.isArray(packet)||
    Object.keys(packet).length!==keys.length ||
    keys.some(k=>!Object.prototype.hasOwnProperty.call(packet,k) ||
      packet[k]!==publicCorridorRouteEvidence[k]))
    throw Error('Unsupported or invented B/X corridor witness');
  if(contact===null||typeof contact!=='object'||Array.isArray(contact) ||
    contact.packetId!==publicCorridorRouteEvidence.contactId ||
    contact.visibility?.presence!=='visible' ||
    !Number.isSafeInteger(contact.distanceFeet) ||
    contact.distanceFeet<20 || contact.distanceFeet>120 ||
    contact.distanceFeet%10!==0 ||
    contact.distanceFeet+60>packet.corridorLengthFeet)
    throw Error('Public route cannot be reconciled with the established contact');
  // The derived separation belongs to authoritative internal review only.
  // NEVER emit this in player-facing narration, UI or a journal event.
  return Object.freeze({
    evidence:publicCorridorRouteEvidence,
    initialSeparationFeet:contact.distanceFeet
  });
}
