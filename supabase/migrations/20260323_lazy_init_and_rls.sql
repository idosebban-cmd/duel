-- ============================================================
-- Migration: Lazy game init + RLS hardening
-- Date: 2026-03-23
-- Description:
--   1. New RPC: initialise_game (populates full state per game_type)
--   2. Updated RPC: set_player_ready (triggers initialise_game when both ready)
--   3. Hardened RPC: submit_move (auth.uid() check)
--   4. Missing RLS policies: profiles DELETE, swipes DELETE
--   5. game_secrets table + RLS (IF NOT EXISTS)
--   6. challenges RLS policies
--   7. messages UPDATE policy fix
-- ============================================================

-- ─── 1. New RPC: initialise_game ──────────────────────────────────────────────
-- Called atomically by set_player_ready when both players are ready.
-- NOT called by the frontend directly.

CREATE OR REPLACE FUNCTION initialise_game(p_game_id UUID)
RETURNS VOID AS $$
DECLARE
  v_game games%ROWTYPE;
  v_state JSONB;
BEGIN
  SELECT * INTO v_game FROM games WHERE id = p_game_id FOR UPDATE;
  IF v_game IS NULL THEN RAISE EXCEPTION 'Game not found'; END IF;
  IF v_game.status <> 'pending' THEN RETURN; END IF; -- idempotent

  -- Build full state based on game_type
  CASE v_game.game_type
    WHEN 'connect_four' THEN
      v_state := jsonb_build_object(
        'board', '[[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]]'::jsonb,
        'moveCount', 0
      );
    WHEN 'battleship' THEN
      v_state := '{
        "phase": "placing_p1",
        "p1Ships": null, "p1Grid": null,
        "p2Ships": null, "p2Grid": null,
        "p1Shots": [[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null]],
        "p2Shots": [[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null]]
      }'::jsonb;
    WHEN 'draughts' THEN
      -- Generate 24 pieces: 12 for p2 (rows 0-2), 12 for p1 (rows 5-7)
      v_state := jsonb_build_object('pieces', (
        SELECT jsonb_agg(piece ORDER BY r, c) FROM (
          SELECT jsonb_build_object(
            'id', CASE WHEN r < 3 THEN 'b' ELSE 'p' END || (row_number() OVER (ORDER BY r, c) - 1)::text,
            'row', r, 'col', c,
            'player', CASE WHEN r < 3 THEN 'p2' ELSE 'p1' END,
            'isKing', false
          ) AS piece, r, c
          FROM generate_series(0,7) AS r, generate_series(0,7) AS c
          WHERE (r + c) % 2 = 1 AND (r < 3 OR r > 4)
        ) sub
      ), 'moveCount', 0);
    WHEN 'guess_who' THEN
      -- Character board is deterministic from matchId — generated client-side.
      -- Server sets skeleton; client heal_init populates characters.
      v_state := jsonb_build_object(
        'characters', '[]'::jsonb,
        'p1Flipped', '[]'::jsonb, 'p2Flipped', '[]'::jsonb,
        'turnPhase', 'ask',
        'currentQuestion', 'null'::jsonb,
        'currentAnswer', 'null'::jsonb,
        'turnHistory', '[]'::jsonb,
        'moveCount', 0
      );
    WHEN 'word_blitz' THEN
      v_state := '{"grid":[],"pool":[],"p1Score":0,"p2Score":0,"moveCount":0}'::jsonb;
    WHEN 'dot_dash' THEN
      v_state := '{}'::jsonb;
    ELSE
      v_state := '{}'::jsonb;
  END CASE;

  -- Preserve ready flags in state
  v_state := v_state || jsonb_build_object('ready', COALESCE(v_game.state->'ready', '{}'::jsonb));

  UPDATE games
  SET state        = v_state,
      current_turn = v_game.player1_id,
      status       = 'playing',
      updated_at   = now()
  WHERE id = p_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;


-- ─── 2. Updated RPC: set_player_ready ─────────────────────────────────────────
-- Now calls initialise_game atomically when both players are ready.
-- Added auth.uid() check to prevent impersonation.

