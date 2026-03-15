-- Seed 18 bot/test profiles for realistic Discover feed testing.
-- Temporarily drop the FK constraint so bot UUIDs don't need auth.users entries,
-- then re-add it with NOT VALID (enforces for new rows, skips existing).

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

INSERT INTO profiles (id, email, name, age, bio, gender, interested_in, character, element, affiliation, game_types, favorite_games, looking_for, kids, drinking, smoking, cannabis, pets, exercise, intent)
VALUES
  -- 1. Romance-focused profiles
  ('a0000000-0000-0000-0000-000000000001', 'bot_luna@duel.test', 'Luna Starweaver', 24,
   'Moonlit gamer girl who loves cozy RPGs and late-night raids. Looking for someone to share the adventure with.',
   'woman', 'men', 'cat', 'water', 'cosmic',
   ARRAY['rpg','coop','puzzles'], ARRAY['Stardew Valley','Final Fantasy XIV'], ARRAY['long-term','casual'],
   'Want kids someday', 'Socially', 'No', 'Never', 'Have a cat', 'Occasionally', 'romance'),

  ('a0000000-0000-0000-0000-000000000002', 'bot_kai@duel.test', 'Kai Thornfield', 28,
   'Competitive FPS player by day, board game nerd by night. I take my coffee black and my strategy deep.',
   'man', 'women', 'dragon', 'fire', 'tech',
   ARRAY['competitive','strategy','board'], ARRAY['Valorant','Catan'], ARRAY['long-term'],
   'Not sure yet', 'Rarely', 'No', 'Never', 'Have a dog', 'Daily', 'romance'),

  ('a0000000-0000-0000-0000-000000000003', 'bot_sage@duel.test', 'Sage Delacroix', 31,
   'Non-binary artist who paints between raid bosses. My love language is co-op gaming sessions.',
   'non-binary', 'everyone', 'octopus', 'earth', 'art',
   ARRAY['coop','rpg','drawing'], ARRAY['It Takes Two','Hades'], ARRAY['long-term','not-sure'],
   'Open to partner with kids', 'Socially', 'No', 'Occasionally', 'Have a cat', 'Few times a week', 'romance'),

  ('a0000000-0000-0000-0000-000000000004', 'bot_mila@duel.test', 'Mila Chen', 22,
   'College student who speedruns platformers and bakes cookies at 2am. Looking for my player 2!',
   'woman', 'everyone', 'fox', 'air', 'city',
   ARRAY['competitive','party','mobile'], ARRAY['Celeste','Mario Kart'], ARRAY['casual','short-term'],
   'Don''t want kids', 'Rarely', 'No', 'Never', 'Want pets', 'Occasionally', 'romance'),

  ('a0000000-0000-0000-0000-000000000005', 'bot_darius@duel.test', 'Darius Wolfe', 35,
   'Game dev who still gets excited about pixel art. Weekend hiker and retro arcade enthusiast.',
   'man', 'women', 'wolf', 'electric', 'nature',
   ARRAY['rpg','strategy','puzzles'], ARRAY['Elden Ring','Civilization VI'], ARRAY['long-term'],
   'Want kids someday', 'Socially', 'No', 'Never', 'Have a dog', 'Daily', 'romance'),

  -- 2. Play-only profiles
  ('a0000000-0000-0000-0000-000000000006', 'bot_pixel@duel.test', 'Pixel McGee', 19,
   'Just here to game! Diamond rank in three different titles. Looking for chill squad members.',
   'man', 'everyone', 'robot', 'electric', 'tech',
   ARRAY['competitive','video','party'], ARRAY['League of Legends','Overwatch 2'], ARRAY[]::text[],
   NULL, NULL, NULL, NULL, NULL, NULL, 'play'),

  ('a0000000-0000-0000-0000-000000000007', 'bot_nyx@duel.test', 'Nyx Shadowbane', 26,
   'Hardcore raider looking for a dedicated static group. I parse logs for fun. No drama, just loot.',
   'woman', 'everyone', 'ghost', 'water', 'cosmic',
   ARRAY['rpg','competitive','coop'], ARRAY['World of Warcraft','Destiny 2'], ARRAY[]::text[],
   NULL, NULL, NULL, NULL, NULL, NULL, 'play'),

  ('a0000000-0000-0000-0000-000000000008', 'bot_blaze@duel.test', 'Blaze Kowalski', 23,
   'Esports wannabe grinding ranked every night. If you can keep up, let''s duo queue together!',
   'man', 'men', 'phoenix', 'fire', 'fitness',
   ARRAY['competitive','video','strategy'], ARRAY['Apex Legends','Rocket League'], ARRAY[]::text[],
   NULL, 'Never', 'No', 'Never', NULL, 'Daily', 'play'),

  ('a0000000-0000-0000-0000-000000000009', 'bot_yuki@duel.test', 'Yuki Tanaka', 21,
   'Puzzle game addict and mobile gaming queen. Always looking for new brain teasers to conquer.',
   'woman', 'everyone', 'owl', 'air', 'library',
   ARRAY['puzzles','mobile','word'], ARRAY['Wordle','Monument Valley'], ARRAY[]::text[],
   NULL, NULL, NULL, NULL, NULL, NULL, 'play'),

  ('a0000000-0000-0000-0000-000000000010', 'bot_rex@duel.test', 'Rex Ironfist', 30,
   'Tabletop veteran running three D&D campaigns. Roll for initiative or roll on out of here.',
   'man', 'everyone', 'bear', 'earth', 'library',
   ARRAY['rpg','board','strategy','card'], ARRAY['D&D','Gloomhaven'], ARRAY[]::text[],
   NULL, 'Socially', 'No', 'Never', NULL, 'Rarely', 'play'),

  -- 3. Both (play + romance) profiles
  ('a0000000-0000-0000-0000-000000000011', 'bot_aria@duel.test', 'Aria Nightbloom', 27,
   'Cozy gamer who believes the best dates involve Mario Kart and homemade pizza. Change my mind.',
   'woman', 'men', 'unicorn', 'water', 'nature',
   ARRAY['party','coop','video'], ARRAY['Mario Kart 8','Animal Crossing'], ARRAY['casual','not-sure'],
   'Not sure yet', 'Socially', 'No', 'Never', 'Have a dog', 'Few times a week', 'both'),

  ('a0000000-0000-0000-0000-000000000012', 'bot_felix@duel.test', 'Felix Okonkwo', 25,
   'Music producer who games between beats. Love rhythm games and chill vibes. Let''s jam together.',
   'man', 'women', 'lion', 'air', 'music',
   ARRAY['party','mobile','active'], ARRAY['Beat Saber','Guitar Hero'], ARRAY['short-term','casual'],
   'Don''t want kids', 'Regularly', 'Socially', 'Occasionally', 'Want pets', 'Occasionally', 'both'),

  ('a0000000-0000-0000-0000-000000000013', 'bot_zara@duel.test', 'Zara Voss', 29,
   'Fitness coach who decompresses with strategy games. Looking for someone to spar with in-game and IRL.',
   'woman', 'everyone', 'knight', 'fire', 'fitness',
   ARRAY['strategy','competitive','board'], ARRAY['Chess','XCOM 2'], ARRAY['long-term'],
   'Want kids someday', 'Rarely', 'No', 'Never', 'Have a dog', 'Daily', 'both'),

  ('a0000000-0000-0000-0000-000000000014', 'bot_jin@duel.test', 'Jin Park', 33,
   'Travel blogger who carries a Switch everywhere. Beaten every Zelda title. Looking for co-op in life.',
   'man', 'women', 'ninja', 'earth', 'travel',
   ARRAY['rpg','puzzles','coop'], ARRAY['Zelda: TOTK','Dark Souls'], ARRAY['long-term','not-sure'],
   'Open to partner with kids', 'Socially', 'No', 'Never', 'Want pets', 'Few times a week', 'both'),

  ('a0000000-0000-0000-0000-000000000015', 'bot_ember@duel.test', 'Ember Castillo', 20,
   'Art student and indie game lover. I draw fan art of every game I play. Shy but will carry you in co-op.',
   'non-binary', 'everyone', 'witch', 'fire', 'art',
   ARRAY['rpg','drawing','coop','puzzles'], ARRAY['Hollow Knight','Celeste'], ARRAY['casual'],
   'Don''t want kids', 'Never', 'No', 'Never', 'Have a cat', 'Rarely', 'both'),

  ('a0000000-0000-0000-0000-000000000016', 'bot_soren@duel.test', 'Soren Blackwood', 37,
   'Dad gamer with limited hours but maximum skill. I play after the kids sleep. Quality over quantity.',
   'man', 'women', 'viking', 'earth', 'country',
   ARRAY['strategy','rpg','board'], ARRAY['Baldur''s Gate 3','Wingspan'], ARRAY['long-term'],
   'Have kids', 'Socially', 'No', 'Never', 'Have a dog', 'Few times a week', 'both'),

  ('a0000000-0000-0000-0000-000000000017', 'bot_nova@duel.test', 'Nova Kim', 23,
   'K-pop fan and gacha game addict. Will debate tier lists for hours. Let''s be each other''s SSR pull.',
   'woman', 'men', 'mermaid', 'water', 'music',
   ARRAY['mobile','card','party'], ARRAY['Genshin Impact','Honkai Star Rail'], ARRAY['short-term','casual'],
   'Don''t want kids', 'Rarely', 'No', 'Never', 'Want pets', 'Occasionally', 'both'),

  ('a0000000-0000-0000-0000-000000000018', 'bot_theo@duel.test', 'Theo Marchetti', 26,
   'Coffee-fueled coder who builds mods on weekends. I automated my farm in Stardew. Let''s optimize life together.',
   'man', 'everyone', 'robot', 'electric', 'tech',
   ARRAY['strategy','puzzles','video','coop'], ARRAY['Factorio','Stardew Valley'], ARRAY['not-sure','casual'],
   'Not sure yet', 'Socially', 'No', 'Occasionally', 'Want pets', 'Few times a week', 'both')

ON CONFLICT (id) DO NOTHING;

-- Re-add the FK constraint without validating existing rows
ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
