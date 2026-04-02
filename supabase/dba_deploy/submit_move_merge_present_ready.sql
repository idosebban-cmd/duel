-- submit_move: merge existing state.present and state.ready into p_new_state before write.
-- Apply manually in Supabase Dashboard → SQL Editor (live DB). Do not assume migration-only deploy.
--
-- Rationale: clients often omit `present` / `ready` in p_new_state; a full replace wiped flags and broke bothPresent.

CREATE OR REPLACE FUNCTION public.submit_move(
  p_game_id    uuid,
  p_player_id  uuid,
  p_move       jsonb,
  p_new_state  jsonb,
  p_next_turn  uuid,
  p_winner     text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing jsonb;
  v_merged   jsonb;
  v_present  jsonb;
  v_ready    jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM games
    WHERE id = p_game_id
      AND (player1_id = p_player_id OR player2_id = p_player_id)
  ) THEN
    RAISE EXCEPTION 'Not a participant in this game';
  END IF;

  SELECT state INTO v_existing FROM games WHERE id = p_game_id;

  v_present := COALESCE(v_existing -> 'present', '{}'::jsonb)
    || COALESCE(p_new_state -> 'present', '{}'::jsonb);
  v_ready := COALESCE(v_existing -> 'ready', '{}'::jsonb)
    || COALESCE(p_new_state -> 'ready', '{}'::jsonb);

  v_merged := p_new_state || jsonb_build_object('present', v_present, 'ready', v_ready);

  INSERT INTO moves (game_id, player_id, move_data)
  VALUES (p_game_id, p_player_id, p_move);

  UPDATE games
  SET state        = v_merged,
      current_turn = CASE WHEN p_winner IS NOT NULL THEN NULL ELSE p_next_turn END,
      winner       = p_winner,
      status       = CASE WHEN p_winner IS NOT NULL THEN 'finished' ELSE status END,
      updated_at   = now()
  WHERE id = p_game_id;
END;
$function$;
