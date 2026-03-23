-- Phase 8 — Step 2/9: photos

BEGIN;

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view photos" ON photos;
DROP POLICY IF EXISTS "Users can insert their own photos" ON photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON photos;

DROP POLICY IF EXISTS "photos_select_authenticated" ON photos;
DROP POLICY IF EXISTS "photos_insert_own" ON photos;
DROP POLICY IF EXISTS "photos_update_own" ON photos;
DROP POLICY IF EXISTS "photos_delete_own" ON photos;

CREATE POLICY "photos_select_authenticated"
  ON photos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "photos_insert_own"
  ON photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "photos_update_own"
  ON photos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "photos_delete_own"
  ON photos FOR DELETE
  USING (auth.uid() = user_id);

COMMIT;

-- ─── VALIDATION ─────────────────────────────────────────────

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'photos';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'photos'
ORDER BY policyname;

-- Rollback: ALTER TABLE photos DISABLE ROW LEVEL SECURITY;
