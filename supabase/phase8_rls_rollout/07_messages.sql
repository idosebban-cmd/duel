-- Phase 8 — Step 7/9: messages
-- UPDATE policy: match membership (not sender-only). See design doc.

BEGIN;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Match members can view messages" ON messages;
DROP POLICY IF EXISTS "Match members can insert messages" ON messages;
DROP POLICY IF EXISTS "Sender can update own messages" ON messages;

DROP POLICY IF EXISTS "messages_select_match_member" ON messages;
DROP POLICY IF EXISTS "messages_insert_match_member" ON messages;
DROP POLICY IF EXISTS "messages_update_sender_only" ON messages;
DROP POLICY IF EXISTS "messages_update_match_member" ON messages;

CREATE POLICY "messages_select_match_member"
  ON messages FOR SELECT
  USING (
    room_id IN (
      SELECT id FROM matches
      WHERE user_a = auth.uid() OR user_b = auth.uid()
    )
  );

CREATE POLICY "messages_insert_match_member"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender
    AND room_id IN (
      SELECT id FROM matches
      WHERE user_a = auth.uid() OR user_b = auth.uid()
    )
  );

CREATE POLICY "messages_update_match_member"
  ON messages FOR UPDATE
  USING (
    room_id IN (
      SELECT id FROM matches
      WHERE user_a = auth.uid() OR user_b = auth.uid()
    )
  );

COMMIT;

-- ─── VALIDATION ─────────────────────────────────────────────

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'messages';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'messages'
ORDER BY policyname;

-- Rollback: ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
