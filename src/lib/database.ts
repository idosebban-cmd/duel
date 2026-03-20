import { supabase as _supabase } from './supabase';
// These functions are only called from auth-protected routes, so supabase is always initialized.
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const supabase = _supabase!;
import type { OnboardingState } from '../store/onboardingStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  age: number | null;
  bio: string | null;
  location: string | null;
  gender: string | null;
  interested_in: string | null;
  birthday: string | null;
  character: string | null;
  element: string | null;
  affiliation: string | null;
  game_types: string[];
  favorite_games: string[];
  looking_for: string[];
  kids: string | null;
  drinking: string | null;
  smoking: string | null;
  cannabis: string | null;
  pets: string | null;
  exercise: string | null;
  intent: string | null;
  preferred_age_min: number | null;
  preferred_age_max: number | null;
  preferred_distance: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function upsertProfile(
  userId: string,
  data: Partial<OnboardingState> & { email: string },
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('profiles').upsert(
      {
        id:             userId,
        email:          data.email,
        name:           data.name      || null,
        age:            data.age       ?? null,
        location:       data.location  || null,
        gender:         data.gender    || null,
        interested_in:  data.interestedIn || null,
        birthday:       data.birthday  || null,
        character:      data.character || null,
        element:        data.element   || null,
        affiliation:    data.affiliation || null,
        game_types:     data.gameTypes     ?? [],
        favorite_games: data.favoriteGames ?? [],
        looking_for:    data.lookingFor    ?? [],
        kids:           data.kids      || null,
        drinking:       data.drinking  || null,
        smoking:        data.smoking   || null,
        cannabis:       data.cannabis  || null,
        pets:           data.pets      || null,
        bio:            data.bio       || null,
        exercise:       data.exercise  || null,
        intent:         data.intent    || 'romance',
        preferred_age_min:  data.preferredAgeMin  ?? 18,
        preferred_age_max:  data.preferredAgeMax  ?? 65,
        preferred_distance: data.preferredDistance ?? null,
      },
      { onConflict: 'id' },
    );
    return { error: error as Error | null };
  } catch (err) {
    return { error: err as Error };
  }
}

/** Update a single profile field (e.g. intent). */
export async function updateProfileField(
  userId: string,
  field: string,
  value: unknown,
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: value })
      .eq('id', userId);
    return { error: error as Error | null };
  } catch (err) {
    return { error: err as Error };
  }
}

