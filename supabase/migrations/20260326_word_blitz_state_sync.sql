-- Word Blitz real-time sync
-- 1) update_word_blitz_player_slice: update only caller's slice in games.state
-- 2) finish_word_blitz_game: guarded finalize (winner IS NULL) without racing overwrites

-- Update only the caller's slice of games.state.
-- Must NOT touch current_turn or winner.
CREATE OR REPLACE FUNCTION public.update_word_blitz_player_slice(
  p_game_id uuid,
  p_grid    jsonb,
  p_score   integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_role text;
BEGIN
  -- Determine which slice this caller is allowed to update.
  SELECT
    CASE
      WHEN g.player1_id = v_uid THEN 'player1'
      WHEN g.player2_id = v_uid THEN 'player2'
      ELSE NULL
    END
  INTO v_role
  FROM games g
  WHERE g.id = p_game_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Not a participant in this Word Blitz game';
  END IF;

  -- Update only the caller's slice; preserve other keys like ready/present.
  UPDATE games
  SET state = jsonb_set(
    COALESCE(state, '{}'::jsonb),
    ARRAY[v_role],
    jsonb_build_object(
      'grid',  p_grid,
      'score', p_score
    ),
    true
  ),
  updated_at = now()
  WHERE id = p_game_id;
END;
$$;

-- Guarded finish RPC:
-- - updates winner/status/current_turn only if winner IS NULL
-- - sets games.state to the combined final state (both slices)
CREATE OR REPLACE FUNCTION public.finish_word_blitz_game(
  p_game_id uuid,
  p_state   jsonb,
  p_winner  text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rows integer;
BEGIN
  -- Only participants may finalize.
  IF NOT EXISTS (
    SELECT 1
    FROM games g
    WHERE g.id = p_game_id
      AND (g.player1_id = v_uid OR g.player2_id = v_uid)
  ) THEN
    RAISE EXCEPTION 'Not a participant in this Word Blitz game';
  END IF;

  IF p_winner NOT IN ('player1', 'player2', 'draw') THEN
    RAISE EXCEPTION 'Invalid winner value: %', p_winner;
  END IF;

  UPDATE games
  SET state = p_state,
      winner = p_winner,
      status = 'finished',
      current_turn = NULL,
      updated_at = now()
  WHERE id = p_game_id
    AND winner IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  -- If v_rows = 0, someone else already finished; that's fine.
END;
$$;

