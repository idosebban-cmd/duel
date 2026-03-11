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
  created_at: string;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function upsertProfile(
  userId: string,
  data: Partial<OnboardingState> & { email: string },
): Promise<{ error: Error | null }> {
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
}

export async function getProfile(userId: string): Promise<{ data: UserProfile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return { data: data as UserProfile | null, error: error as Error | null };
}

export async function getDiscoverProfiles(userId: string): Promise<UserProfile[]> {
  // Fetch IDs the user has already swiped so we can exclude them
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
}

// ─── Swipes + Matching ────────────────────────────────────────────────────────

export async function recordSwipe(
  userId: string,
  targetId: string,
  action: 'like' | 'pass',
): Promise<{ matched: boolean; matchId?: string }> {
  // Upsert the swipe (idempotent on retry)
  const { error } = await supabase
    .from('swipes')
    .upsert({ user_id: userId, target_id: targetId, action }, { onConflict: 'user_id,target_id' });

  if (error || action === 'pass') return { matched: false };

  // Check whether target has already liked the user back
  const { data: mutual } = await supabase
    .from('swipes')
    .select('id')
    .eq('user_id', targetId)
    .eq('target_id', userId)
    .eq('action', 'like')
    .maybeSingle();

  if (!mutual) return { matched: false };

  // Create the match — enforce user1_id < user2_id for uniqueness
  const [user1Id, user2Id] = userId < targetId ? [userId, targetId] : [targetId, userId];

  const { data: match } = await supabase
    .from('matches')
    .upsert({ user1_id: user1Id, user2_id: user2Id }, { onConflict: 'user1_id,user2_id' })
    .select('id')
    .maybeSingle();

  return { matched: true, matchId: (match as { id: string } | null)?.id };
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export interface MatchWithProfile {
  matchId: string;
  matchedAt: string;
  partner: UserProfile;
}

export async function getMatches(userId: string): Promise<MatchWithProfile[]> {
  const { data: rows } = await supabase
    .from('matches')
    .select('id, user1_id, user2_id, matched_at')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('matched_at', { ascending: false });

  if (!rows?.length) return [];

  const partnerIds = (rows as { id: string; user1_id: string; user2_id: string; matched_at: string }[])
    .map((m) => (m.user1_id === userId ? m.user2_id : m.user1_id));

  const { data: partners } = await supabase
    .from('profiles')
    .select('*')
    .in('id', partnerIds);

  const byId = new Map<string, UserProfile>(
    ((partners as UserProfile[]) ?? []).map((p) => [p.id, p]),
  );

  return (rows as { id: string; user1_id: string; user2_id: string; matched_at: string }[])
    .map((m) => {
      const partnerId = m.user1_id === userId ? m.user2_id : m.user1_id;
      const partner = byId.get(partnerId);
      if (!partner) return null;
      return { matchId: m.id, matchedAt: m.matched_at, partner };
    })
    .filter((x): x is MatchWithProfile => x !== null);
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
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

export async function getMessages(matchId: string): Promise<DbMessage[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });
  return (data as DbMessage[]) ?? [];
}

export async function sendMessage(
  matchId: string,
  senderId: string,
  content: string,
): Promise<DbMessage | null> {
  const { data } = await supabase
    .from('messages')
    .insert({ match_id: matchId, sender_id: senderId, content, read: false })
    .select()
    .maybeSingle();
  return data as DbMessage | null;
}

export async function markMessagesRead(matchId: string, userId: string): Promise<void> {
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('match_id', matchId)
    .neq('sender_id', userId)
    .eq('read', false);
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
  // Remove old photos from DB (storage files stay; OK for now)
  await supabase.from('photos').delete().eq('user_id', userId);

  const rows: { user_id: string; photo_url: string; order: number }[] = [];

  for (let i = 0; i < photos.length; i++) {
    const src = photos[i];
    if (!src) continue;

    let url: string;
    if (src.startsWith('data:')) {
      // base64 — upload to Supabase Storage
      const uploaded = await uploadPhotoToStorage(userId, src, i);
      if (!uploaded) continue;
      url = uploaded;
    } else {
      // Already a URL (re-saving an existing profile)
      url = src;
    }

    rows.push({ user_id: userId, photo_url: url, order: i });
  }

  if (rows.length > 0) {
    await supabase.from('photos').insert(rows);
  }
}

export async function getPhotos(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('photos')
    .select('photo_url')
    .eq('user_id', userId)
    .order('"order"');
  return data?.map((p: { photo_url: string }) => p.photo_url) ?? [];
}
