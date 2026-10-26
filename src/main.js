import {createDemoState,executeProposal} from './state/state.js';
import {saveToStorage,loadFromStorage} from './state/storage.js';
import {parseLocalIntent,narrateAuthoritativeResult} from './ai/contract.js';
import {renderState,getStatusModel} from './ui/view.js';
let state=createDemoState();
const form=document.getElementById('command-form');
const command=document.getElementById('command');
const log=document.getElementById('log');
function say(message) {
  const item=document.createElement('p');
  item.textContent=message; // Never inject player/AI-provided HTML.
  log.prepend(item);
}
function refresh(){renderState(state);}
function handle(text){
  const lower=text.trim().toLowerCase();
  if(lower==='help') {say('Offline commands: help, status, roll d6 (diagnostic), we rest for one turn, establish pending encounter, adjudicate surprise, assess encounter visibility (offline referee diagnostics). Save/load use the buttons. No AI service is connected.');return;}
  if(lower==='status') {
    const m=getStatusModel(state);
    say(`Revision ${m.revision}; dungeon turns ${m.turns}; elapsed minutes ${m.minutes}; light ${m.light}; RNG draws ${m.draws}.`);return;
  }
  const proposal=parseLocalIntent(text,state.revision);
  if(proposal){
    const result=executeProposal(state,proposal);
    if(result.accepted) state=result.state;
    say(narrateAuthoritativeResult(result));refresh();return;
  }
  say('Offline parser supports only explicit rest commands, establish pending encounter, adjudicate surprise, assess encounter visibility, and roll d6 diagnostics. No AI referee is connected; state unchanged. Try help.');
}
form.addEventListener('submit',event=>{event.preventDefault();const text=command.value;command.value='';if(text.trim())handle(text);});
document.getElementById('save').addEventListener('click',()=>{
  try {saveToStorage(window.localStorage,state);say(`Saved revision ${state.revision} locally.`);} catch(error){say(`Save failed: ${error.message}`);}
});
document.getElementById('load').addEventListener('click',()=>{
  try {state=loadFromStorage(window.localStorage);refresh();say(`Loaded revision ${state.revision}.`);} catch(error){say(`Load failed: ${error.message}`);}
});
document.getElementById('reset').addEventListener('click',()=>{state=createDemoState();refresh();say('Demo state reset to documented seed. Saved state remains available.');});
refresh();say('B/X perception boundary ready. Type help. AI referee: disconnected.');
document.getElementById('app').dataset.bootStatus='ready';
