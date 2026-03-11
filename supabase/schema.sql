-- ─── Profiles table ──────────────────────────────────────────────────────────
create table if not exists profiles (
  id           uuid references auth.users on delete cascade primary key,
  email        text        not null,
  name         text,
  age          integer,
  bio          text,
  location     text,
  gender       text,
  interested_in text,
  birthday     text,
  character    text,
  element      text,
  affiliation  text,
  game_types   text[]      default '{}',
  favorite_games text[]    default '{}',
  looking_for  text[]      default '{}',
  kids         text,
  drinking     text,
  smoking      text,
  cannabis     text,
  pets         text,
  exercise     text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ─── Photos table ─────────────────────────────────────────────────────────────
create table if not exists photos (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references profiles(id) on delete cascade not null,
  photo_url  text        not null,
  "order"    integer     default 0,
  created_at timestamptz default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table photos    enable row level security;

-- Profiles: any authenticated user can read all; only owner can write
create policy "Authenticated users can view profiles"
  on profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Photos: any authenticated user can read; only owner can write/delete
create policy "Authenticated users can view photos"
  on photos for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own photos"
  on photos for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own photos"
  on photos for update
  using (auth.uid() = user_id);

create policy "Users can delete their own photos"
  on photos for delete
  using (auth.uid() = user_id);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure update_updated_at();

-- ─── Storage bucket ───────────────────────────────────────────────────────────
-- Run these in the Supabase Dashboard → Storage → New Bucket:
--   Name: "photos"
--   Public: true
--
-- Then add these storage policies in Dashboard → Storage → photos → Policies:
--
-- insert into storage.buckets (id, name, public) values ('photos', 'photos', true);
--
-- create policy "Authenticated uploads"
--   on storage.objects for insert to authenticated
--   with check (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "Public reads"
--   on storage.objects for select
--   using (bucket_id = 'photos');
--
-- create policy "Owner deletes"
--   on storage.objects for delete to authenticated
--   using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
