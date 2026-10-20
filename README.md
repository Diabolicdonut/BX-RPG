# B/X RPG

A small, self-contained, browser-based, text-first RPG that reuses the **architectural ideas**, not the BECMI rules, of [Known World](https://github.com/Diabolicdonut/BECMI-Mystara). The eventual interface is natural-language conversation with an AI referee; a deterministic engine alone resolves rules, resources, dice, and campaign state.

**v0.1.2 is a narrow wandering-contact boundary, not a complete game.** Offline phrases such as `we rest for one turn` and `the party rests for 10 minutes` flow through a typed intent, validated deterministic action, authoritative narration, status UI, and save/load. Each turn is 10 minutes, consumes one turn of a lit torch (six-turn limit), and performs a seeded wandering encounter check at the end of every second turn. A pending wandering event can be established using a separately packaged, source-verified public goblin fixture. The referee-only offline command `establish pending encounter` resolves the unknown distance with 2d6 × 10 feet; the game then blocks turn progression until unimplemented surprise/reaction/combat adjudication. Public narration does not identify the monster or reveal the distance. Static source and local saves remain inspectable, so this is **not** secure hidden referee state. The sample fighter and starting lit torch are explicit *demonstration fixtures*, not character generation or adventuring equipment purchases. `roll d6` remains a diagnostic, not a B/X player action.

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
