# Known World → B/X migration inventory (read-only assessment)

Source reviewed: `Diabolicdonut/BECMI-Mystara` `main` governance (`AGENTS.md`, `pipeline-state.md`, `validation/README.md`), accepted v0.4.346 and existing monolithic `index.html` design. **No Known World files were modified or copied**, and no 11.7 MB production HTML was transplanted. This foundation **reimplements small contracts**, not BECMI rule bodies.

| Source subsystem | B/X disposition | Checkpoint |
|---|---|---|
| Text-first player / AI-referee split | Adapt as typed proposals; no actual AI yet | v0.1.0 contract |
| Deterministic game-state and dice ownership | Reimplement small versioned engine + seeded RNG | v0.1.0 |
| Save/load and migration discipline | Reimplement strict v1 JSON validation; later migrations as explicit versions | v0.1.0 |
| Character / party / inventory | New B/X data model, actual classes & derived stats later | Later |
| Dungeon exploration, turns, movement | B/X-specific RAW from originals, not BECMI engine code | v0.1.1 onward |
| Attacks, initiative, morale, reactions, saves | B/X-specific independent rules and tests | Later |
| Cleric / magic-user / elf spellcasting | Source-checked B/X spell rules and data | Later |
| Monster, spell, gear datasets | Rebuild only original B/X scope; do not copy expanded catalogues | Later |
| SVG presentation / map visibility discipline | Reuse design idea, new small state-bound SVG | v0.1.0 scaffold |
| Test / acceptance practices | Adapt isolated regression + candidate-gating discipline | v0.1.0 |
| Mystara geography, campaign data | Exclude | Never in core |
| BECMI Companion/Master/Immortals | Exclude | Never in core |
| Weapon Measure, Ferocity, Context Matrix, Arms Across Eras | Exclude | Never in core |
| Mass combat, dominion systems, non-B/X expansions | Exclude from foundation; only source-supported B/X ordinary mechanics later | Not v0.1.0 |

Rules priority: Moldvay TSR 1011 (Basic levels 1–3); Cook/Marsh TSR 1012 (Expert extension up to level 14); OSE Classic Fantasy v1.3 only for clarification. This inventory does not imply source code was mechanically ported or that the v0.1.0 demo is an authentic B/X session.
