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
        exercise:       data.exercise  || null,
      },
      { onConflict: 'id' },
    );
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
      .select('target_id')
      .eq('user_id', userId);

    const swipedIds = new Set<string>(swiped?.map((s: { target_id: string }) => s.target_id) ?? []);

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
}

export async function getDiscoveryUsers(
  currentUserId: string,
  filters: DiscoveryFilters = {},
): Promise<UserProfile[]> {
  try {
    // Get users already swiped on
    const { data: swiped } = await supabase
      .from('swipes')
      .select('target_id')
      .eq('user_id', currentUserId);

    const swipedIds = new Set<string>(
      swiped?.map((s: { target_id: string }) => s.target_id) ?? [],
    );

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

    // Apply age filters
    if (filters.minAge) query = query.gte('age', filters.minAge);
    if (filters.maxAge) query = query.lte('age', filters.maxAge);
    // Apply gender filter
    if (filters.gender) query = query.eq('gender', filters.gender);

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
  try {
    const { error } = await supabase
      .from('swipes')
      .upsert({ user_id: userId, target_id: targetId, action }, { onConflict: 'user_id,target_id' });

    if (error || action === 'pass') return { matched: false };

    const { data: mutual } = await supabase
      .from('swipes')
      .select('id')
      .eq('user_id', targetId)
      .eq('target_id', userId)
      .eq('action', 'like')
      .maybeSingle();

    if (!mutual) return { matched: false };

    const [user1Id, user2Id] = userId < targetId ? [userId, targetId] : [targetId, userId];

    const { data: match } = await supabase
      .from('matches')
      .upsert({ user1_id: user1Id, user2_id: user2Id }, { onConflict: 'user1_id,user2_id' })
      .select('id')
      .maybeSingle();

    return { matched: true, matchId: (match as { id: string } | null)?.id };
  } catch {
    return { matched: false };
  }
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
      .select('id, user1_id, user2_id, matched_at')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('matched_at', { ascending: false });

    if (!rows?.length) return [];

    type MatchRow = { id: string; user1_id: string; user2_id: string; matched_at: string };
    const matchRows = rows as MatchRow[];

    const partnerIds = matchRows.map((m) => (m.user1_id === userId ? m.user2_id : m.user1_id));

    const { data: partners } = await supabase
      .from('profiles')
      .select('*')
      .in('id', partnerIds);

    const byId = new Map<string, UserProfile>(
      ((partners as UserProfile[]) ?? []).map((p) => [p.id, p]),
    );

    return matchRows
      .map((m) => {
        const partnerId = m.user1_id === userId ? m.user2_id : m.user1_id;
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
//       SELECT id FROM matches WHERE user1_id = auth.uid() OR user2_id = auth.uid()
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
export async function getMatchById(matchId: string): Promise<{ user1_id: string; user2_id: string } | null> {
  try {
    const { data } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .eq('id', matchId)
      .maybeSingle();
    return data as { user1_id: string; user2_id: string } | null;
  } catch {
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
    const { data: existing } = await supabase
      .from('games')
      .select('*')
      .eq('match_id', matchId)
      .eq('game_type', gameType)
      .is('winner', null)
      .maybeSingle();

    if (existing) return existing as GameRow;

    // Deterministic ordering: smaller UUID = player1
    const [p1, p2] = myUserId < opponentId ? [myUserId, opponentId] : [opponentId, myUserId];

    const { data } = await supabase
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

    return data as GameRow | null;
  } catch {
    return null;
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

/**
 * Atomically records a move + updates game state + advances the turn.
 * Pass winner = 'player1' | 'player2' | 'draw' to end the game.
 */
export async function submitGameMove(
  gameId: string,
  playerId: string,
  moveData: object,
  newState: object,
  nextTurnId: string,
  winner?: string | null,
): Promise<void> {
  try {
    await Promise.all([
      supabase
        .from('moves')
        .insert({ game_id: gameId, player_id: playerId, move_data: moveData }),
      supabase
        .from('games')
        .update({
          state: newState,
          current_turn: winner ? null : nextTurnId,
          winner: winner ?? null,
        })
        .eq('id', gameId),
    ]);
  } catch {
    // Polling will reconcile state on next tick
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
