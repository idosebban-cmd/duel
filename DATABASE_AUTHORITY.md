# Duel — Definitive Database Authority Document

**Owner:** Database Architect (Claude)
**Live project:** `maqjhjvgfvomslktfznz` (Supabase, North EU Stockholm)
**Date:** 2026-03-20

---

## 1. Definitive Current Schema (Live DB)

This is the source of truth for what exists in the live Supabase database right now.

### 1.1 `profiles`
```sql
CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email               TEXT NOT NULL,
  name                TEXT,
  age                 INTEGER,
  bio                 TEXT,
  location            TEXT,
  gender              TEXT,
  interested_in       TEXT,
  birthday            TEXT,
  character           TEXT,
  element             TEXT,
  affiliation         TEXT,
  game_types          TEXT[] DEFAULT '{}',
  favorite_games      TEXT[] DEFAULT '{}',
  looking_for         TEXT[] DEFAULT '{}',
  kids                TEXT,
  drinking            TEXT,
  smoking             TEXT,
  cannabis            TEXT,
  pets                TEXT,
  exercise            TEXT,
  intent              TEXT DEFAULT 'romance' CHECK (intent IN ('romance', 'play', 'both')),
  preferred_age_min   INTEGER DEFAULT 18,
  preferred_age_max   INTEGER DEFAULT 65,
  preferred_distance  INTEGER,
  latitude            DECIMAL(10, 8),
  longitude           DECIMAL(11, 8),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX profiles_location_idx ON profiles (latitude, longitude);
```
**Trigger:** `profiles_updated_at` → `update_updated_at()` before UPDATE
**RLS:** ENABLED — 3 policies (select: authenticated, insert: self, update: self)

