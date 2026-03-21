-- ============================================================
-- Migration: RLS policies, missing FK indexes, challenges CASCADE
-- Date: 2026-03-21
-- Author: Database Architect (Claude)
-- Status: REVIEW ONLY — do not apply without explicit approval
--
-- What this migration does:
--   1. Creates missing FK indexes (6 indexes)
--   2. Adds ON DELETE CASCADE to challenges FKs
--   3. Enables RLS + creates policies on ALL tables
--      (photos already has RLS enabled — skipped)
--
-- Pre-requisites:
--   - game_secrets table must exist (confirmed live)
--   - All 4 RPCs deployed (confirmed live)
--   - CHECK constraints already applied (confirmed live)
--
-- IMPORTANT: The 4 RPCs (set_player_ready, submit_move,
-- check_guess, reveal_secrets) are SECURITY DEFINER. They
-- bypass RLS by design. This is correct — they run as the
-- function owner and enforce their own authorization checks
-- internally.
-- ============================================================

BEGIN;

-- ─── 1. Missing FK Indexes ─────────────────────────────────
-- These FK columns have no covering index. Without indexes,
-- CASCADE deletes do sequential scans and JOINs are slow.

CREATE INDEX IF NOT EXISTS idx_matches_user_a
  ON matches (user_a);

CREATE INDEX IF NOT EXISTS idx_matches_user_b
  ON matches (user_b);

CREATE INDEX IF NOT EXISTS idx_games_player1
  ON games (player1_id);

CREATE INDEX IF NOT EXISTS idx_games_player2
  ON games (player2_id);

CREATE INDEX IF NOT EXISTS idx_swipes_to_user
  ON swipes (to_user);

CREATE INDEX IF NOT EXISTS idx_challenges_from_user
  ON challenges (from_user);

-- ─── 2. Challenges FK CASCADE ──────────────────────────────
-- challenges FKs currently have no ON DELETE CASCADE.
-- Deleting a match or profile leaves orphan challenge rows.

ALTER TABLE challenges
  DROP CONSTRAINT IF EXISTS challenges_match_id_fkey;
ALTER TABLE challenges
  ADD CONSTRAINT challenges_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

ALTER TABLE challenges
  DROP CONSTRAINT IF EXISTS challenges_from_user_fkey;
ALTER TABLE challenges
  ADD CONSTRAINT challenges_from_user_fkey
  FOREIGN KEY (from_user) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE challenges
  DROP CONSTRAINT IF EXISTS challenges_to_user_fkey;
ALTER TABLE challenges
  ADD CONSTRAINT challenges_to_user_fkey
  FOREIGN KEY (to_user) REFERENCES profiles(id) ON DELETE CASCADE;

-- ─── 3. RLS: profiles ──────────────────────────────────────
-- Currently: RLS disabled, stale policies may exist from schema.sql
-- App behavior:
--   - All authenticated users browse profiles (Discover feed)
--   - Users insert/update their own profile (onboarding, settings)
--   - Users delete their own profile (account deletion)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop any stale policies before recreating
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- ─── 4. RLS: photos ────────────────────────────────────────
-- Already enabled. Verify policies exist, recreate if missing.

-- photos RLS is already enabled — only ensure policies exist
DROP POLICY IF EXISTS "Authenticated users can view photos" ON photos;
DROP POLICY IF EXISTS "Users can insert their own photos" ON photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON photos;

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

-- ─── 5. RLS: swipes ────────────────────────────────────────
-- App behavior:
--   - Users insert their own swipes (recordSwipe: from_user = userId)
--   - Users read swipes TO check mutual likes (from_user = targetId, to_user = userId)
--   - Users read their own outgoing swipes (from_user = userId)
--   - No UPDATE needed (upsert = delete+insert under the hood, but
--     Supabase upsert needs INSERT + UPDATE policies)

ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own swipes" ON swipes;
DROP POLICY IF EXISTS "Users can insert their own swipes" ON swipes;
DROP POLICY IF EXISTS "Users can update their own swipes" ON swipes;

CREATE POLICY "swipes_select_own"
  ON swipes FOR SELECT
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "swipes_insert_own"
  ON swipes FOR INSERT
  WITH CHECK (auth.uid() = from_user);

-- Needed for upsert (ON CONFLICT ... DO UPDATE)
CREATE POLICY "swipes_update_own"
  ON swipes FOR UPDATE
  USING (auth.uid() = from_user);

