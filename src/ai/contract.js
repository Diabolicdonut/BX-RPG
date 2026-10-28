// Explicit offline whitelist, NOT an AI referee. Remote models may only propose
// intents and must never supply state patches, dice outcomes, or hidden knowledge.
export function parseLocalDiagnostic(text,baseRevision) {
  if (typeof text!=='string' || text.trim().toLowerCase()!=='roll d6') return null;
  return {contract:'bx.intent.v1',baseRevision,operations:[{kind:'diagnostic.roll',sides:6}]};
}
export function parseLocalIntent(text,baseRevision) {
  const diagnostic=parseLocalDiagnostic(text,baseRevision);
  if (diagnostic) return diagnostic;
  if (typeof text!=='string') return null;
  if (text.trim().toLowerCase()==='advance public demo second pursuit round')
    return {contract:'bx.intent.v1',baseRevision,operations:[{kind:'encounter.pursuit-second-round'}]};
  if (text.trim().toLowerCase()==='advance public demo first pursuit round')
    return {contract:'bx.intent.v1',baseRevision,operations:[{kind:'encounter.pursuit-first-round'}]};
  if (text.trim().toLowerCase()==='establish public demo pursuit corridor')
    return {contract:'bx.intent.v1',baseRevision,operations:[{kind:'encounter.pursuit-route-establish'}]};
  if (text.trim().toLowerCase()==='review public demo pursuit round budget')
    return {contract:'bx.intent.v1',baseRevision,operations:[{kind:'encounter.pursuit-round-budget-review'}]};
  if (text.trim().toLowerCase()==='establish public demo party load')
    return {contract:'bx.intent.v1',baseRevision,operations:[{kind:'encounter.party-load-establish'}]};
  if (text.trim().toLowerCase()==='review public demo pursuit rates')
    return {contract:'bx.intent.v1',baseRevision,operations:[{kind:'encounter.pursuit-rate-review'}]};
  if (text.trim().toLowerCase()==='record public demo pursuit choice')
    return {contract:'bx.intent.v1',baseRevision,operations:[{kind:'encounter.pursuit-decision'}]};
  if (text.trim().toLowerCase()==='resolve public demo monster withdrawal')
    return {contract:'bx.intent.v1',baseRevision,operations:[{kind:'encounter.conclude.monster-withdrawal'}]};
  if (text.trim().toLowerCase()==='resolve public demo nonpursuit')
    return {contract:'bx.intent.v1',baseRevision,operations:[{kind:'encounter.conclude'}]};
  if (text.trim().toLowerCase()==='handoff encounter')
    return {contract:'bx.intent.v1',baseRevision,operations:[{kind:'encounter.handoff'}]};
  if (text.trim().toLowerCase()==='assess encounter visibility')
    return {contract:'bx.intent.v1',baseRevision,operations:[{kind:'encounter.perceive'}]};
  if (text.trim().toLowerCase()==='adjudicate surprise')
    return {contract:'bx.intent.v1',baseRevision,operations:[{kind:'encounter.surprise'}]};
  if (text.trim().toLowerCase()==='establish pending encounter')
    return {contract:'bx.intent.v1',baseRevision,operations:[{kind:'encounter.establish'}]};
  // Intentionally a few complete phrases; never guesses compound requests.
  const pattern=/^(?:we|the party|our party) (?:rest|rests|take a rest|takes a rest)(?: for (?:one|1|a) turn| for (?:ten|10)[ -]minutes?)?[.!]?$/i;
  if (!pattern.test(text.trim())) return null;
  return {contract:'bx.intent.v1',baseRevision,operations:[{kind:'dungeon.rest'}]};
}
export function narrateAuthoritativeResult(result) {
  if (!result.accepted) return `Action declined: ${result.error}. State unchanged.`;
  const outcome=result.outcomes[0];
  if(outcome.kind==='diagnostic.roll') return `Diagnostic d6: ${outcome.value}. This is not a B/X game action.`;
  if(outcome.kind==='encounter.closed') {
    const light=outcome.lightKind==='none' ? 'No light is recorded.' :
      outcome.torchExpired ? 'The torch burns out.' :
      outcome.lightRemaining===0 ? 'The torch is out.' :
      `The torch has ${outcome.lightRemaining} turns remaining.`;
    return outcome.disposition==='monsters-withdrew-unpursued'
      ? `The creatures withdraw; the party does not pursue. The encounter ends. Dungeon turn ${outcome.turn}. ${light}`
      : `The party withdraws; the creatures do not pursue. The encounter ends. Dungeon turn ${outcome.turn}. ${light}`;
  }
  if(outcome.kind==='encounter.pursuit-second-round')
    return `A second independently witnessed ten-second running round passes: each side runs another ${outcome.partyMoveFeet} feet along the clear straight corridor. Twenty encounter seconds have elapsed in total, with the fleeing creature still visible. The chase remains unresolved and the corridor end now requires further adjudication; no dungeon turn, torch turn, or dice roll has been added.`;
  if(outcome.kind==='encounter.pursuit-first-round')
    return `The party chooses a measured running pace. The two sides each travel ${outcome.partyMoveFeet} feet during one ten-second pursuit round; the creature remains visible nearby. The chase is still unresolved. Dungeon turns, torch duration and dice remain unchanged while the encounter continues.`;
  if(outcome.kind==='encounter.pursuit-route-established')
    return 'An independently authored straight corridor is confirmed unobstructed at the encounter decision point. Whether sight will continue after movement is not established. No running round, relocation, capture, escape, light or dungeon time has occurred.';
  if(outcome.kind==='encounter.pursuit-round-budget-reviewed')
    return `Original B/X running permits up to ${outcome.partyPotentialFeetPerRound} feet of party movement in one hypothetical running round, within a ${outcome.runningLimitRounds}-round limit. No round has elapsed, and no movement occurred. Route, continuing sight, and chase result remain unresolved.`;
  if(outcome.kind==='encounter.party-load-established')
    return `The independently witnessed public demonstration load weighs ${outcome.weightCoins} coin-weights and establishes a party running rate of ${outcome.runningFeetPerRound} feet per round. This is not a permanent inventory assignment. The attempted pursuit is still unresolved; no movement, dice or dungeon time have passed.`;
  if(outcome.kind==='encounter.pursuit-rate-review')
    return 'The B/X running-rate rules are ready for adjudication, but the party\'s actual equipment load and movement rate are not established. Chase movement, relative speed, escape and capture remain unresolved. No time, dice or torchlight have advanced.';
  if(outcome.kind==='encounter.pursuit-decision') {
    const sight=outcome.knowledge.visibility;
    const target=sight.identity==='goblin'?'the visible goblin':'the visible creature';
    return `The creatures attempt to withdraw; the party elects to pursue ${target}. Whether either side can move, escape or catch the other remains unresolved. No dice, dungeon time or light have advanced.`;
  }
  if(outcome.kind==='encounter.handoff') {
    const knowledge=outcome.knowledge.visibility;
    const sight=knowledge.presence==='visible'
      ? knowledge.identity==='goblin'
        ? 'The goblin sighting remains established.'
        : 'The creature sighting remains established; its identity is unknown.'
      : 'No creature is confirmed visible; presence remains unestablished.';
    return `The encounter remains unresolved, awaiting further referee adjudication. ${sight} No additional dungeon time has passed.`;
  }
  if(outcome.kind==='encounter.perception') {
    const sight=outcome.visibility;
    if(sight.presence!=='visible')
      return 'No creature is confirmed visible from the established evidence. This does not establish that none is present.';
    return sight.identity==='goblin' ?
      'A goblin is visible within torchlight; its exact distance and the full group size are unestablished.' :
      'A creature is visible within torchlight; its identity and exact distance are unestablished.';
  }
  if(outcome.kind==='encounter.surprise')
    return outcome.partySurprised ?
      'The party is caught off guard. What is present and visible has not yet been established.' :
      'The party is not caught off guard. What is present and visible has not yet been established.';
  if(outcome.kind==='encounter.contact')
    return 'A pending wandering contact has been recorded. Its identity, distance, and visibility require further referee adjudication; time has not advanced.';
  if(outcome.kind==='dungeon.rest') {
    const light=outcome.lightKind==='none' ? 'No light source is recorded.' :
      outcome.torchExpired ? 'The torch burns out.' :
      outcome.lightRemaining===0 ? 'The torch is out.' :
      `The lit torch has ${outcome.lightRemaining} turn${outcome.lightRemaining===1?'':'s'} left.`;
    return `The party rests for ten minutes. Dungeon turn ${outcome.turn}. ${light}`;
  }
  return 'Action declined: unrecognized authoritative result.';
}
