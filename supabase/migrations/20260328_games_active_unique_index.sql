-- One active (unfinished) row per match + game_type — required for createOrJoinGame
-- and Maze Race / Dot Dash finalize queries (winner IS NULL).
CREATE UNIQUE INDEX IF NOT EXISTS uq_games_match_type_active
  ON public.games (match_id, game_type)
  WHERE winner IS NULL;
