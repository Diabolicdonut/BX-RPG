import {levelOneGoblinContact} from '../content/encounters/level1-goblin.js';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const exact=(o,keys)=>object(o)&&Object.keys(o).length===keys.length&&keys.every(k=>own(o,k));
// This first packet is deliberately public and source-restricted. Do not add
// secret-room data, surprises, reactions, treasure, or GM notes here.
export function validateEncounterPacket(packet){
  if(!exact(packet,['format','id','level','monster','numberAppearing','distance','reference'])||
    !exact(packet.distance,['dice','sides','feetPerPoint'])||
    packet.format!==levelOneGoblinContact.format||
    packet.id!==levelOneGoblinContact.id||
    packet.level!==1||packet.monster!=='goblin'||
    !Number.isSafeInteger(packet.numberAppearing)||packet.numberAppearing<2||packet.numberAppearing>8||
    packet.distance.dice!==2||packet.distance.sides!==6||packet.distance.feetPerPoint!==10||
    packet.reference!==levelOneGoblinContact.reference)
      throw Error('Unknown or malformed B/X encounter packet');
  return packet;
}
