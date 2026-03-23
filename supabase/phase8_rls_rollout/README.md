# Phase 8 — RLS rollout (table order)

**Status:** ✅ Applied and verified on the live database (all 9 tables: `rowsecurity = true`, policies confirmed).

**Source of truth:** `docs/superpowers/specs/2026-03-23-lobbyless-challenge-flow-design.md` (RLS section).

**Order (strict):**  
`profiles` → `photos` → `swipes` → `game_secrets` → `matches` → `challenges` → `messages` → `games` → `moves`

## How to run

1. Open **Supabase Dashboard → SQL Editor** for project `maqjhjvgfvomslktfznz` (or your linked project).
2. For each numbered file **in order**:
   - Paste and run the **APPLY** block (`01_profiles.sql` … `09_moves.sql`).
   - Paste and run the **VALIDATION** block from the same file (or use the separate `validate_*.sql` snippet at bottom of each file).
3. **Do not** open the next file until validation output looks correct (see below).
4. Optional: run the **FUNCTIONAL TEST** from the design doc if your role allows `SET ROLE authenticated` (often superuser-only in hosted Postgres).

## Expected validation (each table)

- `SELECT` from `pg_tables`: `rowsecurity` = **true** for that table.
- `SELECT` from `pg_policies`: policy names and `cmd` values match the design doc for that table.

## Rollback

Each design-doc section includes `ALTER TABLE … DISABLE ROW LEVEL SECURITY;` for emergency rollback **only for that table**.

## Agent limitation

Automated execution against the live DB is not available from CI/agent here (no DB URL / service role in repo). **You** run the SQL and paste results if you want them recorded in a ticket/PR.