export async function getProfile(userId: string): Promise<{ data: UserProfile | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return { data: data as UserProfile | null, error: error as Error | null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function getDiscoverProfiles(userId: string): Promise<UserProfile[]> {
  try {
    const { data: swiped } = await supabase
      .from('swipes')
      .select('to_user')
      .eq('from_user', userId);

    const swipedIds = new Set<string>(swiped?.map((s: { to_user: string }) => s.to_user) ?? []);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    return ((data as UserProfile[]) ?? []).filter((p) => !swipedIds.has(p.id));
  } catch {
    return [];
  }
}

// ─── Enhanced Discovery (with filters) ───────────────────────────────────────

export interface DiscoveryFilters {
  minAge?: number;
  maxAge?: number;
  gender?: string;
  maxDistance?: number;
  /** Current user's intent — drives "Just Play" matching behaviour. */
  callerIntent?: 'romance' | 'play' | 'both';
}

export async function getDiscoveryUsers(
  currentUserId: string,
  filters: DiscoveryFilters = {},
): Promise<UserProfile[]> {
  try {
    // Get users already swiped on
    const { data: swiped } = await supabase
      .from('swipes')
      .select('to_user')
      .eq('from_user', currentUserId);

    const swipedIds = new Set<string>(
      swiped?.map((s: { to_user: string }) => s.to_user) ?? [],
    );

    const callerIntent = filters.callerIntent ?? 'romance';
    const isPlayOnly = callerIntent === 'play';

    // Build query — only complete profiles (must have name, age, character)
    let query = supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId)
      .not('name', 'is', null)
      .not('age', 'is', null)
      .not('character', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    // ── Intent-based filtering ─────────────────────────────────────────────
    // "play"    → show only 'play' or 'both' users (no age/gender/distance)
    // "romance" → show only 'romance' or 'both' users (apply normal filters)
    // "both"    → show everyone (apply normal filters)
    if (isPlayOnly) {
      query = query.in('intent', ['play', 'both']);
      // No age/gender/distance filters for play-only mode
    } else if (callerIntent === 'romance') {
      query = query.in('intent', ['romance', 'both']);
      if (filters.minAge) query = query.gte('age', filters.minAge);
      if (filters.maxAge) query = query.lte('age', filters.maxAge);
      if (filters.gender) query = query.eq('gender', filters.gender);
    } else {
      // "both" — see everyone, still respect personal filters
      if (filters.minAge) query = query.gte('age', filters.minAge);
      if (filters.maxAge) query = query.lte('age', filters.maxAge);
      if (filters.gender) query = query.eq('gender', filters.gender);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Client-side filtering: exclude already-swiped
    return ((data as UserProfile[]) ?? []).filter((p) => !swipedIds.has(p.id));
  } catch {
    return [];
  }
}

// ─── Location ────────────────────────────────────────────────────────────────

export async function updateUserLocation(
  userId: string,
  latitude: number,
  longitude: number,
): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({ latitude, longitude })
      .eq('id', userId);
  } catch {
    // Non-critical — location is best-effort
  }
}

// ─── Distance calculation (Haversine) ────────────────────────────────────────

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Swipes + Matching ────────────────────────────────────────────────────────

export async function recordSwipe(
  userId: string,
  targetId: string,
  action: 'like' | 'pass',
): Promise<{ matched: boolean; matchId?: string }> {
  if (action === 'pass') {
    // Fire-and-forget for passes
    supabase
      .from('swipes')
      .upsert({ from_user: userId, to_user: targetId, direction: action }, { onConflict: 'from_user,to_user' })
      .then(() => {});
    return { matched: false };
  }

  // Bot profiles never swipe back, so simulate a 25% match rate
  const BOT_PREFIX = 'a0000000-0000-0000-0000-00000000';
  const isBot = targetId.startsWith(BOT_PREFIX);
  if (isBot) console.log('[recordSwipe] Bot detected:', targetId);

  // Attempt to record the swipe (non-blocking for bots)
  let swipeResult = false;
  try {
    const { error } = await supabase
      .from('swipes')
      .upsert({ from_user: userId, to_user: targetId, direction: action }, { onConflict: 'from_user,to_user' });
    if (error) {
      console.error('[recordSwipe] Swipe record failed:', error.message);
    }
    swipeResult = !error;
  } catch (err) {
    console.error('[recordSwipe] Swipe record threw:', err);
    swipeResult = false;
  }

  if (!isBot) {
    // Real user: need successful swipe record + mutual like check
    if (!swipeResult) return { matched: false };

    try {
      const { data: mutual } = await supabase
        .from('swipes')
        .select('id')
        .eq('from_user', targetId)
        .eq('to_user', userId)
        .eq('direction', 'like')
        .maybeSingle();

      if (!mutual) return { matched: false };
    } catch {
      return { matched: false };
    }
  } else {
    // Bot: 25% random match chance — independent of DB success
    const roll = Math.random();
    console.log('[recordSwipe] Roll result:', roll, '— match?', roll < 0.25);
    if (roll >= 0.25) return { matched: false };
  }

  // Persist the match to the database — check-then-insert (upsert requires
  // an UPDATE RLS policy which we intentionally omit; match rows are immutable).
  const [user1Id, user2Id] = userId < targetId ? [userId, targetId] : [targetId, userId];
  console.log('[recordSwipe] Checking for existing match:', user1Id, user2Id);

  try {
    // Check if match already exists
    const { data: existing } = await supabase
      .from('matches')
      .select('id')
      .eq('user_a', user1Id)
      .eq('user_b', user2Id)
      .maybeSingle();

    console.log('[recordSwipe] Existing match found:', existing);

    if (existing) {
      return { matched: true, matchId: (existing as { id: string }).id };
    }

    // Insert new match (retry once on failure)
    console.log('[recordSwipe] Attempting match insert...');
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data: match, error } = await supabase
        .from('matches')
        .insert({ user_a: user1Id, user_b: user2Id, status: 'active' })
        .select('id')
        .maybeSingle();

      console.log('[recordSwipe] Insert result — match:', match, 'error:', error);
      if (error) {
        console.error(`[recordSwipe] Match insert attempt ${attempt + 1} failed:`, error.message);
        if (attempt === 0) continue;
        return { matched: false };
      }

      return { matched: true, matchId: (match as { id: string } | null)?.id };
    }
  } catch (err) {
    console.error('[recordSwipe] Match creation threw:', err);
  }

  return { matched: false };
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export interface MatchWithProfile {
  matchId: string;
  matchedAt: string;
  partner: UserProfile;
}

