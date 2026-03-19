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
  intent       text        default 'romance' check (intent in ('romance', 'play', 'both')),
  preferred_age_min  integer default 18,
  preferred_age_max  integer default 65,
  preferred_distance integer default null,
  latitude     decimal(10, 8),
  longitude    decimal(11, 8),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists profiles_location_idx on profiles (latitude, longitude);

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

create policy "Authenticated users can view profiles"
  on profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

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

-- ─── Swipes table ────────────────────────────────────────────────────────────
create table if not exists swipes (
  id         uuid        default gen_random_uuid() primary key,
  from_user  uuid        references profiles(id) on delete cascade not null,
  to_user    uuid        references profiles(id) on delete cascade not null,
  direction  text        check (direction in ('like', 'pass')) not null,
  created_at timestamptz default now(),
  unique(from_user, to_user)
);

alter table swipes enable row level security;

create policy "Users can view their own swipes"
  on swipes for select
  using (auth.uid() = from_user or auth.uid() = to_user);

create policy "Users can insert their own swipes"
  on swipes for insert
  with check (auth.uid() = from_user);

create policy "Users can update their own swipes"
  on swipes for update
  using (auth.uid() = from_user);

-- ─── Matches table ────────────────────────────────────────────────────────────
create table if not exists matches (
  id            uuid        default gen_random_uuid() primary key,
  user_a        uuid        references profiles(id) on delete cascade not null,
  user_b        uuid        references profiles(id) on delete cascade not null,
  status        text        default 'active',
  matched_at    timestamptz default now(),
  created_at    timestamptz default now(),
  unique(user_a, user_b)
);

alter table matches enable row level security;

create policy "Matched users can view their matches"
  on matches for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "Users can insert matches"
  on matches for insert
  with check (auth.uid() = user_a or auth.uid() = user_b);

-- ─── Messages table ──────────────────────────────────────────────────────────
create table if not exists messages (
  id         uuid        default gen_random_uuid() primary key,
  room_id    uuid        not null references matches(id) on delete cascade,
  sender     uuid        not null references auth.users(id),
  content    text        not null,
  delivered  boolean     default false,
  created_at timestamptz default now()
);

create index if not exists messages_room_created_idx on messages (room_id, created_at desc);

alter table messages enable row level security;

create policy "Match members can view messages"
  on messages for select
  using (room_id in (select id from matches where user_a = auth.uid() or user_b = auth.uid()));

create policy "Match members can insert messages"
  on messages for insert
  with check (room_id in (select id from matches where user_a = auth.uid() or user_b = auth.uid()));

create policy "Sender can update own messages"
  on messages for update
  using (auth.uid() = sender);

-- ─── Games table ──────────────────────────────────────────────────────────────
create table if not exists games (
  id           uuid        default gen_random_uuid() primary key,
  match_id     uuid        references matches(id) on delete cascade,
  game_type    text        not null,
  player1_id   uuid        not null references auth.users(id),
  player2_id   uuid        not null references auth.users(id),
  owner        uuid        references auth.users(id),
  status       text        default 'pending',
  state        jsonb       not null default '{}',
  current_turn uuid        references auth.users(id),
  winner       text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists games_match_game on games (match_id, game_type);

alter table games enable row level security;

create policy "Match members can select games"
  on games for select
  using (player1_id = auth.uid() or player2_id = auth.uid());

create policy "Match members can insert games"
  on games for insert
  with check (player1_id = auth.uid() or player2_id = auth.uid());

create policy "Match members can update games"
  on games for update
  using (player1_id = auth.uid() or player2_id = auth.uid());

create policy "Match members can delete games"
  on games for delete
  using (player1_id = auth.uid() or player2_id = auth.uid());

create trigger games_updated_at
  before update on games
  for each row execute procedure update_updated_at();

-- ─── Moves table ──────────────────────────────────────────────────────────────
create table if not exists moves (
  id         uuid        default gen_random_uuid() primary key,
  game_id    uuid        not null references games(id) on delete cascade,
  player_id  uuid        not null references auth.users(id),
  move_data  jsonb       not null,
  created_at timestamptz default now()
);

create index if not exists moves_game_id on moves (game_id, created_at);

alter table moves enable row level security;

create policy "Match members can select moves"
  on moves for select
  using (
    game_id in (
      select g.id from games g
      where g.player1_id = auth.uid() or g.player2_id = auth.uid()
    )
  );

create policy "Players can insert their own moves"
  on moves for insert
  with check (auth.uid() = player_id);

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
