// Public, independently authored demonstration outcome. The offline
// command does not let a player choose the monster's response.
export const unpursuedWithdrawal = Object.freeze({
  format:'bx.encounter-disposition.v1',
  id:'public-b23-party-withdraws-no-pursuit',
  contactId:'basic-b53-level1-goblin',
  partyDecision:'withdraw',
  monstersFollow:false,
  combatStarted:false,
  rounds:1,
  reference:'Moldvay Basic (1981), B23-B24'
});

// Separate PUBLIC authored scene: the creatures choose to withdraw and the
// party explicitly declines pursuit. Basic B24 gives the players this choice.
// It is not a monster AI decision, random reaction, or player-supplied fact.
export const monsterWithdrawalUnpursued = Object.freeze({
  format:'bx.encounter-disposition.v1',
  id:'public-b24-monsters-withdraw-party-does-not-pursue',
  contactId:'basic-b53-level1-goblin',
  monsterDecision:'withdraw',
  partyPursues:false,
  combatStarted:false,
  rounds:1,
  reference:'Moldvay Basic (1981), B23-B24'
});