export async function getMatches(userId: string): Promise<MatchWithProfile[]> {
  try {
    const { data: rows } = await supabase
      .from('matches')
      .select('id, user_a, user_b, matched_at')
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order('matched_at', { ascending: false });

    if (!rows?.length) return [];

    type MatchRow = { id: string; user_a: string; user_b: string; matched_at: string };
    const matchRows = rows as MatchRow[];

    const partnerIds = matchRows.map((m) => (m.user_a === userId ? m.user_b : m.user_a));

    const { data: partners } = await supabase
      .from('profiles')
      .select('*')
      .in('id', partnerIds);

    const byId = new Map<string, UserProfile>(
      ((partners as UserProfile[]) ?? []).map((p) => [p.id, p]),
    );

    return matchRows
      .map((m) => {
        const partnerId = m.user_a === userId ? m.user_b : m.user_a;
        const partner = byId.get(partnerId);
        if (!partner) return null;
        return { matchId: m.id, matchedAt: m.matched_at, partner };
      })
      .filter((x): x is MatchWithProfile => x !== null);
  } catch {
    return [];
  }
}

// ─── Messages ─────────────────────────────────────────────────────────────────
//
// Required Supabase setup (run once in SQL editor):
//
//   CREATE TABLE messages (
//     id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//     match_id   UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
//     sender_id  UUID NOT NULL REFERENCES auth.users(id),
//     content    TEXT NOT NULL,
//     created_at TIMESTAMPTZ DEFAULT now(),
//     read       BOOLEAN DEFAULT false
//   );
//   ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "match members can access messages"
//     ON messages FOR ALL
//     USING (match_id IN (
//       SELECT id FROM matches WHERE user_a = auth.uid() OR user_b = auth.uid()
//     ));
//   ALTER PUBLICATION supabase_realtime ADD TABLE messages;

export interface DbMessage {
  id: string;
  room_id: string;
  sender: string;
  content: string;
  created_at: string;
  delivered: boolean;
}

export async function getMessages(matchId: string): Promise<DbMessage[]> {
  try {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', matchId)
      .order('created_at', { ascending: true });
    return (data as DbMessage[]) ?? [];
  } catch {
    return [];
  }
}

export async function sendMessage(
  matchId: string,
  senderId: string,
  content: string,
): Promise<DbMessage | null> {
  try {
    const { data } = await supabase
      .from('messages')
      .insert({ room_id: matchId, sender: senderId, content, delivered: false })
      .select()
      .maybeSingle();
    return data as DbMessage | null;
  } catch {
    return null;
  }
}

export async function markMessagesRead(matchId: string, userId: string): Promise<void> {
  try {
    await supabase
      .from('messages')
      .update({ delivered: true })
      .eq('room_id', matchId)
      .neq('sender', userId)
      .eq('delivered', false);
  } catch {
    // Non-critical — delivery status can be stale
  }
}

export interface LastMessageInfo {
  matchId: string;
  content: string;
  senderId: string;
  createdAt: string;
  read: boolean;
  unread: number;
}

