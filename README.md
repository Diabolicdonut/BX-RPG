# B/X RPG

A small, self-contained, browser-based, text-first RPG that reuses the **architectural ideas**, not the BECMI rules, of [Known World](https://github.com/Diabolicdonut/BECMI-Mystara). The eventual interface is natural-language conversation with an AI referee; a deterministic engine alone resolves rules, resources, dice, and campaign state.

**v0.1.6 adds ONE source-verified public encounter conclusion, not general combat or monster reactions.** After the existing public goblin fixture has been established, surprise and sight assessed, and the encounter handed to the offline referee boundary, the exact test command `resolve public demo nonpursuit` applies **a separate canonical public fixture** recording that the party withdrew and the monsters did not pursue. Original Moldvay Basic **B23** explicitly treats this as an ended encounter, and counts an encounter of at most 60 rounds as one dungeon turn. The deterministic engine adds that due turn, decrements the recorded torch, archives the encounter and player-established knowledge, and unlocks later exploration with normal B53 checks. Unsupported conclusions, player-supplied facts, repeated resolutions, and stale proposals are refused without changes. Save schema **v7** migrates v1–v6 saves exactly; this does not simulate actual chase, map movement, running penalties, combat, monster AI or a live AI referee. The public fixture is **not** secure independently authenticated real-DM testimony, and the static browser cannot protect secrets.

**v0.1.5 added a non-resolving encounter handoff and player-knowledge continuity.** After the public-demo encounter has been established, surprise adjudicated and perception assessed, the exact offline command `handoff encounter` moves the still-active encounter to `awaiting-referee-continuation`. The saved player-visible goblin/creature/unknown sighting and own-side surprise status survive this handoff and save/load. It **does not** end the encounter, award XP, restore dungeon turns, determine monster reactions or trigger combat. No dice or time are advanced, and the unresolved encounter continues to block dungeon turns. Save schema v6 migrates exact v1–v5 saves. The public demo remains inspectable; the AI is disconnected.

**v0.1.4 added a narrow, evidence-gated encounter perception demonstration.** Only a previously established contact whose surprise was resolved may be assessed via the offline command `assess encounter visibility`. A separately packaged **public, authored** line-of-sight/recognition fixture is validated; the engine cross-checks the existing encounter separation against the torch's original 30-foot reach (Moldvay B21). When supported it can disclose visible presence and an independently evidenced goblin identity, but never raw distance, group size, or unknown details. Blocked sight, missing light, and separation beyond illumination produce **unestablished**, not a claim that no monster exists. Save schema v5 migrates older saves exactly; the whole exercise is a public demonstration, not secure referee knowledge or a live AI service.

**v0.1.3 added original Moldvay surprise adjudication and explicit unestablished visibility, not full encounter play.** The exact offline command `adjudicate surprise` rolls 1d6 per side using the saved deterministic RNG; 1–2 indicates surprise. Mutual surprise cancels the advantage. The encounter stays blocked pending later encounter procedures, and no monster identity/distance is inferred from surprise. This browser-only fixture and local saves provide no secret-state security.

**Previously, v0.1.2 established the wandering-contact boundary.** Offline phrases such as `we rest for one turn` and `the party rests for 10 minutes` flow through a typed intent, validated deterministic action, authoritative narration, status UI, and save/load. Each turn is 10 minutes, consumes one turn of a lit torch (six-turn limit), and performs a seeded wandering encounter check at the end of every second turn. A pending wandering event can be established using a separately packaged, source-verified public goblin fixture. The referee-only offline command `establish pending encounter` resolves the unknown distance with 2d6 × 10 feet; the game then blocks turn progression until unimplemented surprise/reaction/combat adjudication. Public narration does not identify the monster or reveal the distance. Static source and local saves remain inspectable, so this is **not** secure hidden referee state. The sample fighter and starting lit torch are explicit *demonstration fixtures*, not character generation or adventuring equipment purchases. `roll d6` remains a diagnostic, not a B/X player action.

## Run and test

Use Node 20+ (no package install required):

```sh
npm run serve
# Open http://localhost:4173/
npm test
npm run test:browser # requires Chromium/Chrome; CI provisions Chrome
```

The interface uses relative URLs and static ES modules suitable for static hosting including GitHub Pages, though deployment must be configured separately. Browsers do not load this module structure correctly from `file://` URLs.

## Authority and security

The originals govern: Tom Moldvay, *D&D Basic Rules* (1981, TSR 1011), and David Cook/Steve Marsh, *D&D Expert Rules* (1981, TSR 1012). *Old-School Essentials Classic Fantasy Rules Tome* v1.3 is clarification only. This checkpoint cites Basic pages **B19, B21, B23, B53**. Do not import Mentzer/Rules Cyclopedia rules or unrelated expansions. No protected rulebooks/artwork are distributed here.

A live AI is **not connected**. Unknown natural-language commands fail without changing state; only whitelisted rest phrases and a diagnostic roll work. Never place API keys into browser JS, localStorage, or public source. A future authenticated server-side proxy is required for credentials and hidden adventure material. See `AGENTS.md`, `docs/ai-referee-contract.md`, `docs/encounter-fixture.md`, `docs/migration-inventory.md`, and `pipeline-state.md`.
