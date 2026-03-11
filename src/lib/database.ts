import { supabase } from './supabase';
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
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data as UserProfile[]) ?? [];
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