export async function getLastMessages(
  matchIds: string[],
  myUserId: string,
): Promise<Map<string, LastMessageInfo>> {
  if (!matchIds.length) return new Map();

  try {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .in('room_id', matchIds)
      .order('created_at', { ascending: false });

    const result = new Map<string, LastMessageInfo>();
    const unreadCounts = new Map<string, number>();

    for (const msg of (data as DbMessage[]) ?? []) {
      if (!result.has(msg.room_id)) {
        result.set(msg.room_id, {
          matchId: msg.room_id,
          content: msg.content,
          senderId: msg.sender,
          createdAt: msg.created_at,
          read: msg.delivered,
          unread: 0,
        });
      }
      if (msg.sender !== myUserId && !msg.delivered) {
        unreadCounts.set(msg.room_id, (unreadCounts.get(msg.room_id) ?? 0) + 1);
      }
    }

    for (const [matchId, count] of unreadCounts) {
      const entry = result.get(matchId);
      if (entry) entry.unread = count;
    }

    return result;
  } catch {
    return new Map();
  }
}

// ─── Games ────────────────────────────────────────────────────────────────────

export interface GameRow {
  id: string;
  match_id: string;
  game_type: string;
  player1_id: string;
  player2_id: string;
  state: Record<string, unknown>;
  current_turn: string;
  winner: string | null;
  created_at: string;
  updated_at: string;
}

/** Returns the match row so games can derive opponentId. */
export async function getMatchById(matchId: string): Promise<{ user_a: string; user_b: string } | null> {
  console.log('[getMatchById] querying matchId:', matchId);
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('user_a, user_b')
      .eq('id', matchId)
      .maybeSingle();
    console.log('[getMatchById] response — data:', data, 'error:', error);
    return data as { user_a: string; user_b: string } | null;
  } catch (err) {
    console.error('[getMatchById] caught exception:', err);
    return null;
  }
}

/**
 * Creates a game for this match+gameType if none exists, otherwise returns the
 * active (no winner) game. player1_id is the alphabetically-smaller userId so
 * both clients agree on who is player1 without a race.
 */
export async function createOrJoinGame(
  matchId: string,
  gameType: string,
  myUserId: string,
  opponentId: string,
  initialState: object,
): Promise<GameRow | null> {
  try {
    // Deterministic ordering: smaller UUID = player1
    const [p1, p2] = myUserId < opponentId ? [myUserId, opponentId] : [opponentId, myUserId];

    // INSERT with ON CONFLICT (match_id, game_type) WHERE winner IS NULL → DO NOTHING
    // This is safe against two clients racing: one wins the insert, the other no-ops.
    await supabase
      .from('games')
      .insert({
        match_id: matchId,
        game_type: gameType,
        player1_id: p1,
        player2_id: p2,
        state: initialState,
        current_turn: p1,
      })
      .select()
      .maybeSingle();

    // Always SELECT the canonical row (handles both insert-winner and conflict-loser)
    const { data: row } = await supabase
      .from('games')
      .select('*')
      .eq('match_id', matchId)
      .eq('game_type', gameType)
      .is('winner', null)
      .maybeSingle();

    return (row as GameRow) ?? null;
  } catch (err) {
    console.error('[createOrJoinGame]', err);
    return null;
  }
}

/**
 * Returns true if at least one game for this match has been completed (winner set).
 * Falls back to the localStorage flag for bot/fake matches.
 */
export async function hasCompletedGame(matchId: string): Promise<boolean> {
  if (localStorage.getItem(`first_game_played_${matchId}`)) return true;
  try {
    const { count } = await supabase
      .from('games')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', matchId)
      .not('winner', 'is', null);
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

/** Returns all games for a match, newest first. Filters out null match_id rows. */
export async function getGamesByMatch(matchId: string): Promise<GameRow[]> {
  try {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false });
    return (data ?? []) as GameRow[];
  } catch {
    return [];
  }
}

export async function getGame(gameId: string): Promise<GameRow | null> {
  try {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .maybeSingle();
    return data as GameRow | null;
  } catch {
    return null;
  }
}

/** Returns the most recent completed game for a match (winner IS NOT NULL). */
export async function getGameByMatchId(matchId: string): Promise<GameRow | null> {
  try {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('match_id', matchId)
      .not('winner', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data as GameRow | null;
  } catch {
    return null;
  }
}

/** Toggle a player's ready flag inside games.state.ready (via atomic RPC). */
export async function updateGameReady(gameId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('set_player_ready', {
      p_game_id: gameId,
      p_user_id: userId,
    });
    if (error) console.error('[updateGameReady]', error.message);
  } catch (err) {
    console.error('[updateGameReady] threw:', err);
  }
}

