# B/X RPG — Current Approved Delivery Roadmap

**Scope reconciled:** 2026-10-27 against actual GitHub `main` `7f7f2445aa9499a294f4c1e17870ca468c0bc265`. This is the present accepted source baseline; older documents and checkpoints remain historic, not current instructions.

**Approved delivery boundary:** Bounded B/X Moldvay/Cook source-faithful conversational RPG release: legal exploration, encounters, spells, characters, integrated AI referee and complete play. It is not the Known World BECMI implementation.

**Immediate authorized next work:** v0.1.8 source-backed pursuit decision and encounter continuation; combat, spells and AI remain future.

The overall indicator is a **100-point evidence-backed planning rubric**. Each gate's weight is the share of the currently approved finite delivery roadmap, not the amount of code already written. An accepted gate earns its entire weight only after supporting source/validation; **partial and planned gates earn zero until fully accepted**. Scope additions require an explicit reviewed revision; no speculative completion forecasts are made.

| Delivery gate | Weight | Status | Acceptance / source evidence |
|---|---:|---|---|
| Source-faithful B/X deterministic engine and save migration | 8 | accepted | `README.md; pipeline-state.md` |
| Dungeon turns, torchlight and supplies | 8 | accepted | `pipeline-state.md; src` |
| Wandering encounter establishment | 7 | accepted | `pipeline-state.md` |
| Surprise, observation and public identity gating | 7 | accepted | `pipeline-state.md` |
| Evidence-bound party and monster nonpursuit demonstrations | 6 | accepted | `pipeline-state.md` |
| Generalized reactions, pursuit and encounter continuation | 10 | partial | `pipeline-state.md (next v0.1.8)` |
| Combat, damage, rewards and advancement under B/X | 14 | planned | `README.md; pipeline-state.md` |
| Complete classes, saves, magic and spell resources | 12 | planned | `README.md` |
| Validated adventure maps, wilderness, module integration and full play | 11 | planned | `README.md` |
| Connected and secure AI referee for flexible intent and narration | 10 | planned | `README.md` |
| Real desktop/mobile end-to-end adventure QA and documentation | 7 | partial | `README.md; .github/workflows/ci.yml` |

**Overall accepted:** **36/100 (36%)**. **Separately retained current-phase indicator:** 6 / 9 B/X public demonstration gates. The existing old counter is not the overall completion percentage.

**Acceptance policy:** Only accepted, independently validated milestone work may change a gate to `accepted`. No claim of full B/X or CoC rules parity, complete connected AI referee, live GM secrecy, manual mobile QA or unrestricted adventure generation is made without its own evidence. The repository's authoritative source, existing acceptance tests and current checkpoint take precedence over this planning percentage whenever they conflict.

**Design guardrail:** The indicator is a static read-only status summary, not game logic. It does not advance game state, grant experience, disclose secrets or change random rolls. Rev/date must be read from the original project authority as configured in `site-progress.json`.
