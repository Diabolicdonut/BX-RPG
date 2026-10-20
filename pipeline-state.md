# B/X RPG pipeline

- Candidate: **v0.1.0** on `work/v0.1.0-foundation`; **not accepted until green PR validation and merge to main**. Initial empty-repository baseline exists on main.
- Authority: 1981 Moldvay Basic and 1981 Cook/Marsh Expert; OSE v1.3 only for clarification.
- Runtime: static ES modules, Node 20+ test/server, deterministic independent state; no live AI connection.
- Intentional limitations: diagnostic d6 command only; sample character fixture, no B/X action adjudication or character creation yet.
- Exact next bounded checkpoint: **v0.1.1 — first B/X dungeon exploration-turn action vertical slice**. Add a narrowly source-verified player natural-language intention → typed proposal → validated B/X turn resolution (including first resource/time consequence) → result-grounded narration → saved/reloaded authoritative state. Provide explicit fallback without AI API, and test each boundary. Do not begin until v0.1.0 accepted.
- Recovery: read current main, audit top, workflow results, and this file. If v0.1.0 candidate is not merged or CI fails, finish/retest that candidate instead of starting v0.1.1.
