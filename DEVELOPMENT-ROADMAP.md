# B/X RPG — Authoritative Development Roadmap

**Project:** `Diabolicdonut/BX-RPG` · **Governance revision:** 1 (2026-10-27) · **Last fully accepted game revision:** **v0.1.7** · **Next engine checkpoint:** **v0.1.8**.

> **This is the repository's authoritative LONG-TERM PRODUCT ROADMAP and development instructions.** All humans and AI development agents must read it together with `AGENTS.md`, the newest accepted entry in `audit.md`, `pipeline-state.md`, and current `main` before changing the game. GitHub's newest validated accepted code and audit remain authoritative for *what actually exists*. This document governs the desired end state, scope, work sequencing, evidence requirements and weighted progress. Disagreement is a blocking issue to reconcile, **never permission to silently overwrite accepted code**.

## 1. Product vision / definition of done

Build a **complete, replayable, text-first B/X fantasy role-playing game for the browser**. A player should be able to speak or type naturally to an AI referee, role-play one character or manage a party, explore persistent dungeons and wilderness, interact with NPCs and monsters, cast spells, fight or negotiate, advance characters, save and resume a campaign, and enjoy surprising adventures without needing to manage dice or read rule tables. Dice and detailed sheets remain available for inspection but are handled **behind the screen** in normal play. The player should understand character abilities and approximate task difficulty without receiving private referee state or spoilers.

The core rules are the **1981 Tom Moldvay Basic and David Cook/Steve Marsh Expert (B/X) boxed sets**. Preserve the original procedures, probabilities and progression rather than blending in Mentzer BECMI, Rules Cyclopedia or unrelated variants. *Old-School Essentials Classic Fantasy* v1.3 may clarify presentation and organization **only when compatible**, with a documented original-rule citation and any discrepancy resolved in favor of original B/X. Adventure-specific content is subject to the authorized scenario source; never distribute unlicensed text, illustrations or maps.

### Intended complete player experience

1. Start, load or create an adventure; generate or manually create a legal B/X party, choose a play-control mode, adjust only explicit house-rule or UI settings if authorized.
2. Explore a real dungeon or wilderness with persistent locations, turns, mapping, light, supplies, encumbrance, travel, secret discoveries and uncertain information. Choose actions in ordinary language.
3. Let a deterministic engine resolve source-backed checks, encounters, surprise, reactions, movement, pursuits, initiative, attacks, saves, spells, hazards, morale, treasure, XP and advancement. An AI referee interprets and narrates within strict permissions; it **cannot invent authoritative die rolls, change the save, or leak adventure secrets**.
4. Pursue authored/pregenerated adventures and, ultimately, replayable procedurally authored scenarios and campaigns, with consistent world state, NPC goals and consequences. Replay should vary beyond simply rerolling a monster encounter.
5. Save, export, resume and eventually support long campaigns with choice of a single player-controlled hero and AI companions, whole-party control, and optional director/spectator workflows. Maintain accessibility and lightweight browser presentation, with optional ambient sound and simple visual maps/positions later.

**Core promise:** original B/X mechanics, substantial player agency and genuine surprise; not a scripted combat demo, not a BECMI/Mystara port, and not an AI improvisation engine that silently ignores rules.

## 2. Non-negotiable system boundaries

| Layer | Responsibility | Absolute boundary |
|---|---|---|
| RULES | B/X tables, deterministic transitions, seeded dice, turns, effects, combat, saves, XP | Neither AI nor UI may mutate authoritative mechanics; original B/X governs |
| WORLD / SETTING | Geographical, temporal and persistent location/NPC state | Must be separately versioned from procedures; no unapproved cross-project assets |
| ADVENTURE | Authored scenario packages, encounters, clue dependencies, consequences and procedural templates | Private DM data stays private, never bundled as player-visible content |
| REFEREE | Secure intent classification, bounded adjudication proposals, information-filtered narration and scene pacing | Referee can suggest operations, not dice values or state patches |
| AGENCY | Player-controlled party members, optional AI companions or spectator/director decisions | Human override is explicit; autonomous decisions cannot impersonate the player |
| INTERFACE | Conversation, character sheets, map/position, settings, audio, progress/revision status | Display and controls reflect the actual persisted state, not an independent simulation |
| INFRA / QA | Schema migration, tests, secure storage, deployment, observability, provenance | Credential secrecy, backwards compatibility, reproducible PR acceptance |

Client-only GitHub Pages is suitable for the current **public demonstration** but **cannot securely hide adventure content**, authenticate a DM's private evidence or store provider API keys. A real AI referee with hidden world state requires a separate trusted backend. Browser/localStorage data must never be described as secure hidden information. Avoid autonomous background action without user control.

