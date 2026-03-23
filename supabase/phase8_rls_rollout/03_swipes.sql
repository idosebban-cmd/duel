-- Phase 8 — Step 3/9: swipes

BEGIN;

ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own swipes" ON swipes;
DROP POLICY IF EXISTS "Users can insert their own swipes" ON swipes;
DROP POLICY IF EXISTS "Users can update their own swipes" ON swipes;

DROP POLICY IF EXISTS "swipes_select_own" ON swipes;
DROP POLICY IF EXISTS "swipes_insert_own" ON swipes;
DROP POLICY IF EXISTS "swipes_update_own" ON swipes;

CREATE POLICY "swipes_select_own"
  ON swipes FOR SELECT
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "swipes_insert_own"
  ON swipes FOR INSERT
  WITH CHECK (auth.uid() = from_user);

CREATE POLICY "swipes_update_own"
  ON swipes FOR UPDATE
  USING (auth.uid() = from_user);

COMMIT;

-- ─── VALIDATION ─────────────────────────────────────────────

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'swipes';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'swipes'
ORDER BY policyname;

-- Rollback: ALTER TABLE swipes DISABLE ROW LEVEL SECURITY;
