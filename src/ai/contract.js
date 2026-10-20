// Future remote referee may propose intentions only, never mutations or dice values.
// No AI client is connected in v0.1.0.
export function parseLocalDiagnostic(text, baseRevision) {
  if (typeof text !== 'string') return null;
  if (text.trim().toLowerCase() !== 'roll d6') return null;
  return {contract: 'bx.intent.v1', baseRevision,
    operations: [{kind: 'diagnostic.roll', sides: 6}]};
}
export function narrateAuthoritativeResult(result) {
  if (!result.accepted) return `Action declined: ${result.error}. State unchanged.`;
  const roll = result.outcomes[0];
  return `Diagnostic d6: ${roll.value}. This is not a B/X game action.`;
}
