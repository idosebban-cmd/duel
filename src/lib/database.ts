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
  /** ISO timestamp; client-updated when app is active (throttled). Omitted until DB column exists. */
  last_seen?: string | null;
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
        latitude:       data.latitude  ?? null,
        longitude:      data.longitude ?? null,
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
  /** Caller coordinates — required together with maxDistance for RPC distance filtering. */
  callerLat?: number | null;
  callerLng?: number | null;
  /** Current user's intent — drives "Just Play" matching behaviour. */
  callerIntent?: 'romance' | 'play' | 'both';
}

/** Map caller discover intent to RPC intent_filter ('play' | 'romance' | 'all'). */
function intentFilterForRpc(callerIntent: 'romance' | 'play' | 'both'): string {
  if (callerIntent === 'play') return 'play';
  if (callerIntent === 'romance') return 'romance';
  return 'all';
}

export async function getDiscoveryUsers(
  currentUserId: string,
  filters: DiscoveryFilters = {},
): Promise<UserProfile[]> {
  try {
    const { data: swiped } = await supabase
      .from('swipes')
      .select('to_user')
      .eq('from_user', currentUserId);

    const swipedIds = new Set<string>(
      swiped?.map((s: { to_user: string }) => s.to_user) ?? [],
    );

    const callerIntent = filters.callerIntent ?? 'romance';
    const isPlayOnly = callerIntent === 'play';

    const useDistanceRpc =
      !isPlayOnly &&
      filters.maxDistance != null &&
      filters.maxDistance > 0 &&
      filters.callerLat != null &&
      filters.callerLng != null &&
      !Number.isNaN(filters.callerLat) &&
      !Number.isNaN(filters.callerLng);

    if (useDistanceRpc) {
      try {
        const { data, error } = await supabase.rpc('get_discovery_profiles', {
          caller_id: currentUserId,
          caller_lat: filters.callerLat,
          caller_lng: filters.callerLng,
          max_distance_km: filters.maxDistance,
          intent_filter: intentFilterForRpc(callerIntent),
          min_age: filters.minAge ?? 18,
          max_age: filters.maxAge ?? 99,
          gender_filter: filters.gender ?? null,
        });
        if (error) throw error;
        return ((data as UserProfile[]) ?? []).filter((p) => !swipedIds.has(p.id));
      } catch {
        // RPC missing or failed — fall back to table query (deploy get_discovery_profiles on Supabase for distance SQL).
      }
    }

    let query = supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId)
      .not('name', 'is', null)
      .not('age', 'is', null)
      .not('character', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (isPlayOnly) {
      query = query.in('intent', ['play', 'both']);
    } else if (callerIntent === 'romance') {
      query = query.in('intent', ['romance', 'both']);
      if (filters.minAge) query = query.gte('age', filters.minAge);
      if (filters.maxAge) query = query.lte('age', filters.maxAge);
      if (filters.gender) query = query.eq('gender', filters.gender);
    } else {
      if (filters.minAge) query = query.gte('age', filters.minAge);
      if (filters.maxAge) query = query.lte('age', filters.maxAge);
      if (filters.gender) query = query.eq('gender', filters.gender);
    }

    const { data, error } = await query;
    if (error) throw error;

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
  let swipeRecorded = false;
  try {
    const { error } = await supabase
      .from('swipes')
      .upsert({ from_user: userId, to_user: targetId, direction: action }, { onConflict: 'from_user,to_user' });
    if (error) {
      console.error('[recordSwipe] Swipe record failed:', error.message);
      throw error;
    }
    swipeRecorded = true;
  } catch (err) {
    console.error('[recordSwipe] Swipe record threw:', err);
    throw err;
  }

  if (action === 'pass') {
    if (!swipeRecorded) throw new Error('Failed to record swipe');
    return { matched: false };
  }

  if (!swipeRecorded) throw new Error('Failed to record swipe');

  const { data: mutual } = await supabase
    .from('swipes')
    .select('id')
    .eq('from_user', targetId)
    .eq('to_user', userId)
    .eq('direction', 'like')
    .maybeSingle();

  if (!mutual) return { matched: false };

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
        throw error;
      }

      return { matched: true, matchId: (match as { id: string } | null)?.id };
    }
  } catch (err) {
    console.error('[recordSwipe] Match creation threw:', err);
    throw err;
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

export async function markMessagesRead(matchId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('mark_messages_read', {
      p_room_id: matchId,
    });
    if (error) throw error;
  } catch (err) {
    // Non-critical — delivery status can be stale.
    // Still log so production 404s/misnamed RPCs are observable.
    console.warn('[markMessagesRead] rpc failed:', err);
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

/** Single highest-priority card action: challenge → your turn → unread. */
export type MatchPendingActivity =
  | { kind: 'challenge' }
  | { kind: 'your_turn' }
  | { kind: 'unread'; count: number };

/**
 * Batch-fetch pending challenge (incoming), active game (my turn), and merge unread counts
 * from getLastMessages. Priority: challenge > your_turn > unread.
 */
export async function getMatchPendingActivity(
  rows: MatchWithProfile[],
  myUserId: string,
  lastMessages: Map<string, LastMessageInfo>,
): Promise<Map<string, MatchPendingActivity | null>> {
  const out = new Map<string, MatchPendingActivity | null>();
  if (!rows.length) return out;

  const matchIds = rows.map((r) => r.matchId);
  const partnerByMatch = new Map(rows.map((r) => [r.matchId, r.partner.id]));
  for (const id of matchIds) out.set(id, null);

  const now = Date.now();

  try {
    const { data: challRows } = await supabase
      .from('challenges')
      .select('match_id, from_user, to_user, status, expires_at')
      .in('match_id', matchIds)
      .eq('to_user', myUserId)
      .eq('status', 'pending');

    const incomingChallenge = new Set<string>();
    for (const c of (challRows ?? []) as {
      match_id: string;
      from_user: string;
      expires_at: string | null;
    }[]) {
      if (c.expires_at && new Date(c.expires_at).getTime() <= now) continue;
      const partnerId = partnerByMatch.get(c.match_id);
      if (partnerId && c.from_user === partnerId) incomingChallenge.add(c.match_id);
    }

    const { data: gameRows } = await supabase
      .from('games')
      .select('match_id, updated_at')
      .in('match_id', matchIds)
      .eq('status', 'playing')
      .eq('current_turn', myUserId)
      .order('updated_at', { ascending: false });

    const myTurnMatch = new Set<string>();
    for (const g of (gameRows ?? []) as { match_id: string }[]) {
      if (!myTurnMatch.has(g.match_id)) myTurnMatch.add(g.match_id);
    }

    for (const mid of matchIds) {
      if (incomingChallenge.has(mid)) {
        out.set(mid, { kind: 'challenge' });
        continue;
      }
      if (myTurnMatch.has(mid)) {
        out.set(mid, { kind: 'your_turn' });
        continue;
      }
      const unread = lastMessages.get(mid)?.unread ?? 0;
      if (unread > 0) out.set(mid, { kind: 'unread', count: unread });
    }
  } catch {
    // leave all null
  }

  return out;
}

// ─── Games ────────────────────────────────────────────────────────────────────

export interface GameRow {
  id: string;
  match_id: string;
  game_type: string;
  player1_id: string;
  player2_id: string;
  owner: string;
  state: Record<string, unknown>;
  current_turn: string;
  status: string;
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
): Promise<GameRow | null> {
  const [p1, p2] = myUserId < opponentId ? [myUserId, opponentId] : [opponentId, myUserId];

  // SELECT for an existing ACTIVE game:
  // match_id + game_type + winner IS NULL + status NOT IN ('abandoned', 'finished')
  const selectExistingActiveGame = async (): Promise<GameRow | null> => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('match_id', matchId)
      .eq('game_type', gameType)
      .is('winner', null)
      .neq('status', 'abandoned')
      .neq('status', 'finished')
      .maybeSingle();
    return (data as GameRow) ?? null;
  };

  // Final SELECT after a uniqueness race:
  // return whatever row exists for winner IS NULL (no status filter),
  // because the DB conflict predicate is winner IS NULL.
  const selectWinnerNullGame = async (): Promise<GameRow | null> => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('match_id', matchId)
      .eq('game_type', gameType)
      .is('winner', null)
      .maybeSingle();
    return (data as GameRow) ?? null;
  };

  // 1) If found, return it
  const existing = await selectExistingActiveGame();
  if (existing) return existing;

  // 2) If not found, INSERT new game row
  const { data: inserted, error } = await supabase
    .from('games')
    .insert({
      match_id: matchId,
      game_type: gameType,
      player1_id: p1,
      player2_id: p2,
      owner: p1,
      state: { ready: {}, present: {} },
      current_turn: null,
      status: 'pending',
    })
    .select()
    .maybeSingle();

  if (!error && inserted) return inserted as GameRow;

  // 3) If INSERT fails with Postgres unique violation 23505 (race),
  // do a final SELECT and return whatever is already there.
  if (error?.code === '23505') {
    return await selectWinnerNullGame();
  }

  if (error) console.error('[createOrJoinGame] insert failed:', error.message);
  return null;
}

