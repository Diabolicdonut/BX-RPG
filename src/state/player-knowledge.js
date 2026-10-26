// Only the knowledge already adjudicated as player-visible crosses this
// projection. Never return monster-count, exact distance, dice or fixture IDs.
// This is public-browser filtering, NOT secure hiding of referee data.
export function projectPlayerEncounterKnowledge(state) {
  const encounter=state.activeEncounter;
  const sight=encounter?.visibility;
  return {
    partySurprised:encounter?.surprise ? encounter.surprise.partySurprised : null,
    visibility:{
      presence:sight?.presence??'unestablished',
      identity:sight?.identity??'unestablished',
      distance:sight?.distance??'unestablished'
    }
  };
}
