-- Phase 8 — Step 8/9: games

BEGIN;

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Match members can select games" ON games;
DROP POLICY IF EXISTS "Match members can insert games" ON games;
DROP POLICY IF EXISTS "Match members can update games" ON games;
DROP POLICY IF EXISTS "Match members can delete games" ON games;

DROP POLICY IF EXISTS "games_select_player" ON games;
DROP POLICY IF EXISTS "games_insert_player" ON games;
DROP POLICY IF EXISTS "games_update_player" ON games;
DROP POLICY IF EXISTS "games_delete_player" ON games;

CREATE POLICY "games_select_player"
  ON games FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "games_insert_player"
  ON games FOR INSERT
  WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "games_update_player"
  ON games FOR UPDATE
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "games_delete_player"
  ON games FOR DELETE
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

COMMIT;

-- ─── VALIDATION ─────────────────────────────────────────────

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'games';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'games'
ORDER BY policyname;

SELECT policyname, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'games' AND policyname = 'games_insert_player';

-- Rollback: ALTER TABLE games DISABLE ROW LEVEL SECURITY;
