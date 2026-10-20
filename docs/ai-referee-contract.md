# AI referee boundary · v0.1.0 contract

Status: **interface defined; remote AI not connected.** No fake AI responses. A tiny **explicit local diagnostic parser** recognizes only `roll d6`. Free-form prose is declined without changing state.

Proposed message shape (strictly untrusted, engine validates it):

```json
{"contract":"bx.intent.v1","baseRevision":0,"operations":[{"kind":"diagnostic.roll","sides":6}]}
```

`executeProposal(state, proposal)` validates the version, expected revision, op whitelist, operands, and state; it **never accepts** AI-provided RNG outcomes, HP, journal, flags, or state patches. All or nothing: rejected proposal means the original state and RNG are returned unchanged. Accepted diagnostic roll returns an authoritative typed outcome and next state; the presentation layer narrates **only** that outcome. Adding real B/X actions requires rule-source review and new tests. The v0.1.0 sample sheet has no hidden adventure material and is explicitly noncanonical.

Future secure integration: browser sends player text and bounded **player-visible** context to an authenticated backend; backend owns API key, verifies request/session, obtains a schema-constrained proposed intent from the model, returns an untrusted proposal for deterministic engine validation; narration receives only sanitized, already adjudicated player-visible outcomes. A trusted server authority / signed action channel is required for adversarial multiplayer or protected adventure secrets. GitHub Pages alone **cannot** securely host private API keys or referee-only data.

Future adapter must handle ambiguous or unsupported intent with a clarification, never invent a dungeon room, enemy, hidden trap, or result. The engine persists exact RNG state and operation results so a save/reload does not reroll.
