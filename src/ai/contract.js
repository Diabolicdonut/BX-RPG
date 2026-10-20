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
  // Intentionally a few complete phrases; never guesses compound requests.
  const pattern=/^(?:we|the party|our party) (?:rest|rests|take a rest|takes a rest)(?: for (?:one|1|a) turn| for (?:ten|10)[ -]minutes?)?[.!]?$/i;
  if (!pattern.test(text.trim())) return null;
  return {contract:'bx.intent.v1',baseRevision,operations:[{kind:'dungeon.rest'}]};
}
export function narrateAuthoritativeResult(result) {
  if (!result.accepted) return `Action declined: ${result.error}. State unchanged.`;
  const outcome=result.outcomes[0];
  if(outcome.kind==='diagnostic.roll') return `Diagnostic d6: ${outcome.value}. This is not a B/X game action.`;
  if(outcome.kind==='dungeon.rest') {
    const light=outcome.lightKind==='none' ? 'No light source is recorded.' :
      outcome.torchExpired ? 'The torch burns out.' :
      outcome.lightRemaining===0 ? 'The torch is out.' :
      `The lit torch has ${outcome.lightRemaining} turn${outcome.lightRemaining===1?'':'s'} left.`;
    return `The party rests for ten minutes. Dungeon turn ${outcome.turn}. ${light}`;
  }
  return 'Action declined: unrecognized authoritative result.';
}
