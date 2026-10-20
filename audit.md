# Acceptance audit (newest first)

## v0.1.1 — CANDIDATE, NOT YET ACCEPTED — first dungeon exploration-turn slice

Scope: original B/X Moldvay Basic pp. B19/B21/B53, one offline whitelisted party rest command (one 10-minute turn), typed untrusted `dungeon.rest`, strict revision/operation validation, deterministic six-turn torch decrement, wandering-monster 1d6 at the end of each second turn, no made-up encounter, silent player-facing check, persisted pending next-turn encounter blocking future progression until adjudication is implemented. Schema v2 with strict v1 save migration (historical light unknown, represented as `none`), state-derived clock/light in UI, narration only from authoritative public outcome, full Node + Chrome browser command save/load probe.

Evidence awaiting exact GitHub candidate: local `npm test` **19/19 pass** (8 inherited regressions, 11 source/safety/persistence/visibility tests). All JavaScript syntax checks passed. Local Chromium hangs even in the initial baseline environment; GitHub real-browser CI is an obligatory acceptance gate and cannot be substituted by Node DOM mocks. No live AI claim, no source PDF/public artwork, no Known World modifications. Accepted v0.1.0 remains authoritative until merge and CI evidence recorded.

## v0.1.0 — FULLY ACCEPTED — initial browser and deterministic-state foundation

Scope: isolated B/X repository bootstrap with static ES-module UI, sample character, seeded diagnostic die, typed AI intent boundary, versioned local save/load, status-bound SVG, Node tests, optional Chromium smoke, CI workflow, and selective Known World migration inventory.

Evidence: local Node suite **8/8 passed** (seeded 200-roll replay, save/reload, validation refusal, UI binding). GitHub Actions **39371307336** passed both Node and real Chrome browser smoke on exact candidate `2055e458d0cffd951e236dd38b0fbc5591536bad` (Chrome log: "Browser DOM smoke passed"), including secrets/prohibited-assets scan. PR #1 merged to main in commit `688583135ac1f2aa88a456cac1223363e489c5cd`. Local Chromium in this container hangs even on about:blank; GitHub Chrome runner independently verified module boot and initial state display. No real AI integration or B/X action adjudication is claimed. Known World was inspected read-only and never modified. No protected PDFs or graphics copied.

Acceptance: COMPLETE on PR #1. v0.1.0 closeout PR #2 merged at `ae22ebf14aa7adb872cb3eec801b040fb9bfa60f`; documentation only, game bytes unchanged.
