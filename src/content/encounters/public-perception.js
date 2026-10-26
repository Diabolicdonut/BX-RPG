// Public, authored demonstration circumstances, NOT inferred geometry or secret
// adventure data. B/X Basic B21 gives 30-foot torchlight; B23 makes
// encounter circumstances referee-dependent. No real map is implemented.
const source='Public authored scenario evidence; Moldvay Basic (1981), B21/B23';
const common={format:'bx.perception.v1',contactId:'basic-b53-level1-goblin',source};
export const clearRecognized=Object.freeze({...common,id:'demo-clear-recognized',
  lineOfSight:'clear',recognition:'goblin'});
export const clearUnrecognized=Object.freeze({...common,id:'demo-clear-unrecognized',
  lineOfSight:'clear',recognition:'unestablished'});
export const obstructed=Object.freeze({...common,id:'demo-obstructed',
  lineOfSight:'blocked',recognition:'unestablished'});
export const PUBLIC_PERCEPTION_EVIDENCE=Object.freeze([clearRecognized,clearUnrecognized,obstructed]);
export function knownPerceptionEvidence(id){
  return PUBLIC_PERCEPTION_EVIDENCE.find(item=>item.id===id)??null;
}
