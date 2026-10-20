export function getStatusModel(state) {
  const c = state.character;
  return {name: c.name, classLevel: `Fighter ${c.level} · illustrative fixture`,
    hp: `${c.hp}/${c.hpMax}`, ac: String(c.ac), xp: String(c.xp),
    abilities: Object.entries(c.abilities).map(([k,v])=>`${k.toUpperCase()} ${v}`).join(' · '),
    turns: String(state.turns), draws: String(state.rng.draws), revision: String(state.revision)};
}
export function renderState(state, doc = document) {
  const m = getStatusModel(state);
  for (const [id,key] of [['hero-name','name'],['hero-class','classLevel'],['hero-hp','hp'],
    ['hero-ac','ac'],['hero-xp','xp'],['hero-abilities','abilities'],
    ['turns','turns'],['draws','draws'],['revision','revision']]) {
    doc.getElementById(id).textContent = m[key];
  }
  // Only authoritative player-visible state may drive the schematic.
  const bar = doc.getElementById('hp-bar');
  bar.setAttribute('width', String(Math.round(144 * state.character.hp / state.character.hpMax)));
}