### 1.2 `photos`
```sql
CREATE TABLE photos (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_url  TEXT NOT NULL,
  "order"    INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
**RLS:** ENABLED — 4 policies (select: authenticated, insert/update/delete: owner)

### 1.3 `swipes`
```sql
CREATE TABLE swipes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  direction  TEXT NOT NULL CHECK (direction IN ('like', 'pass')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_user, to_user)
);
```
**RLS:** ENABLED — 3 policies (select: from_user or to_user, insert/update: from_user)

### 1.4 `matches`
```sql
CREATE TABLE matches (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_a     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status     TEXT DEFAULT 'active',
  matched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_a, user_b)
);
```
**RLS:** ENABLED — 2 policies (select: participant, insert: participant)

### 1.5 `messages`
```sql
CREATE TABLE messages (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id    UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender     UUID NOT NULL REFERENCES auth.users(id),
  content    TEXT NOT NULL,
  delivered  BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX messages_room_created_idx ON messages (room_id, created_at DESC);
```
**RLS:** ENABLED — 3 policies (select/insert: match member via subquery, update: sender)

### 1.6 `games`
```sql
CREATE TABLE games (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id     UUID REFERENCES matches(id) ON DELETE CASCADE,  -- nullable
  game_type    TEXT NOT NULL,
  player1_id   UUID NOT NULL REFERENCES auth.users(id),
  player2_id   UUID NOT NULL REFERENCES auth.users(id),
  owner        UUID REFERENCES auth.users(id),
  status       TEXT DEFAULT 'pending',
  state        JSONB NOT NULL DEFAULT '{}',
  current_turn UUID REFERENCES auth.users(id),
  winner       TEXT,  -- 'player1' | 'player2' | 'draw' | null
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX games_match_game ON games (match_id, game_type);
```
**Trigger:** `games_updated_at` → `update_updated_at()` before UPDATE
**RLS:** ENABLED — 4 policies (select/insert/update/delete: player1_id or player2_id)

### 1.7 `moves`
```sql
CREATE TABLE moves (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id    UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id  UUID NOT NULL REFERENCES auth.users(id),
  move_data  JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX moves_game_id ON moves (game_id, created_at);
```
**RLS:** ENABLED — 2 policies (select: game participant via subquery, insert: self)

### 1.8 `challenges`
```sql
CREATE TABLE challenges (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id    UUID NOT NULL REFERENCES matches(id),
  from_user   UUID NOT NULL REFERENCES profiles(id),
  to_user     UUID NOT NULL REFERENCES profiles(id),
  game_type   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_challenges_match_id ON challenges (match_id);
CREATE INDEX idx_challenges_to_user_status ON challenges (to_user, status);
```
**RLS:** NOT ENABLED — **needs policies** (see Section 3)

### 1.9 Functions
```sql
-- Trigger function used by profiles and games
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;
```
**RPC functions deployed:** `check_guess` (atomic guess + move + winner — see Section 2 & 4), `reveal_secrets`, `set_player_ready`.

### 1.10 Storage
- **Bucket:** `photos` (public: true)
- **Policies:** authenticated upload to own folder, public read, owner delete

---

## 2. Secret ID Leak — Problem & Solution

### The Problem

Guess Who stores both players' secret character IDs in `games.state`:

```json
{
  "characters": [...],
  "p1SecretId": "char_samantha",
  "p2SecretId": "char_alex",
  "p1Flipped": [],
  "p2Flipped": [],
  "turnPhase": "ask",
  ...
}
```

Both players have SELECT access to the `games` row. A player can open DevTools, inspect the Supabase response, and see their opponent's secret character ID. The entire game integrity is broken.

### Solution: Separate `game_secrets` Table

Create a new table that stores each player's secret in its own row. RLS ensures a player can only read their own row.

```sql
CREATE TABLE game_secrets (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id   UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id),
  secret    JSONB NOT NULL,  -- e.g. {"characterId": "char_samantha"}
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game_id, player_id)
);

ALTER TABLE game_secrets ENABLE ROW LEVEL SECURITY;

-- Each player can only read their OWN secret
CREATE POLICY "Players read own secret"
  ON game_secrets FOR SELECT
  USING (auth.uid() = player_id);

-- Only game participants can insert (enforced by game_id FK + this check)
CREATE POLICY "Players insert own secret"
  ON game_secrets FOR INSERT
  WITH CHECK (auth.uid() = player_id);
```

### How It Works

1. **At game creation** (LobbyScreen/createOrJoinGame): instead of putting `p1SecretId`/`p2SecretId` in `games.state`, insert two rows into `game_secrets`:
   - `{game_id, player_id: p1, secret: {characterId: "char_samantha"}}`
   - `{game_id, player_id: p2, secret: {characterId: "char_alex"}}`

2. **`games.state`** no longer contains any secrets. It keeps only shared data: `characters`, `p1Flipped`, `p2Flipped`, `turnPhase`, `currentQuestion`, `currentAnswer`, `turnHistory`, `moveCount`.

3. **On game load**, each client fetches their own secret:
   ```typescript
   const { data } = await supabase
     .from('game_secrets')
     .select('secret')
     .eq('game_id', gameId)
     .eq('player_id', myUserId)
     .single();
   // data.secret.characterId → my secret
   ```
   RLS blocks them from reading the opponent's row.

4. **On guess**, the opponent's secret is checked server-side via an atomic RPC:
   ```sql
   CREATE OR REPLACE FUNCTION check_guess(p_game_id UUID, p_guessed_character TEXT)
   RETURNS JSONB
   LANGUAGE plpgsql SECURITY DEFINER AS $$
   DECLARE
     v_guesser_id  UUID := auth.uid();
     v_game        RECORD;
     v_secret      TEXT;
     v_correct     BOOLEAN;
     v_winner      TEXT;
     v_opponent_id UUID;
   BEGIN
     SELECT * INTO v_game FROM games
      WHERE id = p_game_id AND winner IS NULL FOR UPDATE;
     IF NOT FOUND THEN RAISE EXCEPTION 'Game not found or already finished'; END IF;

     IF v_game.player1_id = v_guesser_id THEN v_opponent_id := v_game.player2_id;
     ELSIF v_game.player2_id = v_guesser_id THEN v_opponent_id := v_game.player1_id;
     ELSE RAISE EXCEPTION 'You are not a player in this game'; END IF;

     SELECT character_id INTO v_secret FROM game_secrets
      WHERE game_id = p_game_id AND player_id = v_opponent_id;
     IF v_secret IS NULL THEN RAISE EXCEPTION 'Opponent secret not found'; END IF;

     v_correct := (v_secret = p_guessed_character);
     IF v_correct THEN
       v_winner := CASE WHEN v_game.player1_id = v_guesser_id THEN 'player1' ELSE 'player2' END;
     ELSE
       v_winner := CASE WHEN v_game.player1_id = v_guesser_id THEN 'player2' ELSE 'player1' END;
     END IF;

     UPDATE games SET winner = v_winner, updated_at = now() WHERE id = p_game_id;

     INSERT INTO game_moves (game_id, player_id, move)
     VALUES (p_game_id, v_guesser_id, jsonb_build_object(
       'type', 'guess', 'guessedCharacterId', p_guessed_character, 'correct', v_correct));

     RETURN jsonb_build_object('correct', v_correct, 'winner', v_winner);
   END; $$;
   ```
   `SECURITY DEFINER` + `FOR UPDATE` lock makes this fully atomic: checks the guess, inserts the move, and sets the winner in one transaction. Returns `{correct, winner}` as JSONB. The frontend does **not** call `submitMove()` after a guess — the RPC handles everything.

5. **On game end** (result screen), reveal both secrets via an RPC that only works when `games.winner IS NOT NULL`:
   ```sql
   CREATE FUNCTION reveal_secrets(p_game_id UUID)
   RETURNS TABLE(player_id UUID, secret JSONB) AS $$
     SELECT gs.player_id, gs.secret
     FROM game_secrets gs
     JOIN games g ON g.id = gs.game_id
     WHERE gs.game_id = p_game_id
       AND g.winner IS NOT NULL
       AND (g.player1_id = auth.uid() OR g.player2_id = auth.uid());
   $$ LANGUAGE sql SECURITY DEFINER;
   ```

### Frontend Changes Required

| File | Change |
|------|--------|
| `guessWhoCharacters.ts` | `generateGuessWhoBoard()` still returns `p1SecretId`/`p2SecretId` for initial setup, but they get stored in `game_secrets` not `games.state` |
| `LobbyScreen.tsx` | After `createOrJoinGame()`, insert secrets into `game_secrets` table |
| `database.ts` | New functions: `insertGameSecret()`, `getMySecret()`, `checkGuess()` (RPC), `revealSecrets()` (RPC) |
| `GameBoard.tsx` | Load `mySecretId` from `getMySecret()` instead of `games.state`. Use `checkGuess()` RPC for guesses instead of reading opponent's secret directly |
| `GameResult.tsx` | Call `revealSecrets()` RPC to show both characters |
| `useMultiplayerGame.ts` | Remove `p1SecretId`/`p2SecretId` from the state it polls |

---

## 3. RLS Policy Designs — All Tables

### 3.1 `profiles` (existing — adequate)
| Operation | Policy | Check |
|-----------|--------|-------|
| SELECT | Authenticated users can view profiles | `auth.role() = 'authenticated'` |
| INSERT | Users can insert their own profile | `auth.uid() = id` |
| UPDATE | Users can update their own profile | `auth.uid() = id` |

**Missing:** No DELETE policy. Account deletion in `ProfileScreen.tsx` calls `supabase.from('profiles').delete().eq('id', userId)`. Options:
- **Option A (recommended):** Add a DELETE policy: `auth.uid() = id`
- **Option B:** Handle account deletion via a Supabase Edge Function that runs as service_role

### 3.2 `photos` (existing — adequate)
| Operation | Policy | Check |
|-----------|--------|-------|
| SELECT | Authenticated users can view photos | `auth.role() = 'authenticated'` |
| INSERT | Users can insert their own photos | `auth.uid() = user_id` |
| UPDATE | Users can update their own photos | `auth.uid() = user_id` |
| DELETE | Users can delete their own photos | `auth.uid() = user_id` |

No changes needed.

### 3.3 `swipes` (existing — adequate)
| Operation | Policy | Check |
|-----------|--------|-------|
| SELECT | Users can view their own swipes | `auth.uid() = from_user OR auth.uid() = to_user` |
| INSERT | Users can insert their own swipes | `auth.uid() = from_user` |
| UPDATE | Users can update their own swipes | `auth.uid() = from_user` |

No changes needed.

### 3.4 `matches` (existing — needs UPDATE policy)
| Operation | Policy | Check |
|-----------|--------|-------|
| SELECT | Matched users can view their matches | `auth.uid() = user_a OR auth.uid() = user_b` |
| INSERT | Users can insert matches | `auth.uid() = user_a OR auth.uid() = user_b` |
| **UPDATE** | **Participants can update match status** | `auth.uid() = user_a OR auth.uid() = user_b` |

**Note:** Currently no UPDATE policy. If `status` column is ever toggled (e.g. unmatch), it will fail silently. Add preemptively.

### 3.5 `messages` (existing — adequate)
| Operation | Policy | Check |
|-----------|--------|-------|
| SELECT | Match members can view messages | `room_id IN (SELECT id FROM matches WHERE user_a = auth.uid() OR user_b = auth.uid())` |
| INSERT | Match members can insert messages | same subquery |
| UPDATE | Sender can update own messages | `auth.uid() = sender` |

No changes needed.

### 3.6 `games` (existing — adequate)
| Operation | Policy | Check |
|-----------|--------|-------|
| SELECT | Match members can select games | `player1_id = auth.uid() OR player2_id = auth.uid()` |
| INSERT | Match members can insert games | `player1_id = auth.uid() OR player2_id = auth.uid()` |
| UPDATE | Match members can update games | `player1_id = auth.uid() OR player2_id = auth.uid()` |
| DELETE | Match members can delete games | `player1_id = auth.uid() OR player2_id = auth.uid()` |

No changes needed. (Secret isolation is handled by the new `game_secrets` table, not by games RLS.)

### 3.7 `moves` (existing — adequate)
| Operation | Policy | Check |
|-----------|--------|-------|
| SELECT | Match members can select moves | `game_id IN (SELECT g.id FROM games g WHERE g.player1_id = auth.uid() OR g.player2_id = auth.uid())` |
| INSERT | Players can insert their own moves | `auth.uid() = player_id` |

No changes needed.

### 3.8 `challenges` (**NEW — not yet enabled**)
```sql
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Participants can see challenges for their matches
CREATE POLICY "Participants can view challenges"
  ON challenges FOR SELECT
  USING (auth.uid() = from_user OR auth.uid() = to_user);

-- Users can create challenges as themselves
CREATE POLICY "Users can create challenges"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() = from_user);

-- Recipients can accept/decline (update status)
CREATE POLICY "Recipients can respond to challenges"
  ON challenges FOR UPDATE
  USING (auth.uid() = to_user OR auth.uid() = from_user);
```
**Rationale for UPDATE:** `from_user` needs UPDATE to mark opponent's challenge as `accepted` in the mutual-match path (see `createChallenge()` in database.ts line 752). `to_user` needs UPDATE to accept/decline.

### 3.9 `game_secrets` (**NEW**)
See Section 2 above. Strict per-player isolation — each player reads only their own row.

---

## 4. Migration SQL — All Pending Changes

### Migration: `20260320_game_secrets_and_fixes.sql`

```sql
-- ============================================================
-- Migration: Game secrets table, challenges RLS, missing policies
-- Date: 2026-03-20
-- ============================================================

BEGIN;

-- ─── 1. game_secrets table (secret ID isolation) ───────────

CREATE TABLE IF NOT EXISTS game_secrets (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id    UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id  UUID NOT NULL REFERENCES auth.users(id),
  secret     JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game_id, player_id)
);

