-- Phase 8 — Step 5/9: matches

BEGIN;

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Matched users can view their matches" ON matches;
DROP POLICY IF EXISTS "Users can insert matches" ON matches;
DROP POLICY IF EXISTS "Participants can update match status" ON matches;

DROP POLICY IF EXISTS "matches_select_participant" ON matches;
DROP POLICY IF EXISTS "matches_insert_participant" ON matches;
DROP POLICY IF EXISTS "matches_update_participant" ON matches;

CREATE POLICY "matches_select_participant"
  ON matches FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "matches_insert_participant"
  ON matches FOR INSERT
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "matches_update_participant"
  ON matches FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

COMMIT;

-- ─── VALIDATION ─────────────────────────────────────────────

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'matches';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'matches'
ORDER BY policyname;

-- Rollback: ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
