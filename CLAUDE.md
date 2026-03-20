# Claude Code — Duel Project Rules

## Ground rules

- Minimal changes only — don't touch unrelated code
- No fake UUIDs or silent error swallowing
- Never use window.history.back() — always use explicit navigate()
- Supabase returns PromiseLike not Promise — use try/catch not .catch()
- Always run npm run build to verify before committing
- Before any changes: show files to touch, flag risks, wait for confirmation
- After editing any navigation call, re-read the exact line with grep
  and confirm the path is a valid string with correct syntax before committing
- After every fix: commit, push, and remind me to create a PR
- Always run git fetch origin && git log --oneline origin/main before
  starting work to confirm what's on main
- Before writing any code that reads from or writes to Supabase,
  run SELECT queries against the live DB to confirm every table
  column, constraint, and RPC function actually exists with the
  expected names and types. Never assume schema.sql matches the
  live DB.

## Git & deploy workflow

- One branch per session — start fresh from main, never reuse a merged branch
- Strict pipeline: branch → PR → merge to main → confirm Netlify deploy → then test
- Verify fix is on main before closing a bug — git log main must contain the commit
- Check Netlify deploy hash matches latest main commit before testing on playduel.app
- QA against main/production only — never against the feature branch

## Tech stack

- React + Vite + TypeScript + Tailwind
- Zustand (persisted to localStorage)
- Supabase (auth, database, realtime) — project: maqjhjvgfvomslktfznz
- Netlify (auto-deploys from main) — live URL: playduel.app
- Supabase requires legacy JWT anon key (eyJ... format)
- RLS is currently DISABLED on all tables

## Key files

- src/lib/database.ts
- src/store/authStore.ts
- src/store/onboardingStore.ts
- src/pages/DiscoverScreen.tsx
- src/pages/ProfileScreen.tsx
