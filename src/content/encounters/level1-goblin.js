// Public demonstration packet ONLY; contains no referee-secret fields.
// Moldvay Basic (1981) B53 level-one wandering table: goblin, 2–8 appearing.
// DM selection of two is within the printed range; this is NOT a random table.
// B23 and B53 give 2d6 x 10 feet when the encounter distance is uncertain.
export const levelOneGoblinContact = Object.freeze({
  format:'bx.encounter.v1',id:'basic-b53-level1-goblin',level:1,
  monster:'goblin',numberAppearing:2,
  distance:{dice:2,sides:6,feetPerPoint:10},
  reference:'Moldvay Basic (1981), B53 and B23'
});