/** Initialize a newly created/joined game row via RPC. */
export async function initializeGame(gameId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('initialise_game', {
      p_game_id: gameId,
    });
    if (error) {
      console.error('[initializeGame]', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[initializeGame] threw:', err);
    return false;
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

// ─── Game Secrets ─────────────────────────────────────────────────────────────

/** Insert a player's secret character. ON CONFLICT DO NOTHING for duplicate setup attempts. Returns false on failure. */
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

/** Signal that a player has loaded the game screen (presence tracking). */
export async function setPlayerPresent(gameId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('set_player_present', {
      p_game_id: gameId,
      p_user_id: userId,
    });
    if (error) {
      console.error('[setPlayerPresent] RPC error', {
        gameId,
        userId,
        message: error.message,
        code: (error as unknown as { code?: string }).code,
        details: (error as unknown as { details?: string }).details,
        hint: (error as unknown as { hint?: string }).hint,
      });
    }
  } catch (err) {
    console.error('[setPlayerPresent] threw:', err);
  }
}

/** Atomically abandon a game (forfeit). Returns winner info or null on error. */
export async function abandonGame(gameId: string): Promise<{ abandoned_by: string; winner: string } | null> {
  try {
    const { data, error } = await supabase.rpc('abandon_game', {
      p_game_id: gameId,
    });
    if (error) {
      console.error('[abandonGame]', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[abandonGame] threw:', err);
    return null;
  }
}

/** Delete a game row while still pending (pre-start cancel path). */
export async function deleteGame(gameId: string): Promise<void> {
  try {
    await supabase.from('games').delete().eq('id', gameId).eq('status', 'pending');
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
    if (error) {
      console.error('[submitGameMove]', error.message);
      throw new Error(error.message);
    }
  } catch (err) {
    console.error('[submitGameMove] threw:', err);
    throw err;
  }
}

export async function updateWordBlitzPlayerSlice(
  gameId: string,
  gridLetters: (string | null)[][],
  score: number,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_word_blitz_player_slice', {
      p_game_id: gameId,
      p_grid: gridLetters,
      p_score: score,
    });
    if (error) {
      console.error('[updateWordBlitzPlayerSlice]', error.message);
      throw new Error(error.message);
    }
  } catch (err) {
    console.error('[updateWordBlitzPlayerSlice] threw:', err);
    throw err;
  }
}

export async function updateWordBlitzStartedAt(
  gameId: string,
  startedAt: string,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_word_blitz_started_at', {
      p_game_id: gameId,
      p_started_at: startedAt,
    });
    if (error) {
      console.error('[updateWordBlitzStartedAt]', error.message);
      throw new Error(error.message);
    }
  } catch (err) {
    console.error('[updateWordBlitzStartedAt] threw:', err);
    throw err;
  }
}

