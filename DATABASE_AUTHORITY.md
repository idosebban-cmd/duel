# Database Authority — Supabase RPCs

This file documents the authoritative SQL for Supabase RPC functions.

## check_guess

**Purpose:** Atomically checks a player's guess against the opponent's secret
character, inserts the move, and finalizes the game (sets winner) in a single
transaction.

**Frontend contract:** The frontend calls `checkGuess(gameId, guessedCharacter)`
which returns `{ correct: boolean; winner: string } | null`. On success the RPC
handles everything — the frontend does NOT call `submitMove()` after a guess.
Navigation to the result screen happens automatically via polling when the
`games.winner` column is set.

```sql
CREATE OR REPLACE FUNCTION check_guess(
  p_game_id   UUID,
  p_guessed_character TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guesser_id   UUID := auth.uid();
  v_game         RECORD;
  v_secret       TEXT;
  v_correct      BOOLEAN;
  v_winner       TEXT;     -- 'player1' | 'player2'
  v_winner_uid   UUID;
  v_opponent_id  UUID;
BEGIN
  -- Lock the game row for update
  SELECT * INTO v_game
    FROM games
   WHERE id = p_game_id
     AND winner IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found or already finished';
  END IF;

  -- Determine opponent
  IF v_game.player1_id = v_guesser_id THEN
    v_opponent_id := v_game.player2_id;
  ELSIF v_game.player2_id = v_guesser_id THEN
    v_opponent_id := v_game.player1_id;
  ELSE
    RAISE EXCEPTION 'You are not a player in this game';
  END IF;

  -- Look up the opponent's secret character
  SELECT character_id INTO v_secret
    FROM game_secrets
   WHERE game_id = p_game_id
     AND player_id = v_opponent_id;

  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'Opponent secret not found';
  END IF;

  -- Check the guess
  v_correct := (v_secret = p_guessed_character);

  IF v_correct THEN
    -- Guesser wins
    v_winner := CASE WHEN v_game.player1_id = v_guesser_id THEN 'player1' ELSE 'player2' END;
    v_winner_uid := v_guesser_id;
  ELSE
    -- Wrong guess: opponent wins
    v_winner := CASE WHEN v_game.player1_id = v_guesser_id THEN 'player2' ELSE 'player1' END;
    v_winner_uid := v_opponent_id;
  END IF;

  -- Finalize the game
  UPDATE games
     SET winner     = v_winner,
         updated_at = now()
   WHERE id = p_game_id;

  -- Insert the move record
  INSERT INTO game_moves (game_id, player_id, move)
  VALUES (p_game_id, v_guesser_id, jsonb_build_object(
    'type', 'guess',
    'guessedCharacterId', p_guessed_character,
    'correct', v_correct
  ));

  RETURN jsonb_build_object('correct', v_correct, 'winner', v_winner);
END;
$$;
```
