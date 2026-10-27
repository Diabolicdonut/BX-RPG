import {monsterWithdrawalPursued} from '../content/encounters/public-pursuit.js';
export function validatePursuitEvidence(packet) {
  const keys=Object.keys(monsterWithdrawalPursued);
  if(packet===null || typeof packet!=='object' || Array.isArray(packet) ||
    Object.keys(packet).length!==keys.length ||
    keys.some(k=>!Object.prototype.hasOwnProperty.call(packet,k) ||
      packet[k]!==monsterWithdrawalPursued[k]))
    throw Error('Unsupported or malformed pursuit evidence');
  return monsterWithdrawalPursued;
}
