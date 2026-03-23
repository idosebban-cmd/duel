-- Phase 8 — Step 4/9: game_secrets

BEGIN;

ALTER TABLE game_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players read own secret" ON game_secrets;
DROP POLICY IF EXISTS "Players insert own secret" ON game_secrets;

DROP POLICY IF EXISTS "game_secrets_select_own" ON game_secrets;
DROP POLICY IF EXISTS "game_secrets_insert_own" ON game_secrets;

CREATE POLICY "game_secrets_select_own"
  ON game_secrets FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "game_secrets_insert_own"
  ON game_secrets FOR INSERT
  WITH CHECK (auth.uid() = player_id);

COMMIT;

-- ─── VALIDATION ─────────────────────────────────────────────

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'game_secrets';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'game_secrets'
ORDER BY policyname;

-- Rollback: ALTER TABLE game_secrets DISABLE ROW LEVEL SECURITY;
