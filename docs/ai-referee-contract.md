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
