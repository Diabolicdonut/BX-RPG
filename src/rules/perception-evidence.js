import {knownPerceptionEvidence} from '../content/encounters/public-perception.js';
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keys=['format','contactId','source','id','lineOfSight','recognition'];
export function validatePerceptionEvidence(packet){
  if(!plain(packet)||Object.keys(packet).length!==keys.length||
    !keys.every(k=>Object.prototype.hasOwnProperty.call(packet,k)))
    throw Error('Malformed public perception evidence');
  const canonical=knownPerceptionEvidence(packet.id);
  if(!canonical||keys.some(k=>packet[k]!==canonical[k]))
    throw Error('Unsupported public perception evidence');
  return canonical;
}
// No inferred line of sight, infravision, hearing, exact visual distance,
// recognition or hidden information. Scenario evidence is explicitly authored.
export function derivePublicVisibility(evidence, light, distanceFeet){
  const lit=light.kind==='torch'&&light.remainingTurns>0;
  const visible=lit&&distanceFeet<=30&&evidence.lineOfSight==='clear';
  return Object.freeze(visible ? {
    presence:'visible',
    identity:evidence.recognition==='goblin'?'goblin':'unestablished',
    distance:'within-torchlight'
  } : {presence:'unestablished',identity:'unestablished',distance:'unestablished'});
}
