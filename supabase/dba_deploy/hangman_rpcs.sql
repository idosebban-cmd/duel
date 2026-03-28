-- =============================================================================
-- Hangman — SECURITY DEFINER RPCs (Duel / maqjhjvgfvomslktfznz)
-- =============================================================================
-- Deploy this file in Supabase SQL Editor BEFORE merging frontend that calls:
--   hangman_submit_setup, hangman_submit_guess
-- =============================================================================

CREATE OR REPLACE FUNCTION public.hangman_submit_setup(
  p_game_id uuid,
  p_phrase text,
  p_category text,
  p_subcategory text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid   uuid := auth.uid();
  v_game  record;
  v_phrase text := trim(both from p_phrase);
  v_len   int;
  v_i     int;
  v_c     text;
  v_reveal jsonb := '{}'::jsonb;
  v_words text[];
  v_w     text;
  v_lc    int;
  v_ci    int;
  v_cc    text;
  v_word_lengths jsonb := '[]'::jsonb;
  v_word_starts jsonb := '[]'::jsonb;
  v_off int := 0;
  v_nw int;
  v_wi int;
  v_present jsonb;
  v_ready jsonb;
  v_new_state jsonb;
  v_phrase_display text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_phrase IS NULL OR length(v_phrase) = 0 THEN
    RAISE EXCEPTION 'Phrase required';
  END IF;

  SELECT * INTO v_game
  FROM games
  WHERE id = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  IF v_game.game_type IS DISTINCT FROM 'hangman' THEN
    RAISE EXCEPTION 'Not a Hangman game';
  END IF;

  IF v_game.player1_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Only player 1 can submit setup';
  END IF;

  IF v_game.status IS DISTINCT FROM 'playing' THEN
    RAISE EXCEPTION 'Game is not in playing status';
  END IF;

  IF v_game.winner IS NOT NULL THEN
    RAISE EXCEPTION 'Game already finished';
  END IF;

  IF COALESCE(v_game.state, '{}'::jsonb) ? 'phase' THEN
    RAISE EXCEPTION 'Setup already completed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM game_secrets gs
    WHERE gs.game_id = p_game_id
      AND gs.player_id = v_game.player1_id
  ) THEN
    RAISE EXCEPTION 'Secret already exists for this game';
  END IF;

  v_phrase_display := trim(both from regexp_replace(v_phrase, '\s+', ' ', 'g'));

  IF length(v_phrase_display) = 0 THEN
    RAISE EXCEPTION 'Phrase required';
  END IF;

  v_len := length(v_phrase_display);
  FOR v_i IN 1..v_len LOOP
    v_c := substr(v_phrase_display, v_i, 1);
    IF upper(v_c) !~ '^[A-Z]$' THEN
      v_reveal := v_reveal || jsonb_build_object((v_i - 1)::text, to_jsonb(v_c));
    END IF;
  END LOOP;

  v_words := regexp_split_to_array(
    v_phrase_display,
    ' '
  );

  v_nw := coalesce(array_length(v_words, 1), 0);
  FOR v_wi IN 1..v_nw LOOP
    v_w := v_words[v_wi];
    IF length(v_w) = 0 THEN
      CONTINUE;
    END IF;
    v_word_starts := v_word_starts || jsonb_build_array(v_off);
    v_lc := 0;
    v_ci := 1;
    WHILE v_ci <= length(v_w) LOOP
      v_cc := upper(substr(v_w, v_ci, 1));
      IF v_cc ~ '^[A-Z]$' THEN
        v_lc := v_lc + 1;
      END IF;
      v_ci := v_ci + 1;
    END LOOP;
    v_word_lengths := v_word_lengths || jsonb_build_array(v_lc);
    v_off := v_off + length(v_w) + CASE WHEN v_wi < v_nw THEN 1 ELSE 0 END;
  END LOOP;

  IF jsonb_array_length(v_word_lengths) = 0 THEN
    RAISE EXCEPTION 'Phrase must contain at least one letter';
  END IF;

  INSERT INTO game_secrets (game_id, player_id, character_id)
  VALUES (p_game_id, v_game.player1_id, v_phrase_display);

  v_present := COALESCE(v_game.state->'present', '{}'::jsonb);
  v_ready := COALESCE(v_game.state->'ready', '{}'::jsonb);

  v_new_state :=
    jsonb_build_object(
      'phase', 'in_progress',
      'category', to_jsonb(p_category),
      'subcategory', to_jsonb(p_subcategory),
      'wordLengths', v_word_lengths,
      'wordStartIndices', v_word_starts,
      'phraseLength', length(v_phrase_display),
      'guessedLetters', '[]'::jsonb,
      'wrongLetters', '[]'::jsonb,
      'wrongCount', 0,
      'revealedSlots', '{}'::jsonb,
      'revealMap', v_reveal
    )
    || jsonb_build_object('present', v_present, 'ready', v_ready);

  UPDATE games
  SET state = v_new_state,
      current_turn = v_game.player2_id,
      updated_at = now()
  WHERE id = p_game_id;

  INSERT INTO moves (game_id, player_id, move_data)
  VALUES (
    p_game_id,
    v_uid,
    jsonb_build_object(
      'type', 'setup',
      'category', p_category,
      'subcategory', p_subcategory
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.hangman_submit_guess(
  p_game_id uuid,
  p_letter text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid    uuid := auth.uid();
  v_game   record;
  v_state  jsonb;
  v_phrase text;
  v_letter text;
  v_len    int;
  v_i      int;
  v_c      text;
  v_hit    boolean := false;
  v_guessed jsonb;
  v_wrong   jsonb;
  v_wc      int;
  v_req     text[] := ARRAY[]::text[];
  v_r       text;
  v_ok      boolean;
  v_winner  text := null;
  v_present jsonb;
  v_ready   jsonb;
  v_new_state jsonb;
  v_revealed jsonb;
  g         text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_letter := upper(trim(both from p_letter));
  IF length(v_letter) <> 1 OR v_letter !~ '^[A-Z]$' THEN
    RAISE EXCEPTION 'Invalid letter';
  END IF;

  SELECT * INTO v_game
  FROM games
  WHERE id = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  IF v_game.game_type IS DISTINCT FROM 'hangman' THEN
    RAISE EXCEPTION 'Not a Hangman game';
  END IF;

  IF v_game.player2_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Only player 2 can guess';
  END IF;

  IF v_game.status IS DISTINCT FROM 'playing' THEN
    RAISE EXCEPTION 'Game is not in playing status';
  END IF;

  IF v_game.winner IS NOT NULL THEN
    RAISE EXCEPTION 'Game already finished';
  END IF;

  v_state := COALESCE(v_game.state, '{}'::jsonb);

  IF v_state->>'phase' IS DISTINCT FROM 'in_progress' THEN
    RAISE EXCEPTION 'Game is not in guessing phase';
  END IF;

  v_guessed := COALESCE(v_state->'guessedLetters', '[]'::jsonb);
  FOR g IN SELECT jsonb_array_elements_text(v_guessed)
  LOOP
    IF upper(g) = v_letter THEN
      RAISE EXCEPTION 'Letter already guessed';
    END IF;
  END LOOP;

  SELECT gs.character_id INTO v_phrase
  FROM game_secrets gs
  WHERE gs.game_id = p_game_id
    AND gs.player_id = v_game.player1_id;

  IF v_phrase IS NULL THEN
    RAISE EXCEPTION 'Secret phrase not found';
  END IF;

  v_len := length(v_phrase);
  FOR v_i IN 1..v_len LOOP
    v_c := upper(substr(v_phrase, v_i, 1));
    IF v_c = v_letter AND v_c ~ '^[A-Z]$' THEN
      v_hit := true;
      EXIT;
    END IF;
  END LOOP;

  v_guessed := v_guessed || jsonb_build_array(v_letter);
  v_revealed := COALESCE(v_state->'revealedSlots', '{}'::jsonb);
  IF v_hit THEN
    FOR v_i IN 1..v_len LOOP
      v_c := upper(substr(v_phrase, v_i, 1));
      IF v_c = v_letter AND v_c ~ '^[A-Z]$' THEN
        v_revealed := v_revealed || jsonb_build_object((v_i - 1)::text, to_jsonb(substr(v_phrase, v_i, 1)));
      END IF;
    END LOOP;
  END IF;
  v_wrong := COALESCE(v_state->'wrongLetters', '[]'::jsonb);
  v_wc := COALESCE((v_state->>'wrongCount')::int, 0);

  IF v_hit THEN
    NULL;
  ELSE
    v_wrong := v_wrong || jsonb_build_array(v_letter);
    v_wc := v_wc + 1;
  END IF;

  FOR v_i IN 1..v_len LOOP
    v_c := upper(substr(v_phrase, v_i, 1));
    IF v_c ~ '^[A-Z]$' THEN
      IF NOT (v_c = ANY(v_req)) THEN
        v_req := array_append(v_req, v_c);
      END IF;
    END IF;
  END LOOP;

  v_ok := true;
  FOREACH v_r IN ARRAY v_req LOOP
    v_ok := false;
    FOR g IN SELECT jsonb_array_elements_text(v_guessed)
    LOOP
      IF upper(g) = v_r THEN
        v_ok := true;
        EXIT;
      END IF;
    END LOOP;
    IF NOT v_ok THEN
      EXIT;
    END IF;
  END LOOP;

  IF array_length(v_req, 1) IS NULL OR array_length(v_req, 1) = 0 THEN
    v_ok := true;
  END IF;

  IF v_ok THEN
    v_winner := 'player2';
  ELSIF v_wc >= 6 THEN
    v_winner := 'player1';
  END IF;

  v_present := COALESCE(v_state->'present', '{}'::jsonb);
  v_ready := COALESCE(v_state->'ready', '{}'::jsonb);

  v_new_state :=
    jsonb_build_object(
      'phase', CASE WHEN v_winner IS NOT NULL THEN 'complete' ELSE 'in_progress' END,
      'category', v_state->'category',
      'subcategory', v_state->'subcategory',
      'wordLengths', v_state->'wordLengths',
      'wordStartIndices', v_state->'wordStartIndices',
      'phraseLength', v_state->'phraseLength',
      'revealMap', v_state->'revealMap',
      'revealedSlots', v_revealed,
      'guessedLetters', v_guessed,
      'wrongLetters', v_wrong,
      'wrongCount', v_wc
    )
    || jsonb_build_object('present', v_present, 'ready', v_ready);

  IF v_winner IS NOT NULL THEN
    v_new_state := v_new_state || jsonb_build_object('solution', to_jsonb(v_phrase));
  END IF;

  UPDATE games
  SET state = v_new_state,
      winner = v_winner,
      status = CASE WHEN v_winner IS NOT NULL THEN 'finished' ELSE v_game.status END,
      current_turn = CASE WHEN v_winner IS NOT NULL THEN NULL ELSE v_game.player2_id END,
      updated_at = now()
  WHERE id = p_game_id;

  INSERT INTO moves (game_id, player_id, move_data)
  VALUES (
    p_game_id,
    v_uid,
    jsonb_build_object(
      'type', 'guess',
      'letter', v_letter,
      'hit', v_hit
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.hangman_submit_setup(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hangman_submit_guess(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.hangman_submit_setup(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hangman_submit_guess(uuid, text) TO authenticated;
