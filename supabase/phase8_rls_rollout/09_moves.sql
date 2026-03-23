-- Phase 8 — Step 9/9: moves

BEGIN;

ALTER TABLE moves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Match members can select moves" ON moves;
DROP POLICY IF EXISTS "Players can insert their own moves" ON moves;

DROP POLICY IF EXISTS "moves_select_game_player" ON moves;
DROP POLICY IF EXISTS "moves_insert_own" ON moves;

CREATE POLICY "moves_select_game_player"
  ON moves FOR SELECT
  USING (
    game_id IN (
      SELECT id FROM games
      WHERE player1_id = auth.uid() OR player2_id = auth.uid()
    )
  );

CREATE POLICY "moves_insert_own"
  ON moves FOR INSERT
  WITH CHECK (auth.uid() = player_id);

COMMIT;

-- ─── VALIDATION ─────────────────────────────────────────────

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'moves';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'moves'
ORDER BY policyname;

-- Rollback: ALTER TABLE moves DISABLE ROW LEVEL SECURITY;
