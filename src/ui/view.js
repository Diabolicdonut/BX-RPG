import {projectPlayerEncounterKnowledge} from '../state/player-knowledge.js';
export function getStatusModel(state) {
  const c=state.character;
  const known=projectPlayerEncounterKnowledge(state);
  const handoffSight=known.visibility.presence==='visible'
    ? (known.visibility.identity==='goblin' ? 'Goblin visible within torchlight' : 'Creature visible within torchlight')
    : 'No confirmed sighting';
  const light=state.light.kind==='none' ? 'None recorded' :
    state.light.remainingTurns===0 ? 'Torch extinguished' :
    `Torch · ${state.light.remainingTurns} turns remaining`;
  return {name:c.name,classLevel:`Fighter ${c.level} · illustrative fixture`,
    hp:`${c.hp}/${c.hpMax}`,ac:String(c.ac),xp:String(c.xp),
    abilities:Object.entries(c.abilities).map(([k,v])=>`${k.toUpperCase()} ${v}`).join(' · '),
    turns:String(state.turns),minutes:String(state.turns*10),light,
    encounter:state.lastEncounter && !state.activeEncounter ? 'Concluded · withdrew without pursuit' : state.activeEncounter ?
      (state.activeEncounter.stage==='awaiting-referee-continuation'
        ? `Awaiting referee · ${handoffSight}` :
       (state.activeEncounter.stage==='perception-adjudicated' ?
        (state.activeEncounter.visibility.presence==='visible' ?
          (state.activeEncounter.visibility.identity==='goblin' ?
            'Goblin visible · within torchlight' : 'Creature visible · within torchlight') :
          'Perception assessed · no confirmed sighting') :
       (state.activeEncounter.stage==='surprise-adjudicated' ? 'Surprise resolved · visibility unestablished' : 'Contact awaiting referee'))) : 'None',
    draws:String(state.rng.draws),revision:String(state.revision)};
}
export function renderState(state,doc=document) {
  const m=getStatusModel(state);
  for(const [id,key] of [['hero-name','name'],['hero-class','classLevel'],['hero-hp','hp'],
    ['hero-ac','ac'],['hero-xp','xp'],['hero-abilities','abilities'],
    ['turns','turns'],['minutes','minutes'],['light','light'],['encounter','encounter'],
    ['draws','draws'],['revision','revision']]) doc.getElementById(id).textContent=m[key];
  // Presentation cannot infer or alter referee-only encounter state.
  doc.getElementById('hp-bar').setAttribute('width',String(Math.round(144*state.character.hp/state.character.hpMax)));
}
