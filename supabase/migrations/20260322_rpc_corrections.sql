-- ============================================================
-- Migration: RPC corrections + constraint cleanup
-- Date: 2026-03-22
-- Source: pg_get_functiondef from live DB
--
-- What this migration does:
--   1. Replaces check_guess RPC with corrected live definition
--      (adds status = 'finished' on game completion)
--   2. Drops stale challenges_status_check constraint
--
-- NOTE: These definitions were already applied directly to the
-- live DB. This migration exists for version control only.
-- ============================================================

-- ─── 1. check_guess RPC (live definition with status fix) ────
-- Key fix: SET status = 'finished' when a guess resolves the game.
-- Previous version did not update status, leaving games in
-- 'playing' state after a winner was determined.

CREATE OR REPLACE FUNCTION public.check_guess(p_game_id uuid, p_guessed_character text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_guesser_id   UUID := auth.uid();
  v_game         RECORD;
  v_secret       TEXT;
  v_correct      BOOLEAN;
  v_winner       TEXT;
  v_opponent_id  UUID;
BEGIN
  SELECT * INTO v_game
    FROM games
   WHERE id = p_game_id
     AND winner IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found or already finished';
  END IF;
  IF v_game.player1_id = v_guesser_id THEN
    v_opponent_id := v_game.player2_id;
  ELSIF v_game.player2_id = v_guesser_id THEN
    v_opponent_id := v_game.player1_id;
  ELSE
    RAISE EXCEPTION 'You are not a player in this game';
  END IF;
  SELECT character_id INTO v_secret
    FROM game_secrets
   WHERE game_id = p_game_id
     AND player_id = v_opponent_id;
  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'Opponent secret not found';
  END IF;
  v_correct := (v_secret = p_guessed_character);
  IF v_correct THEN
    v_winner := CASE WHEN v_game.player1_id = v_guesser_id THEN 'player1' ELSE 'player2' END;
  ELSE
    v_winner := CASE WHEN v_game.player1_id = v_guesser_id THEN 'player2' ELSE 'player1' END;
  END IF;
  UPDATE games
     SET winner     = v_winner,
         status     = 'finished',
         updated_at = now()
   WHERE id = p_game_id;
  INSERT INTO moves (game_id, player_id, move_data)
  VALUES (p_game_id, v_guesser_id, jsonb_build_object(
    'type', 'guess',
    'guessedCharacterId', p_guessed_character,
    'correct', v_correct
  ));
  RETURN jsonb_build_object('correct', v_correct, 'winner', v_winner);
END;
$function$;

-- ─── 2. Drop stale challenges_status_check constraint ────────
-- This constraint name does not match the canonical
-- chk_challenges_status defined in 20260321. Drop it to
-- prevent conflicts.

ALTER TABLE challenges DROP CONSTRAINT IF EXISTS challenges_status_check;
