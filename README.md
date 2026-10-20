# B/X RPG

A self-contained, browser-based, text-first RPG foundation inspired by the architecture of [Known World](https://github.com/Diabolicdonut/BECMI-Mystara). The intended interface is natural-language conversation with an AI referee, while a deterministic engine alone resolves rules, dice, resources, and campaign state.

**v0.1.0 is a functional foundation, not a complete game.** It has a clearly labelled sample character, state-bound status/SVG display, seeded reproducible diagnostic d6 rolls, local JSON save/load, and an AI proposal contract. It has **no live AI connection**; unknown natural-language commands are declined rather than fabricated. `roll d6` is a diagnostic, **not** a B/X player action or combat rule.

## Run

Use Node.js 20+ (`npm install` is unnecessary):

```sh
npm run serve
# open http://localhost:4173/
npm test
npm run test:browser  # requires locally installed Chromium/Chrome
```

`index.html` also works on GitHub Pages because all modules use relative URLs; opening it with `file://` is not supported by browser module loading. Hosting is static and requires no server-side game runtime.

## Authority and privacy

Primary: Tom Moldvay, *D&D Basic Rules* (1981, TSR 1011); David Cook and Steve Marsh, *D&D Expert Rules* (1981, TSR 1012). Secondary for clarification only: *Old-School Essentials Classic Fantasy Rules Tome*, v1.3. In a conflict, original B/X governs. No copyrighted reference PDFs, artwork, or extended passages are distributed here. See `AGENTS.md` for guardrails, `docs/migration-inventory.md` for the read-only Known World assessment, and `docs/ai-referee-contract.md` for integration boundaries.

**Credentials:** Do not place AI keys into browser JavaScript, localStorage, static GitHub Pages settings, or any public GitHub file. A future authenticated server-side proxy will own credentials; the browser will receive only non-secret, scoped responses. Nothing currently contacts an AI service.
