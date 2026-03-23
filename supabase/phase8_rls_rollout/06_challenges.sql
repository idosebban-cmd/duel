-- Phase 8 — Step 6/9: challenges

BEGIN;

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view challenges" ON challenges;
DROP POLICY IF EXISTS "Users can create challenges" ON challenges;
DROP POLICY IF EXISTS "Participants can respond to challenges" ON challenges;

DROP POLICY IF EXISTS "challenges_select_participant" ON challenges;
DROP POLICY IF EXISTS "challenges_insert_own" ON challenges;
DROP POLICY IF EXISTS "challenges_update_participant" ON challenges;

CREATE POLICY "challenges_select_participant"
  ON challenges FOR SELECT
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "challenges_insert_own"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() = from_user);

CREATE POLICY "challenges_update_participant"
  ON challenges FOR UPDATE
  USING (auth.uid() = from_user OR auth.uid() = to_user);

COMMIT;

-- ─── VALIDATION ─────────────────────────────────────────────

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'challenges';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'challenges'
ORDER BY policyname;

-- Rollback: ALTER TABLE challenges DISABLE ROW LEVEL SECURITY;