## 3. Full-vision delivery gates and accepted progress

**Total weight = 100 planning points across the entire intended project.** The weights express the long-term scope and risk, **not hours**, velocity, probability of completion or an objective measurement of software size. Accepted scope earns its weight once independently verified. `partial` and `planned` earn **zero** until the entire *explicitly scoped gate* is accepted. Partial work remains documented for planning but is never silently rounded into completion. The six accepted gates below are **narrow demo foundations**, not claims that broader B/X gameplay is complete.

| Gate | Deliverable (full denominator) | Weight | Status | Recorded evidence / limitation |
|---|---|---:|---|---|
| G01 | Deterministic intent and state boundary (demo scope) | 4 | accepted | src/state/state.js; tests/foundation.test.mjs |
| G02 | Seeded dice and exact versioned save migration (v1–v8) | 4 | accepted | src/state/rng.js; src/state/storage.js; tests |
| G03 | Basic dungeon clock and six-turn torch demonstration | 3 | accepted | src/state/state.js; tests/exploration-turn.test.mjs |
| G04 | Bounded wandering encounter and distance demonstration | 3 | accepted | src/content/encounters/level1-goblin.js; tests/encounter-contact.test.mjs |
| G05 | Surprise, sight and player-information demonstration | 3 | accepted | tests/surprise.test.mjs; tests/perception.test.mjs |
| G06 | Two evidence-gated nonpursuit demonstration outcomes | 2 | accepted | tests/disposition.test.mjs; tests/monster-withdrawal.test.mjs |
| G07 | Complete B/X dungeon exploration, hazards and resource loop | 7 | planned | Acceptance plan below; not yet implemented |
| G08 | Full encounter reactions, movement, evasion and pursuit | 6 | partial | Next v0.1.8; existing cases do not satisfy general encounter rules |
| G09 | B/X combat, initiative, morale, saves and conditions | 8 | planned | Acceptance plan below; not yet implemented |
| G10 | Seven B/X classes, creation, equipment and advancement | 7 | planned | Acceptance plan below; demo fighter is not character generation |
| G11 | Complete Basic and Expert spellcasting and magical effects | 6 | planned | Acceptance plan below; not yet implemented |
| G12 | Treasure, XP, retainers, downtime and economic systems | 5 | planned | Acceptance plan below; not yet implemented |
| G13 | Expert wilderness, travel, sea play and domain framework | 6 | planned | Acceptance plan below; not yet implemented |
| G14 | Source-verified Basic/Expert monster catalogue and behavior | 6 | planned | Acceptance plan below; goblin fixture is not a catalogue |
| G15 | Adventure packages, authored scenarios and module import | 6 | planned | Acceptance plan below; not yet implemented |
| G16 | Secure server-authoritative AI referee and natural-language play | 7 | planned | Acceptance plan below; local whitelist is not live AI |
| G17 | Replayable procedural adventures, worlds and campaigns | 5 | planned | Acceptance plan below; not yet implemented |
| G18 | Party agency: single character, full party and AI/spectator | 4 | planned | Acceptance plan below; optional future capability |
| G19 | Accessible visual maps, positions, UX polish and optional audio | 3 | partial | Static UI/progress exists; no integrated map or audio |
| G20 | Persistent hosted campaigns and optional group play | 2 | planned | Acceptance plan below; localStorage demo is insufficient |
| G21 | Release security, full-play QA, documentation and deployment | 3 | partial | CI/Pages exists; full-play security and QA remain |

**Current earned progress: 19 / 100 = 19% (full long-term vision, 2026-10-27).**

The earlier **36%** figure measured a *limited delivery roadmap* and must not be used as a percentage of the long-term product. The existing **6/9 public-demo phase counter** remains available in the widget as a separately labeled historical phase indicator, not overall product completion. Rebaselining the denominator **does not remove or invalidate any completed game features**.

**One-source synchronization:** this table and its approved scope are governed here. `site-progress.json` is the *machine-readable published mirror*, **not** an independent set of product requirements. `tests/roadmap.test.mjs` enforces 1:1 ID/label/weight/status/evidence agreement, exact 100-point sum, accepted revision consistency, and the percentage. The webpage computes the percentage from accepted gates dynamically, never from a separately typed percent constant.

## 4. Gate exit criteria — no partial credit

