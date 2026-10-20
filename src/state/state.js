import {sampleCharacter} from '../content/demo.js';
import {RULESET} from '../rules/scope.js';
import {rollDie} from './rng.js';
export const SCHEMA_VERSION = 1;
export function createDemoState(seed = 0x19811011) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw Error('Invalid seed');
  return {schemaVersion: SCHEMA_VERSION, ruleset: RULESET, revision: 0,
    character: sampleCharacter(), turns: 0, rng: {state: seed >>> 0, draws: 0}, journal: []};
}
export function assertValidState(state) {
  const c = state?.character, r = state?.rng;
  if (state?.schemaVersion !== SCHEMA_VERSION || state?.ruleset !== RULESET ||
      !Number.isSafeInteger(state.revision) || state.revision < 0 ||
      !Number.isSafeInteger(state.turns) || state.turns < 0 ||
      !c || c.id !== 'demo-fighter' || c.name !== 'Sample Fighter' || c.classId !== 'fighter' ||
      c.level !== 1 || c.hp !== 4 || c.hpMax !== 4 || c.ac !== 9 || c.xp !== 0 ||
      !c.abilities || ['str','int','wis','dex','con','cha'].some(k => c.abilities[k] !== 10) ||
      !r || !Number.isInteger(r.state) || r.state < 0 || r.state > 0xffffffff ||
      !Number.isSafeInteger(r.draws) || r.draws < 0 || !Array.isArray(state.journal) ||
      state.journal.length > 20 || state.journal.some(e => e?.kind !== 'diagnostic.roll' || e.sides !== 6 || !Number.isInteger(e.value) || e.value < 1 || e.value > 6))
    throw Error('Invalid or unsupported B/X demo save');
  return state;
}
export function executeProposal(state, proposal) {
  assertValidState(state);
  if (!proposal || proposal.contract !== 'bx.intent.v1' || proposal.baseRevision !== state.revision ||
      !Array.isArray(proposal.operations) || proposal.operations.length !== 1 ||
      proposal.operations[0]?.kind !== 'diagnostic.roll' || proposal.operations[0]?.sides !== 6 ||
      Object.keys(proposal.operations[0]).some(k=>!['kind','sides'].includes(k)))
    return {accepted: false, state, outcomes: [], error: 'Unsupported or stale proposal'};
  const roll = rollDie(state.rng, 6);
  const outcome = {kind: 'diagnostic.roll', sides: 6, value: roll.value};
  const next = {...state, revision: state.revision + 1, rng: roll.rng,
    journal: [...state.journal, outcome].slice(-20)};
  return {accepted: true, state: next, outcomes: [outcome]};
}
