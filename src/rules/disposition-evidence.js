import {unpursuedWithdrawal} from '../content/encounters/public-disposition.js';
const keys=Object.keys(unpursuedWithdrawal);
export function validateDispositionEvidence(packet) {
  if(packet===null||typeof packet!=='object'||Array.isArray(packet)||
    Object.keys(packet).length!==keys.length||
    keys.some(key=>!Object.prototype.hasOwnProperty.call(packet,key)||
      packet[key]!==unpursuedWithdrawal[key]))
    throw Error('Unknown, malformed, or unsupported disposition evidence');
  return unpursuedWithdrawal;
}