- **G01–G06 · Accepted foundation only:** validated single-party/fighter fixtures, seeded state and migrations, one demonstration dungeon clock/light loop, one public goblin contact, surprise and perception, two authored unpursued withdrawals. Original test evidence is in `audit.md` through v0.1.7. These are *not* complete exploration, general encounter handling or complete character systems.
- **G07 · Exploration:** source-faithful full dungeon-turn order, doors and listening, secret searches, traps and checks, movement/rate and burden, marching order, light/infravision, food/supplies, rest and recovery; adversarial and deterministic replay tests.
- **G08 · Encounters:** original reaction table and boundaries, movement, parties' choices (fight/talk/run/wait), monster decisions with valid evidence, B24 running/evasion/pursuit, consequences, continuing scenes and no unsupported automatic escape. Begin with next **v0.1.8** bounded pursuit decision.
- **G09 · Combat:** original side initiative, surprise effects, melee/missiles, original attack matrices and AC, damage, saves, morale, death and retreat, turn/round accounting, source-backed spell-in-combat interactions, fixtures/edge tests.
- **G10 · Characters:** all seven original B/X classes (cleric, fighter, magic-user, thief, dwarf, elf, halfling); 3d6-in-order abilities, requirements, prime-requisite adjustments, alignment, HP, attacks/saves, money, purchase and equipment limits, class/race rules, legal level tables and advancement/caps.
- **G11 · Magic:** legal cleric and magic-user (and elf) spells, memorization/prayer, spell books and acquisition, casting timing, durations, range, effects, saves, magic items and source-version parity through Expert levels.
- **G12 · Rewards/campaign economy:** treasure and magic treasure procedures, XP for foes and treasure, gold/encumbrance, hirelings/retainers, loyalty/morale, downtime, services and fair treasure/XP accounting.
- **G13 · Expert scope:** wilderness hex exploration, navigation, weather/travel, encounters, transport/ships as supported, Expert character play, settlements and appropriate campaign-scale procedures without BECMI expansion.
- **G14 · Creatures:** provenance-audited monsters and variants from original Basic/Expert, exact HD/AC/attacks/move/saves/morale/XP, context-dependent frequency/number appearing, special effects and nonnumeric special cases; all integrated into testable encounters.
- **G15 · Adventure packages:** engine-independent scenario schema for rooms/hexes, descriptions, factions, triggers, maps, clues, treasure, secrets and consequences; at least one complete play-tested, legally usable original scenario and one validated importer/converter pathway. Published modules require appropriate rights; no copied art/text in public repo.
- **G16 · Secure AI referee:** authenticated server-side credential/key handling and private adventure state; model-agnostic bounded intent parser and narration, deterministic result adjudication, clear failure/retry and disclosure contracts, player-facing likelihood/competence descriptions and full audit tests for secret leaks/injection.
- **G17 · Procedural generation:** seeded but variable scenario/adventure compiler, spatial and narrative coherence, encounter pacing, wonder/exploration and meaningful choices, consequence persistence, reproducible replay and originality safeguards; extend to connected campaigns without incoherent resets.
- **G18 · Player agency:** full-party, one-character-with-AI-party, character-switching, and optional director/spectator modes; controlled autonomous companion behavior with roles, skills, goals, bounded memory and human overrides. Mode changes preserve deterministic state.
- **G19 · UI and presentation:** accessible natural-language game loop, optional character sheets and dice transparency, responsive browser UI, simple web-based positions/maps, history/log export, navigation and optional ambient audio with mute/autoplay compliance. Current public status widget is only an early component.
- **G20 · Hosting and group play:** durable portable saves with migrations, user-controlled exports/imports and continuity; hosted persistence and **optional** drop-in/shared-session play with safe session ownership and access controls. No mandatory multiplayer requirement for an initial full solo release.
- **G21 · Release confidence:** complete full-adventure smoke campaigns, cross-browser/mobile and accessibility tests, security and private-state review, reproducible CI/Pages/backend deploys, performance, recovery and source/provenance audit. A green shell smoke test alone is insufficient.

## 5. Sequenced implementation plan

| Phase | Target outcomes | Prerequisite | Exit |
|---|---|---|---|
| **P0 — Public foundation (accepted through v0.1.7)** | G01–G06, early G08/UI/QA groundwork | None | Six strictly scoped fixtures tested and merged |
| **P1 — Finish original B/X adventure engine (ACTIVE planning)** | G07–G12, G14; next v0.1.8 pursuit/evasion evidence | P0 | Complete small dungeon campaign playable deterministically with original B/X characters, monsters, spells, fights and progression |
| **P2 — Expert/sandbox engine** | G13 plus rules coverage for wilderness, economies and multi-area persistence | P1 | Source-verified dungeon–wilderness–town loop, Expert character continuity |
| **P3 — Adventures as data** | G15, initial scenario import, replay variation | P1 and P2 as needed | Multiple scenario packs independent of game rules and playable on the same engine |
| **P4 — Secure AI referee** | G16, natural-language player actions and hidden DM data | Source-verified engine + private backend | Complete adventure can be played through natural language with secure secrets and mechanically identical outcomes |
| **P5 — Replayability / autonomy** | G17, G18, extended G20 | P3–P4 | Procedural one-shots/campaigns and optional solo/AI-party/spectator transitions |
| **P6 — Presentation / release** | Complete G19–G21 | Working core loop | Stable, accessible desktop/mobile complete-adventure acceptance and reliable deployment |