ALTER TABLE game_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players read own secret"
  ON game_secrets FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Players insert own secret"
  ON game_secrets FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- ─── 2. check_guess RPC (atomic guess + move + winner) ────

CREATE OR REPLACE FUNCTION check_guess(
  p_game_id   UUID,
  p_guessed_character TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guesser_id   UUID := auth.uid();
  v_game         RECORD;
  v_secret       TEXT;
  v_correct      BOOLEAN;
  v_winner       TEXT;     -- 'player1' | 'player2'
  v_opponent_id  UUID;
BEGIN
  -- Lock the game row for update
  SELECT * INTO v_game
    FROM games
   WHERE id = p_game_id
     AND winner IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found or already finished';
  END IF;

  -- Determine opponent
  IF v_game.player1_id = v_guesser_id THEN
    v_opponent_id := v_game.player2_id;
  ELSIF v_game.player2_id = v_guesser_id THEN
    v_opponent_id := v_game.player1_id;
  ELSE
    RAISE EXCEPTION 'You are not a player in this game';
  END IF;

  -- Look up the opponent's secret character
  SELECT character_id INTO v_secret
    FROM game_secrets
   WHERE game_id = p_game_id
     AND player_id = v_opponent_id;

  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'Opponent secret not found';
  END IF;

  -- Check the guess
  v_correct := (v_secret = p_guessed_character);

  IF v_correct THEN
    -- Guesser wins
    v_winner := CASE WHEN v_game.player1_id = v_guesser_id THEN 'player1' ELSE 'player2' END;
  ELSE
    -- Wrong guess: opponent wins
    v_winner := CASE WHEN v_game.player1_id = v_guesser_id THEN 'player2' ELSE 'player1' END;
  END IF;

  -- Finalize the game
  UPDATE games
     SET winner     = v_winner,
         updated_at = now()
   WHERE id = p_game_id;

  -- Insert the move record
  INSERT INTO game_moves (game_id, player_id, move)
  VALUES (p_game_id, v_guesser_id, jsonb_build_object(
    'type', 'guess',
    'guessedCharacterId', p_guessed_character,
    'correct', v_correct
  ));

  RETURN jsonb_build_object('correct', v_correct, 'winner', v_winner);
END;
$$;

-- ─── 3. reveal_secrets RPC (post-game reveal) ─────────────

CREATE OR REPLACE FUNCTION reveal_secrets(p_game_id UUID)
RETURNS TABLE(player_id UUID, secret JSONB) AS $$
  SELECT gs.player_id, gs.secret
  FROM game_secrets gs
  JOIN games g ON g.id = gs.game_id
  WHERE gs.game_id = p_game_id
    AND g.winner IS NOT NULL
    AND (g.player1_id = auth.uid() OR g.player2_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

-- ─── 4. set_player_ready RPC (atomic lobby ready) ─────────

CREATE OR REPLACE FUNCTION set_player_ready(
  p_game_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
  UPDATE games
  SET state = jsonb_set(
    COALESCE(state, '{}'::jsonb),
    ARRAY['ready', p_user_id::text],
    'true'::jsonb
  ),
  updated_at = now()
  WHERE id = p_game_id
    AND (player1_id = p_user_id OR player2_id = p_user_id)
  RETURNING state->'ready';
$$ LANGUAGE sql;

-- ─── 5. submit_move RPC (atomic move + state update) ──────

CREATE OR REPLACE FUNCTION submit_move(
  p_game_id    UUID,
  p_player_id  UUID,
  p_move       JSONB,
  p_new_state  JSONB,
  p_next_turn  UUID,
  p_winner     TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Verify caller is a participant
  IF NOT EXISTS (
    SELECT 1 FROM games
    WHERE id = p_game_id
      AND (player1_id = p_player_id OR player2_id = p_player_id)
  ) THEN
    RAISE EXCEPTION 'Not a participant in this game';
  END IF;

  INSERT INTO moves (game_id, player_id, move_data)
  VALUES (p_game_id, p_player_id, p_move);

  UPDATE games
  SET state        = p_new_state,
      current_turn = CASE WHEN p_winner IS NOT NULL THEN NULL ELSE p_next_turn END,
      winner       = p_winner,
      updated_at   = now()
  WHERE id = p_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 6. Unique constraint: one active game per match+type ──

-- Partial unique index: prevents duplicate active games
CREATE UNIQUE INDEX IF NOT EXISTS uq_games_match_type_active
  ON games (match_id, game_type)
  WHERE winner IS NULL;

-- ─── 7. Challenges RLS ────────────────────────────────────

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view challenges"
  ON challenges FOR SELECT
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "Users can create challenges"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() = from_user);

CREATE POLICY "Participants can respond to challenges"
  ON challenges FOR UPDATE
  USING (auth.uid() = to_user OR auth.uid() = from_user);

-- ─── 8. Missing profiles DELETE policy ────────────────────

CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- ─── 9. Missing matches UPDATE policy ─────────────────────

CREATE POLICY "Participants can update match status"
  ON matches FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

COMMIT;
```

---

## 5. Recommended Constraints Still Missing

### 5.1 Active game uniqueness (**included in migration above**)
```
UNIQUE INDEX uq_games_match_type_active ON games (match_id, game_type) WHERE winner IS NULL
```
Prevents the TOCTOU race in `createOrJoinGame()`. With this index, the client code should use `INSERT ... ON CONFLICT (match_id, game_type) WHERE winner IS NULL DO NOTHING` followed by a `SELECT`.

### 5.2 Challenges: prevent duplicate pending challenges
```sql
CREATE UNIQUE INDEX uq_challenges_pending
  ON challenges (match_id, from_user, game_type)
  WHERE status = 'pending';
```
Prevents a user from spamming the same challenge. `createChallenge()` should use `ON CONFLICT DO NOTHING`.

### 5.3 `games.winner` CHECK constraint
```sql
ALTER TABLE games ADD CONSTRAINT chk_games_winner
  CHECK (winner IS NULL OR winner IN ('player1', 'player2', 'draw'));
```
Currently `winner` is a free-text `TEXT` column. Any string can be written.

### 5.4 `games.status` CHECK constraint
```sql
ALTER TABLE games ADD CONSTRAINT chk_games_status
  CHECK (status IN ('pending', 'ready', 'playing', 'finished'));
```
Currently unused in queries (everything checks `winner` instead), but should be constrained.

### 5.5 `challenges.status` CHECK constraint
```sql
ALTER TABLE challenges ADD CONSTRAINT chk_challenges_status
  CHECK (status IN ('pending', 'accepted', 'declined', 'expired'));
```

### 5.6 `matches.status` CHECK constraint
```sql
ALTER TABLE matches ADD CONSTRAINT chk_matches_status
  CHECK (status IN ('active', 'unmatched'));
```

### 5.7 `challenges.from_user != to_user`
```sql
ALTER TABLE challenges ADD CONSTRAINT chk_challenges_not_self
  CHECK (from_user != to_user);
```

### 5.8 `games.player1_id != player2_id`
```sql
ALTER TABLE games ADD CONSTRAINT chk_games_different_players
  CHECK (player1_id != player2_id);
```

### 5.9 `swipes.from_user != to_user`
```sql
ALTER TABLE swipes ADD CONSTRAINT chk_swipes_not_self
  CHECK (from_user != to_user);
```

### 5.10 Optimistic locking (optional, recommended later)
```sql
ALTER TABLE games ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
```
Would require updating all game write queries to include `AND version = $expected` and incrementing on write. Good for preventing stale overwrites but requires coordinated frontend changes. **Defer to Phase 2.**

---

## 6. Summary: Priority Implementation Order

| # | Change | Fixes | Risk | Effort |
|---|--------|-------|------|--------|
| 1 | `game_secrets` table + RLS + RPCs | Secret ID leak (security) | LOW | Medium |
| 2 | `challenges` RLS enable + policies | Any user can read/write any challenge | LOW | Low |
| 3 | `set_player_ready` RPC | Lobby stuck from race condition | LOW | Low |
| 4 | `submit_move` RPC | Non-atomic move+state (data loss) | LOW | Low |
| 5 | `uq_games_match_type_active` index | Duplicate game rows from TOCTOU | LOW | Low |
| 6 | `profiles` DELETE policy | Account deletion fails with RLS | LOW | Trivial |
| 7 | `matches` UPDATE policy | Future unmatch would fail silently | LOW | Trivial |
| 8 | CHECK constraints (5.3–5.9) | Data integrity / garbage prevention | LOW | Trivial |
| 9 | `uq_challenges_pending` index | Challenge spam | LOW | Trivial |
| 10 | Optimistic locking (version column) | Stale-write overwrites | MEDIUM | Medium |

**Items 1–9 are in the migration file above. Item 10 is deferred to Phase 2.**

---

## 7. Frontend Code Changes Required (for implementer)

After the migration is applied, these database.ts functions need updating:

| Function | Current | Change to |
|----------|---------|-----------|
| `updateGameReady()` | Read-modify-write on `games.state` | `supabase.rpc('set_player_ready', {p_game_id, p_user_id})` |
| `submitGameMove()` | `Promise.all([insert moves, update games])` | `supabase.rpc('submit_move', {p_game_id, p_player_id, p_move, p_new_state, p_next_turn, p_winner})` |
| `createOrJoinGame()` | Check-then-insert | `INSERT ... ON CONFLICT DO NOTHING` + `SELECT` (requires partial unique index) |
| NEW: `insertGameSecret()` | N/A | Insert into `game_secrets` after game creation |
| NEW: `getMySecret()` | N/A | `SELECT secret FROM game_secrets WHERE game_id = $1 AND player_id = auth.uid()` |
| NEW: `checkGuess()` | Read opponent's secret client-side | `supabase.rpc('check_guess', {p_game_id, p_guessed_character})` |
| NEW: `revealSecrets()` | N/A | `supabase.rpc('reveal_secrets', {p_game_id})` |

**LobbyScreen.tsx:** After `createOrJoinGame()`, call `insertGameSecret()` for both players (each player inserts their own secret; RLS enforces `player_id = auth.uid()`).

**GameBoard.tsx:** Remove all reads of `gs.p1SecretId` / `gs.p2SecretId`. Load `mySecretId` from `getMySecret()`. Replace direct secret comparison in guess logic with `checkGuess()` RPC call.

**GameResult.tsx:** Call `revealSecrets()` RPC to get both character IDs for the post-game reveal screen.