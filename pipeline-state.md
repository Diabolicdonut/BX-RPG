# B/X RPG pipeline

- Fully accepted game baseline: **v0.1.0** on `main`, PR #1 merged at `688583135ac1f2aa88a456cac1223363e489c5cd`. Node and real-Chrome jobs passed on exact candidate `2055e458d0cffd951e236dd38b0fbc5591536bad`, workflow `39371307336`. The closeout is documentation-only; game bytes are unchanged.
- Authority: 1981 Moldvay Basic and 1981 Cook/Marsh Expert; OSE v1.3 only for clarification.
- Runtime: static ES modules, Node 20+ test/server, deterministic independent state; no live AI connection.
- Intentional limitations: diagnostic d6 command only; sample character fixture, no B/X action adjudication or character creation yet.
- Exact next bounded checkpoint: **v0.1.1 — first B/X dungeon exploration-turn action vertical slice**. Add a narrowly source-verified player natural-language intention → typed proposal → validated B/X turn resolution (including first resource/time consequence) → result-grounded narration → saved/reloaded authoritative state. Provide explicit fallback without AI API, and test each boundary. Do not begin until v0.1.0 accepted.
- Recovery: read current main, audit top, workflow results, and this file. If a newer accepted checkpoint is present, use it and never repeat v0.1.0. Before v0.1.1, verify latest main and CI.
