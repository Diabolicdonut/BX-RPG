# B/X RPG development policy

- This is **Diabolicdonut/BX-RPG only**. The Known World source `Diabolicdonut/BECMI-Mystara` is **READ ONLY**. Do not edit, branch, or trigger actions there.
- Primary rules: original 1981 Moldvay Basic (TSR 1011) plus Cook/Marsh Expert (TSR 1012). OSE Classic Fantasy v1.3 is clarification only. Never import Mentzer/Rules Cyclopedia differences silently. Cite rule-source page/section in future mechanic PRs and document B/X versus OSE differences.
- No Mystara world data, BECMI Companion/Master/Immortals rules, Weapon Measure, Context Matrix, Ferocity, Arms Across Eras, mass combat, or unrelated expansions. Avoid copyrighted PDFs, long reproduced passages, and proprietary art.
- The deterministic engine and validated persisted state exclusively own RNG, mechanics, HP, XP, inventory, time, and discovery. The AI may propose typed intentions and narrate sanitized outcomes; it can never apply a state patch or supply authoritative die results. Reject unknown, stale, or invalid operations without state or RNG mutation.
- Preserve missing/null/zero/false distinctions. Validate saves at ingress and version them for future migrations. The UI reflects state but is not an independent referee. Do not reveal hidden adventure data.
- No browser-embedded secret or untrusted AI credential; future AI calls use a secure server-side proxy and no player secrets in model logs by default.
- `main` is accepted only. Work on small `work/vX.Y.Z-*` candidate branches; test before merge, record verified results and exact SHA, and stop at the authorized checkpoint. Keep `pipeline-state.md` and the latest `audit.md` entry current. Do not call a local diagnostic parser an AI referee.
- v0.1.0 is intentionally a demo shell. Never describe the sample fighter or diagnostic die roller as B/X character generation or B/X adjudication.