export async function finishWordBlitzGame(
  gameId: string,
  finalState: object,
  winner: 'player1' | 'player2' | 'draw',
): Promise<void> {
  try {
    const { error } = await supabase.rpc('finish_word_blitz_game', {
      p_game_id: gameId,
      p_state: finalState,
      p_winner: winner,
    });
    if (error) {
      console.error('[finishWordBlitzGame]', error.message);
      throw new Error(error.message);
    }
  } catch (err) {
    console.error('[finishWordBlitzGame] threw:', err);
    throw err;
  }
}

export async function deleteUserAccount(): Promise<void> {
  try {
    const { error } = await supabase.rpc('delete_user_account');
    if (error) {
      console.error('[deleteUserAccount]', error.message);
      throw new Error(error.message);
    }
  } catch (err) {
    console.error('[deleteUserAccount] threw:', err);
    throw err;
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
  const challengeExpiryMs = isDotDash ? 10 * 60_000 : 30 * 60_000;
  const expiresAt = new Date(Date.now() + challengeExpiryMs).toISOString();

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
  const { data, error } = await supabase
    .from('challenges')
    .update({ status: 'accepted', resolved_at: new Date().toISOString() })
    .eq('id', challengeId)
    .select('id');

  if (error) throw error;
  if (!Array.isArray(data) || data.length === 0) throw new Error('Challenge not found');
}

export async function declineChallenge(challengeId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .update({ status: 'declined', resolved_at: new Date().toISOString() })
      .eq('id', challengeId)
      .select('id');

    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) throw new Error('Challenge not found');
  } catch (err) {
    console.error('[declineChallenge] Failed to decline challenge:', err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/** Cancel an outgoing pending challenge (maps to status='declined'). */
export async function cancelChallenge(challengeId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .update({ status: 'declined', resolved_at: new Date().toISOString() })
      .eq('id', challengeId)
      .select('id');

    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) throw new Error('Challenge not found');
  } catch (err) {
    console.error('[cancelChallenge] Failed to cancel outgoing challenge:', err);
    throw err instanceof Error ? err : new Error(String(err));
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