-- ─── 6. RLS: matches ───────────────────────────────────────
-- App behavior:
--   - Users read matches they are part of (getMatches)
--   - Users insert matches (recordSwipe creates match)
--   - UPDATE: not currently used but needed for future unmatch
--   - No DELETE currently

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Matched users can view their matches" ON matches;
DROP POLICY IF EXISTS "Users can insert matches" ON matches;
DROP POLICY IF EXISTS "Participants can update match status" ON matches;

CREATE POLICY "matches_select_participant"
  ON matches FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "matches_insert_participant"
  ON matches FOR INSERT
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- Future-proofing for unmatch feature
CREATE POLICY "matches_update_participant"
  ON matches FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- ─── 7. RLS: messages ──────────────────────────────────────
-- App behavior:
--   - Users read messages in their matches (getMessages, getLastMessages)
--   - Users insert messages in their matches (sendMessage)
--   - Users update messages in their matches (markMessagesRead)
-- All operations scoped to matches the user belongs to.

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Match members can view messages" ON messages;
DROP POLICY IF EXISTS "Match members can insert messages" ON messages;
DROP POLICY IF EXISTS "Sender can update own messages" ON messages;

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

-- markMessagesRead updates delivered flag on messages from the OTHER user
-- so the updater is a match member but NOT the sender. Scope to match membership.
CREATE POLICY "messages_update_match_member"
  ON messages FOR UPDATE
  USING (
    room_id IN (
      SELECT id FROM matches
      WHERE user_a = auth.uid() OR user_b = auth.uid()
    )
  );

-- ─── 8. RLS: games ─────────────────────────────────────────
-- App behavior:
--   - Players read games they are in (fetchActiveGame, getGameById)
--   - Players insert games (createOrJoinGame)
--   - Players update games (via submit_move RPC — SECURITY DEFINER bypasses RLS,
--     but direct updates from client also happen in some paths)
--   - Players delete games (deleteGame from lobby cancel)
-- NOTE: RPCs are SECURITY DEFINER and bypass RLS.

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Match members can select games" ON games;
DROP POLICY IF EXISTS "Match members can insert games" ON games;
DROP POLICY IF EXISTS "Match members can update games" ON games;
DROP POLICY IF EXISTS "Match members can delete games" ON games;

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

-- ─── 9. RLS: moves ─────────────────────────────────────────
-- App behavior:
--   - Players read moves for their games (via game subquery)
--   - Players insert their own moves (submit_move RPC — SECURITY DEFINER)
--   - Direct client inserts also happen in some flows
-- NOTE: submit_move RPC is SECURITY DEFINER and bypasses RLS.

ALTER TABLE moves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Match members can select moves" ON moves;
DROP POLICY IF EXISTS "Players can insert their own moves" ON moves;

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

-- ─── 10. RLS: challenges ───────────────────────────────────
-- App behavior:
--   - Users read challenges for matches they are in (getChallengesForMatch
--     filters by match_id — but RLS should scope to participant)
--   - Users create challenges as themselves (createChallenge: from_user = userId)
--   - Users update challenges they sent or received (accept/decline + mutual match)

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view challenges" ON challenges;
DROP POLICY IF EXISTS "Users can create challenges" ON challenges;
DROP POLICY IF EXISTS "Participants can respond to challenges" ON challenges;

CREATE POLICY "challenges_select_participant"
  ON challenges FOR SELECT
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "challenges_insert_own"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() = from_user);

-- Both from_user and to_user need UPDATE:
--   from_user: marks opponent's challenge as 'accepted' in mutual-match path
--   to_user: accepts or declines challenges sent to them
CREATE POLICY "challenges_update_participant"
  ON challenges FOR UPDATE
  USING (auth.uid() = from_user OR auth.uid() = to_user);

-- ─── 11. RLS: game_secrets ─────────────────────────────────
-- App behavior:
--   - Players read ONLY their own secret (getMySecret)
--   - Players insert ONLY their own secret (insertGameSecret)
--   - check_guess RPC reads opponent's secret — but it's SECURITY DEFINER
--     so it bypasses RLS. This is the intended isolation mechanism.
--   - reveal_secrets RPC returns both secrets post-game — also SECURITY DEFINER.

ALTER TABLE game_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players read own secret" ON game_secrets;
DROP POLICY IF EXISTS "Players insert own secret" ON game_secrets;

CREATE POLICY "game_secrets_select_own"
  ON game_secrets FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "game_secrets_insert_own"
  ON game_secrets FOR INSERT
  WITH CHECK (auth.uid() = player_id);

COMMIT;
