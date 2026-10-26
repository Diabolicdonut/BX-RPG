import {unpursuedWithdrawal,monsterWithdrawalUnpursued} from '../content/encounters/public-disposition.js';

// Exact independent public authoring is the only accepted evidence.
// The parser does not decide what the monsters do.
const allowed=[unpursuedWithdrawal,monsterWithdrawalUnpursued];
export const dispositionForEvidenceId=id=>
  id===unpursuedWithdrawal.id ? 'party-withdrew-unpursued' :
  id===monsterWithdrawalUnpursued.id ? 'monsters-withdrew-unpursued' : null;
export function validateDispositionEvidence(packet) {
  if(packet===null||typeof packet!=='object'||Array.isArray(packet))
    throw Error('Unknown, malformed, or unsupported disposition evidence');
  const canonical=allowed.find(e=>e.id===packet.id);
  if(!canonical)throw Error('Unknown, malformed, or unsupported disposition evidence');
  const keys=Object.keys(canonical);
  if(Object.keys(packet).length!==keys.length||
     keys.some(key=>!Object.prototype.hasOwnProperty.call(packet,key)||
       packet[key]!==canonical[key]))
    throw Error('Unknown, malformed, or unsupported disposition evidence');
  return canonical;
}