CREATE OR REPLACE FUNCTION set_player_ready(
  p_game_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_ready JSONB;
  v_game  games%ROWTYPE;
BEGIN
  -- Verify caller is who they claim
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'p_user_id must match authenticated user';
  END IF;

  -- Atomically set ready flag
  UPDATE games
  SET state = jsonb_set(
    COALESCE(state, '{}'::jsonb),
    ARRAY['ready', p_user_id::text],
    'true'::jsonb
  ),
  updated_at = now()
  WHERE id = p_game_id
    AND (player1_id = p_user_id OR player2_id = p_user_id)
  RETURNING state->'ready', games.* INTO v_ready, v_game;

  IF v_game IS NULL THEN
    RAISE EXCEPTION 'Game not found or user is not a participant';
  END IF;

  -- If both players ready, initialise the game
  IF (v_ready->>v_game.player1_id::text)::boolean IS TRUE
     AND (v_ready->>v_game.player2_id::text)::boolean IS TRUE
  THEN
    PERFORM initialise_game(p_game_id);
  END IF;

  RETURN v_ready;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;


-- ─── 3. Hardened RPC: submit_move ─────────────────────────────────────────────
-- Added auth.uid() check to prevent player impersonation.

CREATE OR REPLACE FUNCTION submit_move(
  p_game_id    UUID,
  p_player_id  UUID,
  p_move       JSONB,
  p_new_state  JSONB,
  p_next_turn  UUID,
  p_winner     TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Verify caller is who they claim
  IF p_player_id <> auth.uid() THEN
    RAISE EXCEPTION 'p_player_id must match authenticated user';
  END IF;

  -- Verify caller is a participant
  IF NOT EXISTS (
    SELECT 1 FROM games
    WHERE id = p_game_id
      AND (player1_id = p_player_id OR player2_id = p_player_id)
  ) THEN
    RAISE EXCEPTION 'Not a participant in this game';
  END IF;

  INSERT INTO moves (game_id, player_id, move_data)
  VALUES (p_game_id, p_player_id, p_move);

  UPDATE games
  SET state        = p_new_state,
      current_turn = CASE WHEN p_winner IS NOT NULL THEN NULL ELSE p_next_turn END,
      winner       = p_winner,
      updated_at   = now()
  WHERE id = p_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;


-- ─── 4. profiles DELETE policy ────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can delete their own profile'
  ) THEN
    CREATE POLICY "Users can delete their own profile"
      ON profiles FOR DELETE
      USING (auth.uid() = id);
  END IF;
END $$;


-- ─── 5. swipes DELETE policy ──────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'swipes' AND policyname = 'Users can delete their own swipes'
  ) THEN
    CREATE POLICY "Users can delete their own swipes"
      ON swipes FOR DELETE
      USING (auth.uid() = from_user);
  END IF;
END $$;


-- ─── 6. game_secrets table + RLS ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_secrets (
  game_id      uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id    uuid NOT NULL REFERENCES auth.users(id),
  character_id text NOT NULL,
  PRIMARY KEY (game_id, player_id)
);

ALTER TABLE game_secrets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'game_secrets' AND policyname = 'Players can view their own secret'
  ) THEN
    CREATE POLICY "Players can view their own secret"
      ON game_secrets FOR SELECT
      USING (auth.uid() = player_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'game_secrets' AND policyname = 'Players can insert their own secret'
  ) THEN
    CREATE POLICY "Players can insert their own secret"
      ON game_secrets FOR INSERT
      WITH CHECK (auth.uid() = player_id);
  END IF;
END $$;


-- ─── 7. challenges RLS ───────────────────────────────────────────────────────

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'challenges' AND policyname = 'Users can view their own challenges'
  ) THEN
    CREATE POLICY "Users can view their own challenges"
      ON challenges FOR SELECT
      USING (auth.uid() = from_user OR auth.uid() = to_user);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'challenges' AND policyname = 'Users can create challenges from themselves'
  ) THEN
    CREATE POLICY "Users can create challenges from themselves"
      ON challenges FOR INSERT
      WITH CHECK (auth.uid() = from_user);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'challenges' AND policyname = 'Involved users can update challenges'
  ) THEN
    CREATE POLICY "Involved users can update challenges"
      ON challenges FOR UPDATE
      USING (auth.uid() = from_user OR auth.uid() = to_user);
  END IF;
END $$;


-- ─── 8. messages UPDATE policy fix ───────────────────────────────────────────
-- Old policy only allowed sender to update. markMessagesRead is called by
-- the recipient to flip delivered=true. Replace with match-member check.

DROP POLICY IF EXISTS "Sender can update own messages" ON messages;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Match members can update messages'
  ) THEN
    CREATE POLICY "Match members can update messages"
      ON messages FOR UPDATE
      USING (room_id IN (
        SELECT id FROM matches WHERE user_a = auth.uid() OR user_b = auth.uid()
      ));
  END IF;
END $$;


-- ─── 9. Partial unique index: one active game per match+type ─────────────────
-- Prevents race condition where both players INSERT simultaneously.

CREATE UNIQUE INDEX IF NOT EXISTS uq_games_match_type_active
  ON games (match_id, game_type)
  WHERE winner IS NULL;