// ─── Game Secrets ─────────────────────────────────────────────────────────────

/** Insert a player's secret character. ON CONFLICT DO NOTHING for lobby re-joins. Returns false on failure. */
export async function insertGameSecret(
  gameId: string,
  playerId: string,
  characterId: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('game_secrets')
      .upsert(
        { game_id: gameId, player_id: playerId, character_id: characterId },
        { onConflict: 'game_id,player_id', ignoreDuplicates: true },
      );
    if (error) { console.error('[insertGameSecret]', error.message); return false; }
    return true;
  } catch (err) {
    console.error('[insertGameSecret]', err);
    return false;
  }
}

/** Returns the current user's secret character ID for a game. */
export async function getMySecret(gameId: string): Promise<string | null> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id ?? '';
    const { data, error } = await supabase
      .from('game_secrets')
      .select('character_id')
      .eq('game_id', gameId)
      .eq('player_id', userId)
      .maybeSingle();
    if (error) { console.error('[getMySecret]', error.message); return null; }
    return (data as { character_id: string } | null)?.character_id ?? null;
  } catch (err) {
    console.error('[getMySecret]', err);
    return null;
  }
}

/** RPC: check a guess against opponent's secret.
 *  The RPC handles everything atomically: move insert + game finalization.
 *  Returns { correct, winner } on success, or null on error. */
export async function checkGuess(
  gameId: string,
  guessedCharacter: string,
): Promise<{ correct: boolean; winner: string } | null> {
  try {
    const { data, error } = await supabase.rpc('check_guess', {
      p_game_id: gameId,
      p_guessed_character: guessedCharacter,
    });
    if (error) {
      console.error('[checkGuess]', error.message);
      return null;
    }
    return data as { correct: boolean; winner: string };
  } catch (err) {
    console.error('[checkGuess] threw:', err);
    return null;
  }
}

/** RPC: reveal both players' secrets (only works after game has a winner). */
export async function revealSecrets(
  gameId: string,
): Promise<{ p1_character_id: string; p2_character_id: string } | null> {
  try {
    const { data, error } = await supabase.rpc('reveal_secrets', {
      p_game_id: gameId,
    });
    if (error) {
      console.error('[revealSecrets]', error.message);
      return null;
    }
    return data as { p1_character_id: string; p2_character_id: string } | null;
  } catch (err) {
    console.error('[revealSecrets] threw:', err);
    return null;
  }
}

/** Delete a game row (used when cancelling from the lobby). */
export async function deleteGame(gameId: string): Promise<void> {
  try {
    await supabase.from('games').delete().eq('id', gameId);
  } catch (err) {
    console.error('[deleteGame]', err);
  }
}

/**
 * Atomically records a move + updates game state + advances the turn (via RPC).
 * Pass winner = 'player1' | 'player2' | 'draw' to end the game.
 */
export async function submitGameMove(
  gameId: string,
  playerId: string,
  moveData: object,
  newState: object,
  nextTurn: string,
  winner?: string | null,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('submit_move', {
      p_game_id: gameId,
      p_player_id: playerId,
      p_move: moveData,
      p_new_state: newState,
      p_next_turn: nextTurn,
      p_winner: winner ?? null,
    });
    if (error) console.error('[submitGameMove]', error.message);
  } catch (err) {
    console.error('[submitGameMove] threw:', err);
  }
}

// ─── Challenges ──────────────────────────────────────────────────────────────

export interface ChallengeRow {
  id: string;
  match_id: string;
  from_user: string;
  to_user: string;
  game_type: string;
  status: string;
  expires_at: string | null;
  created_at: string;
  resolved_at: string | null;
}

/**
 * Creates a challenge. If the opponent already has a pending challenge for the
 * same game_type in the same match, both are set to 'accepted' and the
 * opponent's challenge is returned (so the caller knows it was a mutual match).
 */
