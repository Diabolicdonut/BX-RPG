// Public witnessed loadout for this ONE offline encounter demonstration,
// not an inventory edit or a claim about the historical demo fighter's gear.
// Every item's coin weight comes from original Moldvay Basic (1981) B20.
import {playerRateForEstablishedBand} from './pursuit-rates.js';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const record=o=>o!==null && typeof o==='object' && !Array.isArray(o);
const exact=(o,keys)=>record(o)&&Object.keys(o).length===keys.length&&keys.every(k=>own(o,k));
export const B20_ITEM_COINS=Object.freeze({
  'chain-mail':400,'leather-armor':200,'plate-mail':500,'shield':100,
  'battle-axe':50,'hand-axe':30,'bow-and-20-arrows':30,'crossbow-and-30-quarrels':50,
  'short-sword':30,'normal-sword':60,'two-handed-sword':150,
  'club':50,'dagger':10,'mace':30,'pole-arm':150,'spear':30,'war-hammer':30,
  'coin':1,'gem':1,'jewelry':10,'potion':10,'rod':20,'scroll':1,'staff':40,
  'wand':10,'miscellaneous-equipment-and-provisions':80
});
export const publicPartyLoadEvidence=Object.freeze({
  format:'bx.public-load-evidence.v1',
  id:'public-b20-unarmored-sample-fighter-sword-bow-provisions',
  contactId:'basic-b53-level1-goblin',
  characterId:'demo-fighter',
  wornArmor:'none',
  carryingTreasure:false,
  items:Object.freeze([
    Object.freeze({item:'normal-sword',quantity:1}),
    Object.freeze({item:'bow-and-20-arrows',quantity:1}),
    Object.freeze({item:'miscellaneous-equipment-and-provisions',quantity:1})
  ]),
  reference:'Moldvay Basic (1981), B20 Character Movement and Encumbrance Table'
});
export function calculateSourceLoad(load) {
  if(!exact(load,['wornArmor','carryingTreasure','items']) ||
    !['none','leather','metal'].includes(load.wornArmor) ||
    typeof load.carryingTreasure!=='boolean' || !Array.isArray(load.items) ||
    load.items.length<1 || load.items.length>30)
    throw Error('Incomplete or unsupported B20 equipment witness');
  let coins=0,armorCount=0,armorKind='none';
  const seen=new Set();
  for(const entry of load.items) {
    if(!exact(entry,['item','quantity']) ||
      typeof entry.item!=='string' || !own(B20_ITEM_COINS,entry.item) ||
      !Number.isSafeInteger(entry.quantity) || entry.quantity<1 ||
      entry.quantity>1600 || seen.has(entry.item))
      throw Error('Unverified B20 equipment quantity or item');
    seen.add(entry.item);
    const armor=entry.item==='leather-armor'?'leather':
      (entry.item==='chain-mail'||entry.item==='plate-mail')?'metal':'none';
    if(armor!=='none'){
      armorCount+=entry.quantity;
      armorKind=armor;
    }
    coins+=B20_ITEM_COINS[entry.item]*entry.quantity;
    if(!Number.isSafeInteger(coins)||coins>1600)
      throw Error('B20 load exceeds 1,600-coin maximum');
  }
  if(armorCount>1 || (armorKind==='none'&&load.wornArmor!=='none') ||
    (armorKind!=='none'&&load.wornArmor!==armorKind))
    throw Error('Worn armor must match exact witnessed armor');
  // Treasure must be separately evidenced, never inferred from item names.
  // In this limited contract, a treasure witness is a nonzero explicit
  // quantity of coins, gems, jewelry or valuable magical objects.
  const treasureIds=['coin','gem','jewelry','potion','rod','scroll','staff','wand'];
  const hasTreasure=treasureIds.some(k=>seen.has(k));
  if(load.carryingTreasure!==hasTreasure)
    throw Error('Treasure status lacks an explicit witnessed item');
  let weightIndex=coins<=400?0:coins<=600?1:coins<=800?2:3;
  let armorIndex=load.wornArmor==='metal'?2:load.wornArmor==='leather'?1:0;
  if(load.carryingTreasure&&armorIndex>0)armorIndex=Math.min(3,armorIndex+1);
  const band=Object.keys({
    'unarmored-or-up-to-400':1,
    'leather-or-401-to-600':1,
    'metal-or-601-to-800':1,
    'metal-treasure-or-801-to-1600':1
  })[Math.max(weightIndex,armorIndex)];
  return Object.freeze({totalCoins:coins,band,...playerRateForEstablishedBand(band)});
}
export function validatePublicPartyLoad(packet) {
  if(!record(packet)||!exact(packet,Object.keys(publicPartyLoadEvidence)) ||
    Object.keys(publicPartyLoadEvidence).some(k=>k!=='items'&&packet[k]!==publicPartyLoadEvidence[k]) ||
    !Array.isArray(packet.items)||packet.items.length!==publicPartyLoadEvidence.items.length ||
    packet.items.some((item,i)=>!exact(item,['item','quantity']) ||
      item.item!==publicPartyLoadEvidence.items[i].item ||
      item.quantity!==publicPartyLoadEvidence.items[i].quantity))
    throw Error('Public witnessed equipment must match independent authored facts');
  const derived=calculateSourceLoad({wornArmor:packet.wornArmor,
    carryingTreasure:packet.carryingTreasure,items:packet.items});
  return Object.freeze({evidence:publicPartyLoadEvidence,...derived});
}
export const canonicalPartyLoad=validatePublicPartyLoad(publicPartyLoadEvidence);
