// Platform-independent, deterministic 32-bit LCG. Not cryptographic.
const DOMAIN = 0x100000000;
export function nextUint32(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw Error('Invalid RNG state');
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}
export function rollDie(rng, sides) {
  if (!Number.isInteger(sides) || sides < 2 || sides > 100) throw Error('Invalid die');
  const limit = Math.floor(DOMAIN / sides) * sides;
  let state = rng.state;
  let draws = rng.draws;
  for (;;) {
    state = nextUint32(state);
    draws++;
    if (state < limit) return {value: (state % sides) + 1, rng: {state, draws}};
  }
}