export async function createChallenge(
  matchId: string,
  fromUser: string,
  toUser: string,
  gameType: string,
): Promise<{ mutual: boolean; challenge: ChallengeRow }> {
  // Check for existing pending challenge from opponent for same game
  try {
    const { data: existing } = await supabase
      .from('challenges')
      .select('*')
      .eq('match_id', matchId)
      .eq('from_user', toUser)
      .eq('to_user', fromUser)
      .eq('game_type', gameType)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      // Mutual match — mark opponent's challenge as accepted
      await supabase
        .from('challenges')
        .update({ status: 'accepted', resolved_at: new Date().toISOString() })
        .eq('id', existing.id);

      return { mutual: true, challenge: existing as ChallengeRow };
    }
  } catch (err) {
    console.error('[createChallenge] check existing:', err);
  }

  // No mutual match — insert new challenge
  const isDotDash = gameType === 'dot-dash' || gameType === 'dot_dash';
  const expiresAt = new Date(Date.now() + (isDotDash ? 10 * 60_000 : 24 * 60 * 60_000)).toISOString();

  try {
    const { data } = await supabase
      .from('challenges')
      .insert({
        match_id: matchId,
        from_user: fromUser,
        to_user: toUser,
        game_type: gameType,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('*')
      .single();

    return { mutual: false, challenge: data as ChallengeRow };
  } catch (err) {
    console.error('[createChallenge] insert:', err);
    throw err;
  }
}

export async function getChallengesForMatch(matchId: string): Promise<ChallengeRow[]> {
  try {
    const now = new Date().toISOString();
    const cutoff = new Date(Date.now() - 60_000).toISOString();
    const { data } = await supabase
      .from('challenges')
      .select('*')
      .eq('match_id', matchId)
      .gt('expires_at', now)
      .or(`status.eq.pending,resolved_at.gt.${cutoff}`)
      .order('created_at', { ascending: false });
    return (data ?? []) as ChallengeRow[];
  } catch {
    return [];
  }
}

export async function acceptChallenge(challengeId: string): Promise<void> {
  console.log('[acceptChallenge] Updating challenge ID:', challengeId);
  try {
    const { data, error, status, statusText } = await supabase
      .from('challenges')
      .update({ status: 'accepted', resolved_at: new Date().toISOString() })
      .eq('id', challengeId)
      .select();
    console.log('[acceptChallenge] Supabase response — data:', data, 'error:', error, 'status:', status, statusText);
    console.log('[acceptChallenge] Update succeeded:', !error);
  } catch (err) {
    console.error('[acceptChallenge] Exception thrown:', err);
  }
}

export async function declineChallenge(challengeId: string): Promise<void> {
  try {
    await supabase
      .from('challenges')
      .update({ status: 'declined', resolved_at: new Date().toISOString() })
      .eq('id', challengeId);
  } catch (err) {
    console.error('[declineChallenge]', err);
  }
}

// ─── Photos ───────────────────────────────────────────────────────────────────

async function uploadPhotoToStorage(
  userId: string,
  base64DataUrl: string,
  index: number,
): Promise<string | null> {
  let blob: Blob;
  try {
    const res = await fetch(base64DataUrl);
    blob = await res.blob();
  } catch {
    return null;
  }

  const ext = blob.type.split('/')[1] || 'jpg';
  const path = `${userId}/${Date.now()}_${index}.${ext}`;

  const { error } = await supabase.storage
    .from('photos')
    .upload(path, blob, { upsert: true, contentType: blob.type });

  if (error) return null;

  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function savePhotos(userId: string, photos: string[]): Promise<void> {
  try {
    await supabase.from('photos').delete().eq('user_id', userId);

    const rows: { user_id: string; photo_url: string; order: number }[] = [];

    for (let i = 0; i < photos.length; i++) {
      const src = photos[i];
      if (!src) continue;

      let url: string;
      if (src.startsWith('data:')) {
        const uploaded = await uploadPhotoToStorage(userId, src, i);
        if (!uploaded) continue;
        url = uploaded;
      } else {
        url = src;
      }

      rows.push({ user_id: userId, photo_url: url, order: i });
    }

    if (rows.length > 0) {
      await supabase.from('photos').insert(rows);
    }
  } catch {
    // Photos are best-effort; profile save continues
  }
}

export async function getPhotos(userId: string): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('photos')
      .select('photo_url')
      .eq('user_id', userId)
      .order('"order"');
    return data?.map((p: { photo_url: string }) => p.photo_url) ?? [];
  } catch {
    return [];
  }
}
