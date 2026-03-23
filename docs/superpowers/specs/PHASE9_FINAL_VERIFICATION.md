# Phase 9 — Final verification & cleanup (post lobbyless + RLS)

Completed checklist:

- [x] **Documentation:** `CLAUDE.md` reflects RLS enabled; `DATABASE_AUTHORITY.md` aligned with live policies (including `game_secrets`, `challenges`, messages UPDATE scope); `PROJECT_HANDOFF.md` / `ARCHITECTURE_ANALYSIS.md` stale lobby/RLS notes updated; `supabase/phase8_rls_rollout/README.md` marked verified.
- [x] **E2E:** `tests/e2e/game-flow.spec.ts` updated for lobbyless Guess Who (`/play` instead of `/lobby`, expectations for removed lobby route).
- [x] **Build:** Run `npm run build` and `npm run lint` before merge.

**Manual QA (production):** After deploy to `playduel.app`, spot-check Discover → match → challenge → board for Guess Who / Connect Four / Draughts / Battleship; confirm Netlify deploy hash matches `main`.
