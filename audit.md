# Acceptance audit (newest first)

## v0.1.0 — Initial browser and deterministic-state foundation

Scope: isolated B/X repository bootstrap with static ES-module UI, sample character, seeded diagnostic die, typed AI intent boundary, versioned local save/load, status-bound SVG, Node tests, optional Chromium smoke, CI workflow, and selective Known World migration inventory.

Evidence (candidate): local Node test suite **8/8 passed**, including seeded 200-roll replay, save/reload, validation refusal, UI state model. Local Chromium on this container hangs even on `about:blank` due runtime environment; **browser acceptance not locally verified**. GitHub Actions must independently run both Node and browser smoke before merge. No real AI integration or B/X action adjudication is claimed. Known World was inspected read-only and never modified. No protected PDFs or graphics copied.

Acceptance: PENDING CI and merge. Next after acceptance: v0.1.1 single exploration-turn vertical slice. Stop at v0.1.0.
