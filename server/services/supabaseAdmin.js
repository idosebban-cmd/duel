'use strict';

const { createClient } = require('@supabase/supabase-js');

let client;

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

/**
 * Maze Race socket `gameId` is the match id (see /api/mazerace/create body).
 * games rows are keyed by match_id + game_type for maze_race.
 */
async function updateMazeRaceGameStatus(matchId, status) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('games')
      .update({ status })
      .eq('match_id', matchId)
      .eq('game_type', 'maze_race');
    if (error) console.error('[MazeRace] Supabase games status update failed:', error.message);
  } catch (err) {
    console.error('[MazeRace] Supabase games status update threw:', err);
  }
}

module.exports = { getSupabaseAdmin, updateMazeRaceGameStatus };
