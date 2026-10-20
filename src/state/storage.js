import {assertValidState} from './state.js';
export const SAVE_KEY = 'bx-rpg-v0.1.0-demo';
export function encodeSave(state) {
  assertValidState(state);
  return JSON.stringify(state);
}
export function decodeSave(json) {
  if (typeof json !== 'string' || json.length > 30000) throw Error('Invalid save text');
  return assertValidState(JSON.parse(json));
}
export function saveToStorage(storage, state) { storage.setItem(SAVE_KEY, encodeSave(state)); }
export function loadFromStorage(storage) {
  const value = storage.getItem(SAVE_KEY);
  if (value === null) throw Error('No saved game found');
  return decodeSave(value);
}
