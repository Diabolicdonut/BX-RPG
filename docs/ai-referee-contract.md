# AI referee boundary · v0.1.1

**Implemented:** one strict offline intent path (`dungeon.rest`) and the original diagnostic (`diagnostic.roll`). **Not implemented:** live AI connection, general free-form parsing, encounters, and module importing. The local whitelist recognizes explicitly stated one-turn rest commands only; it is *not* a mock AI service.

Example offline player text: `The party rests for 10 minutes`.

Proposed operation, untrusted at all times:

```json
{"contract":"bx.intent.v1","baseRevision":0,"operations":[{"kind":"dungeon.rest"}]}
```

The engine checks contract, exact operation keys, one-operation atomicity, and current revision. Reject stale/unknown/additional operands **without RNG or state mutation**. An accepted `dungeon.rest` advances one 10-minute dungeon turn and consumes one turn of an active torch. At the end of every second dungeon turn the engine privately checks 1d6 for a wandering encounter (1 = encounter next turn). If triggered, it persists a *pending* event and refuses further dungeon-turn progression until a genuine encounter resolver exists; it never fabricates a monster, map, room, or result. The narrator receives **only** public outcome fields (time and light), not encounter roll/result or hidden content. A `diagnostic.roll` remains available solely for regression testing and does not advance dungeon time.

Source: **Moldvay (1981)** Basic p. B19 (10-minute turn and rest), B21 (6-turn torch), B53 (wandering check after every two turns; encounter in following turn). Cook/Marsh Expert supplements Basic but does not override these procedures. No rules were derived from BECMI or Rules Cyclopedia.

Save schema v2 records exact RNG, light, public journal and pending encounter. Legacy v1 demo saves migrate on load: preserve existing character/time/dice/journal; assign `light.kind='none'` because historical saves do **not** establish ownership of a lit torch. The initial storage key is retained. Old serialized data is validated before migration. Neither migration nor rejected proposals rolls dice.

**Future AI service boundary:** client sends player text and player-visible scoped state only; an authenticated server-side proxy owns provider credentials and validates requests; the model returns an untrusted typed proposal. The deterministic engine adjudicates, and narration receives only authorized, player-visible outcomes. Hidden adventure content should be held server-side, not inside a GitHub Pages application. No API keys or fake AI requests appear in this checkpoint.

## v0.1.2 — minimum wandering-contact boundary

Source: Moldvay Basic **B53**, encounter DM selection and level-one table (goblin, two through eight appearing); **B23/B53**, uncertain encounter distance **2d6 × 10 feet**. `src/content/encounters/level1-goblin.js` is a standalone **public test-only** encounter packet with a fixed DM-selected count of two goblins, not a complete random table. `src/rules/encounter-data.js` checks its exact schema, source, allowed count, ID, and distance rule before any RNG use. Unknown monsters, arbitrary AI count/distance, extra notes, or malformed packet values are refused.

The offline command `establish pending encounter` proposes exactly `encounter.establish`. It **requires an existing pending wandering event** and draws two d6 deterministically to calculate separation. The original pending flag is atomically replaced by an `activeEncounter` **awaiting encounter adjudication**, with exact future turn preserved; no time, torch, HP, treasure, or combat state is advanced. Both repeated establishment and further dungeon turns refuse unchanged. Encounter surprise, actual identification/visibility, reactions, initiative, and combat are deliberately **not** adjudicated. The narrator receives only `{kind:'encounter.contact',stage:'awaiting-referee'}`; it does not invent sight, identification, surprise, or victory. Journal entry records the contact boundary only.

**Security limitation:** The fixture is intentionally public, and the static application and local saves are inspectable. The contact record contains this non-confidential demonstration fixture's monster, selected count, and deterministic distance; anyone inspecting local storage or code can discover them. This is not a secure referee-secret boundary or support for any proprietary module. **Do not load hidden adventure records, traps, secret room contents, private monster plans, or other confidential referee data into this client, static package, or browser save.** A future authoritative server must retain such information separately and release only approved player-visible fields after visibility adjudication. No API service, credentials, or true AI are connected in v0.1.2. The provided fixture is not an adventure or licensed adventure content.

Save schema **v3** adds exact `activeEncounter:null|contact`. Exact historical v1 and v2 saves migrate without adding unseen encounters or changing RNG/time. Pending v2 wandering events stay pending and may be established after load. An active contact remains blocked against unsupported play after reload. Acceptance tests cover the offline command, exact-data validation, deterministic replay, rejected mutations, and browser save/load.


## v0.1.3 — Original B/X surprise with information boundary

Primary rule: **Moldvay Basic (1981), p. B23, Surprise**. One d6 for each side, 1–2 is surprised. If both sides are surprised, their surprise cancels and neither side moves/fights that round. If only one side is surprised, the other can act in the initial round. When neither side is surprised, initiative normally follows. **This checkpoint records the four dispositions but implements no round, initiative, reaction, action or combat resolver.** B23 notes that some situations make surprise impossible; this public, generic goblin fixture has no situational exception. Unsupported situational modifiers or special monster exceptions remain unimplemented and must not be invented.

The strict offline command `adjudicate surprise` proposes `{contract:'bx.intent.v1',baseRevision:N,operations:[{kind:'encounter.surprise'}]}`. Only an existing unresolved active contact with an exact validated known-public fixture accepts it. Two dice are consumed in the fixed party-then-monster order, once only, atomically. Saved `activeEncounter.surprise` contains both rolls, derived booleans, and `disposition`. The independently persisted `activeEncounter.visibility` has distinct `presence`, `identity`, and `distance` fields, all `unestablished`: surprise itself does **not** establish sight, identification, sound, distance known to the party, or any treasure/room knowledge.

Narration receives **only** `{kind:'encounter.surprise',partySurprised:boolean,perception:'unestablished'}`. A party's own surprise condition may be reported; opponent roll, opponent surprise, monster identity, number, and precise distance are excluded from player-facing outcomes and status. The encounter remains mechanically blocked until later source-backed adjudication. Save schema **v4** retains all prior RNG/time/light/pending/contact data and strictly migrates exact v1/v2/v3 envelopes without new rolls or invented perceptions. Test cases cover all four dispositions, malformed and stale operations, forged saves and packet refusal, deterministic replay, and actual Chrome command/save/load.

**Security limit:** the separation is a presentation contract, **not confidentiality**. Static browser source and localStorage are inspectable and contain the public demo encounter and saved RNG. Never put actual private referee/adventure data here; secure private-world state and credentials require authenticated server authority. AI integration remains disconnected.