Phases may progress in parallel **only** when prerequisites are met and nonconflicting; never treat a future narrative feature as license to skip the deterministic B/X mechanics. Use small checkpoints with explicit test oracles. Rev identifiers after v0.1.8 are **not committed release promises**; the order above is architectural.

### Current immediate dependency (preserve accepted GitHub controller)

**Next:** `v0.1.8` — source-bounded pursuit decision and encounter-continuation evidence from Moldvay Basic p. B24. Inspect `pipeline-state.md` and latest audit for any newer accepted checkpoint before starting. Do **not** implement initiative, reaction, combat, generated adventure contents or hidden-AI security as an accidental side effect of this checkpoint.

## 6. Rules for all development workers

1. **Recovery first; strict isolation.** Inspect `Diabolicdonut/BX-RPG` current `main`, this roadmap, `AGENTS.md`, `pipeline-state.md`, newest accepted `audit.md`, recent PRs and green Actions. Read original B/X source PDFs only when needed. The **Known World/BECMI-Mystara repository is read-only and not development input**. Other projects are entirely out of scope.
2. **Propose the next bounded slice.** Tie every new behavior to a specific Gxx gate and original B/X page/table or to an explicitly labeled design/fixture assumption. Do not silently borrow OSE, BECMI, newer D&D editions, adventure data or previous projects' implementations.
3. **Implement under `work/*`, not on `main`.** Deterministic engine owns the true game state. AI never supplies authoritative dice, hidden state or direct patches. Preserve missing/null/zero/false distinctions, exact historical save migration, and fail-closed atomic refusals.
4. **Every accepted checkpoint must update this document.** Record the current accepted game revision, gate scope/status, evidence/PR/CI SHAs, current next dependency, milestone/phase notes and a dated history entry. If a gate is not fully satisfied, leave it `partial` or `planned` and **zero weighted credit**. Update the corresponding `site-progress.json` mirror and keep this roadmap's gate table byte-equivalent in meaning; CI will check the mirror.
5. **Acceptance:** source review; focused Node regression; full Node suite; real Chrome game UI/save/load/refusal suite; historical save replay, secrecy, compatibility and credential scan; candidate/qualified-docs CI; PR merge; **exact-main** GitHub Actions and Pages verification. Record exact SHA and run IDs in `audit.md` and `pipeline-state.md`. Never count merged-but-unverified functionality as accepted.
6. **Changes to vision and weights:** changes to gate names, weights, removals or new requirements are **scope revisions**. Describe rationale and effects on denominator, retain old figures as historically scoped, rerun roadmap/UI tests and obtain a reviewed PR. Never alter weights merely to increase percent. An overall percent can decline after a legitimate approved expansion.
7. **Blocked/missing authority:** no guessed actions or secret knowledge. Preserve a testable partial milestone and leave the gate unaccepted. Do not claim that public demo fixtures are private authenticated facts. No background promises or automatic AI deployments.
8. **Progress data roles:** `DEVELOPMENT-ROADMAP.md` = governing vision and milestones; `site-progress.json` = tested machine-readable copy of the gate table used by website; `ROADMAP-COVERAGE.md` = legacy redirect; `audit.md` = historical acceptance facts; `pipeline-state.md` = current next-execution ledger; `AGENTS.md` = work rules. The webpage summary is read-only and not part of game-state resolution.

## 7. Revision and scope change log (newest first)

- **2026-10-27 · Governance revision 1:** expanded the previous limited 36-point-earned bounded-delivery roadmap into **21 full-vision gates / 100 points**. Rebased verified foundational scope to **19%** without removing any accepted functionality; preserved separate **6/9** public-demo phase counter. Added synchronized machine-readable mirror and CI/Chrome status checks. This is *roadmap/infrastructure governance*, **not** v0.1.8 rules implementation.
- **2026-10-27 · Prior accepted rules checkpoint v0.1.7:** two evidence-gated public withdrawal dispositions (Moldvay B23/B24), save schema v8, accepted through PRs #15–16 with full Node/Chrome and Pages validation. Consult `audit.md` for exact commit/workflow facts.

Future agents **prepend a dated entry** for every accepted milestone and every approved vision change, noting before/after scope, progress, evidence and next action. A roadmap entry is not a substitute for code acceptance.
