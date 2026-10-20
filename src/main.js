import {createDemoState, executeProposal} from './state/state.js';
import {saveToStorage, loadFromStorage} from './state/storage.js';
import {parseLocalDiagnostic, narrateAuthoritativeResult} from './ai/contract.js';
import {renderState} from './ui/view.js';
let state = createDemoState();
const form = document.getElementById('command-form');
const command = document.getElementById('command');
const log = document.getElementById('log');
function say(message) {
  const item = document.createElement('p');
  item.textContent = message; // Never inject AI/player-supplied HTML.
  log.prepend(item);
}
function refresh() { renderState(state); }
function handle(text) {
  const lower = text.trim().toLowerCase();
  if (lower === 'help') {say('Local shell commands: help, status, roll d6. Save/load use the buttons. No AI service is connected.'); return;}
  if (lower === 'status') {say(`Revision ${state.revision}; dungeon turns ${state.turns}; RNG draws ${state.rng.draws}.`); return;}
  const proposal = parseLocalDiagnostic(text, state.revision);
  if (proposal) {
    const result = executeProposal(state, proposal);
    if (result.accepted) state = result.state;
    say(narrateAuthoritativeResult(result)); refresh(); return;
  }
  say('No AI referee is connected. Free-form actions are not interpreted yet; state unchanged. Try help.');
}
form.addEventListener('submit', event => {event.preventDefault(); const text = command.value; command.value = ''; if (text.trim()) handle(text);});
document.getElementById('save').addEventListener('click',()=>{
  try {saveToStorage(window.localStorage,state);say(`Saved revision ${state.revision} locally.`);} catch(error) {say(`Save failed: ${error.message}`);}
});
document.getElementById('load').addEventListener('click',()=>{
  try {const restored = loadFromStorage(window.localStorage);state = restored;refresh();say(`Loaded revision ${state.revision}.`);} catch(error) {say(`Load failed: ${error.message}`);}
});
document.getElementById('reset').addEventListener('click',()=>{state=createDemoState();refresh();say('Demo state reset to documented seed. Saved state remains available.');});
refresh(); say('Demo shell ready. Type help. AI referee: disconnected.');
document.getElementById('app').dataset.bootStatus = 'ready';
