# Lobbyless Challenge Flow Design

Date: 2026-03-23
Project: Duel app
Status: Approved design draft for implementation planning

## Scope

This design removes the Guess Who lobby flow and replaces it with a lobbyless challenge flow for these multiplayer games only:

- `guess_who`
- `connect_four`
- `draughts`
- `battleship`

Out of scope and unchanged:

- `word_blitz` (local bot flow, no overlay changes)
- `dot_dash` (untouched)
- Existing route paths in `src/App.tsx` (must not change)

## Goals

- Remove `LobbyScreen.tsx` entirely.
- On challenge acceptance, run `createOrJoinGame -> initialise_game`, then navigate directly to the correct game board URL.
- Add a `GameTitleCard` overlay on mount for the four scoped multiplayer game boards.
- Make Player A resilient to accepting events while away from `MatchScreen` via app-level challenge listeners and actionable toast.
- Preserve race-safety for simultaneous setup calls from both players.
- Include an RLS enablement rollout phase with exact SQL, validation, and rollback checkpoints per table.

## Confirmed behavior decisions

- Success toast in `App.tsx` is for Player A (challenger) only.
- App-level listener pre-creates/pre-initializes game on acceptance detection.
- `Join game` button in toast is navigation-only (no async on tap).
- If setup fails, do not show success toast; show retry toast.
- `GameTitleCard` appears only in Guess Who, Connect Four, Draughts, Battleship.
- If opponent name is unavailable, show `vs Opponent` immediately; update if name arrives during overlay.
- No-show timeline anchor is when title card fades:
  - 30s: subtle waiting status line
  - 60s: dismissible prompt with cancel action
  - 120s: auto-abandon and navigate back with flash
- Reset no-show timers on opponent-originated realtime `games` update (`updated_at` changed and not local-origin).
- Unmount cleanup while title card active only:
  - `pending` -> `deleteGame`
  - `playing` -> `abandon_game`
- Guard unmount cleanup with a title-card-active ref to avoid false forfeits during normal game-end navigation.
- Guess Who secret insertion behavior:
  - move `insertGameSecret` to `GameBoard` mount
  - retry automatically up to 3 times with 1s intervals
  - if still failing, do not block overlay forever; continue and show dismissible in-game error banner with Leave action
- Mutual challenge: dedupe duplicate toasts by `(match_id, game_type)` for 5 seconds; suppress toast only, not navigation.

## Architecture

### Shared orchestration layer

Add a shared helper module (for example `src/lib/challengeGameFlow.ts`) containing:

- `normalizeGameType(raw: string): CanonicalGameType`
- `resolveGameRoute(gameType: string, matchId: string): string`
- `prepareAcceptedChallenge(input): Promise<Result>`

`prepareAcceptedChallenge` does:

1. `createOrJoinGame(...)`
2. `initialise_game` RPC
3. returns success/failure payload for caller UI

This module is reused by:

- `App.tsx` (Player A app-level accepted challenge handling)
- `MatchScreen.tsx` (Player B accept path and accepted challenge redirects)

### App-level acceptance listener

In `App.tsx`, add an always-on subscription (while authenticated) to challenge updates for outgoing challenges (`from_user = current user`).

On accepted transition:

- Run `prepareAcceptedChallenge` in background.
- On success, show toast:
  - Text: `"[Name] accepted your challenge!"`
  - Action: `Join game` (navigation-only)
- On failure, show error toast:
  - Text: `"Couldn't start game — tap to retry"`
  - Action: retry full pipeline
- Apply 5s dedupe per `(match_id, normalized_game_type)` for success toasts.

### MatchScreen flow

In `MatchScreen.tsx`:

- Replace lobby navigations for scoped multiplayer games with direct route resolver output.
- On accept:
  - call `acceptChallenge`
  - call `prepareAcceptedChallenge`
  - navigate to direct board URL on success
- Keep Word Blitz behavior unchanged.

### Board-local overlay and no-show control

For `GameBoard`, `ConnectFour`, `Draughts`, `Battleship`:

- Mount `GameTitleCard` for 3 seconds.
- Start no-show timeline after overlay completes.
- Reset timeline on opponent-originated realtime activity.
- Add guarded unmount cleanup while title card is active.

## Component and data flow details

### Route mapping (using existing `App.tsx` paths)

- `guess_who` -> `/game/:gameId/play` (using `matchId` param value)
- `connect_four` / `connect-four` -> `/games/connect-four/:matchId`
- `draughts` -> `/games/draughts/:matchId`
- `battleship` -> `/games/battleship/:matchId`
- `word_blitz` / `word-blitz` -> `/games/word-blitz/:matchId`

No route declarations are changed.

### New `GameTitleCard` component

Add a shared component (for example `src/components/game/GameTitleCard.tsx`) with props:

- `gameName`
- `opponentName`
- `waitFor?: boolean`
- `durationMs?: number` (default `3000`)
- `onComplete?: () => void`

Behavior:

- Pure timer overlay with game title, `vs [name]`, progress dots
- No Leave button
- Name fallback to `Opponent`
- If `waitFor=true`, timer pauses until ready condition clears

### Guess Who-specific secret setup

In `GameBoard.tsx`:

- move `insertGameSecret` to mount path
- use `GameTitleCard waitFor` during insertion
- retry insertion 3 times with 1s delay
- on final failure:
  - overlay proceeds
  - show dismissible banner:
    - `"Couldn't set up game — please leave and try again"`
    - `Leave` button calls `abandon_game` then navigates `/match/{matchId}`

### No-show UX sequence

Anchor: `GameTitleCard` completion event.

- `+30s`: bottom status line `Waiting for [Name]...`
- `+60s`: dismissible prompt with Cancel action
- `+120s`: auto-abandon and navigate with flash

Reset rule:

- any incoming realtime `games` update with changed `updated_at` not caused by current player

Cancel action:

- call `abandon_game`
- navigate to `/match/{matchId}`

### Unmount cleanup guard

Each board with title card keeps a ref, e.g. `titleCardActiveRef`:

- set `true` when title card mounts
- set `false` when title card completes

On unmount, only if ref is still `true`:

- if game status is `pending`: `deleteGame`
- if game status is `playing`: `abandon_game`

If title card has already completed, skip this cleanup entirely.

## Edge-case coverage matrix

- Opponent never arrives: staged wait + prompt + auto-abandon
- Player exits during overlay: guarded pending/delete vs playing/abandon behavior
- Player A navigates away before acceptance: app-level listener handles accepted event globally
- Mutual challenge: duplicate toast suppression, setup race remains safe
- Bot matches: Word Blitz unchanged
- URL correctness: normalized game type mapping to existing route paths only
- Guess Who setup failures: bounded retry and non-blocking fallback UI

## RLS execution phase (required rollout order)

Order is strict and sequential:

1. `profiles`
2. `photos`
3. `swipes`
4. `game_secrets`
5. `matches`
6. `challenges`
7. `messages`
8. `games`
9. `moves`

Do not start the next table until current table is validated.

### 1) profiles

```sql
BEGIN;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;

CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

COMMIT;
```

Validation:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
```

Functional test:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT id::text FROM profiles LIMIT 1), true);
SELECT COUNT(*) FROM profiles;
ROLLBACK;
```

Rollback:

```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

### 2) photos

```sql
BEGIN;

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view photos" ON photos;
DROP POLICY IF EXISTS "Users can insert their own photos" ON photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON photos;

DROP POLICY IF EXISTS "photos_select_authenticated" ON photos;
DROP POLICY IF EXISTS "photos_insert_own" ON photos;
DROP POLICY IF EXISTS "photos_update_own" ON photos;
DROP POLICY IF EXISTS "photos_delete_own" ON photos;

CREATE POLICY "photos_select_authenticated"
  ON photos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "photos_insert_own"
  ON photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "photos_update_own"
  ON photos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "photos_delete_own"
  ON photos FOR DELETE
  USING (auth.uid() = user_id);

COMMIT;
```

Validation:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'photos';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'photos'
ORDER BY policyname;
```

Functional test:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT id::text FROM profiles LIMIT 1), true);
SELECT COUNT(*) FROM photos;
ROLLBACK;
```

Rollback:

```sql
ALTER TABLE photos DISABLE ROW LEVEL SECURITY;
```

### 3) swipes

```sql
BEGIN;

ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own swipes" ON swipes;
DROP POLICY IF EXISTS "Users can insert their own swipes" ON swipes;
DROP POLICY IF EXISTS "Users can update their own swipes" ON swipes;

DROP POLICY IF EXISTS "swipes_select_own" ON swipes;
DROP POLICY IF EXISTS "swipes_insert_own" ON swipes;
DROP POLICY IF EXISTS "swipes_update_own" ON swipes;

CREATE POLICY "swipes_select_own"
  ON swipes FOR SELECT
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "swipes_insert_own"
  ON swipes FOR INSERT
  WITH CHECK (auth.uid() = from_user);

CREATE POLICY "swipes_update_own"
  ON swipes FOR UPDATE
  USING (auth.uid() = from_user);

COMMIT;
```

Validation:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'swipes';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'swipes'
ORDER BY policyname;
```

Functional test:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT id::text FROM profiles LIMIT 1), true);
SELECT COUNT(*) FROM swipes WHERE from_user = auth.uid() OR to_user = auth.uid();
ROLLBACK;
```

Rollback:

```sql
ALTER TABLE swipes DISABLE ROW LEVEL SECURITY;
```

### 4) game_secrets

```sql
BEGIN;

ALTER TABLE game_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players read own secret" ON game_secrets;
DROP POLICY IF EXISTS "Players insert own secret" ON game_secrets;

DROP POLICY IF EXISTS "game_secrets_select_own" ON game_secrets;
DROP POLICY IF EXISTS "game_secrets_insert_own" ON game_secrets;

CREATE POLICY "game_secrets_select_own"
  ON game_secrets FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "game_secrets_insert_own"
  ON game_secrets FOR INSERT
  WITH CHECK (auth.uid() = player_id);

COMMIT;
```

Validation:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'game_secrets';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'game_secrets'
ORDER BY policyname;
```

Functional test:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT id::text FROM profiles LIMIT 1), true);
SELECT COUNT(*) FROM game_secrets WHERE player_id = auth.uid();
ROLLBACK;
```

Rollback:

```sql
ALTER TABLE game_secrets DISABLE ROW LEVEL SECURITY;
```

### 5) matches

```sql
BEGIN;

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Matched users can view their matches" ON matches;
DROP POLICY IF EXISTS "Users can insert matches" ON matches;
DROP POLICY IF EXISTS "Participants can update match status" ON matches;

DROP POLICY IF EXISTS "matches_select_participant" ON matches;
DROP POLICY IF EXISTS "matches_insert_participant" ON matches;
DROP POLICY IF EXISTS "matches_update_participant" ON matches;

CREATE POLICY "matches_select_participant"
  ON matches FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "matches_insert_participant"
  ON matches FOR INSERT
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "matches_update_participant"
  ON matches FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

COMMIT;
```

Validation:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'matches';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'matches'
ORDER BY policyname;
```

Functional test:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT id::text FROM profiles LIMIT 1), true);
SELECT COUNT(*) FROM matches WHERE user_a = auth.uid() OR user_b = auth.uid();
ROLLBACK;
```

Rollback:

```sql
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
```

### 6) challenges

```sql
BEGIN;

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view challenges" ON challenges;
DROP POLICY IF EXISTS "Users can create challenges" ON challenges;
DROP POLICY IF EXISTS "Participants can respond to challenges" ON challenges;

DROP POLICY IF EXISTS "challenges_select_participant" ON challenges;
DROP POLICY IF EXISTS "challenges_insert_own" ON challenges;
DROP POLICY IF EXISTS "challenges_update_participant" ON challenges;

CREATE POLICY "challenges_select_participant"
  ON challenges FOR SELECT
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "challenges_insert_own"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() = from_user);

CREATE POLICY "challenges_update_participant"
  ON challenges FOR UPDATE
  USING (auth.uid() = from_user OR auth.uid() = to_user);

COMMIT;
```

Validation:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'challenges';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'challenges'
ORDER BY policyname;
```

Functional test:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT id::text FROM profiles LIMIT 1), true);
SELECT COUNT(*) FROM challenges WHERE from_user = auth.uid() OR to_user = auth.uid();
ROLLBACK;
```

Rollback:

```sql
ALTER TABLE challenges DISABLE ROW LEVEL SECURITY;
```

### 7) messages (corrected UPDATE scope)

```sql
BEGIN;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Match members can view messages" ON messages;
DROP POLICY IF EXISTS "Match members can insert messages" ON messages;
DROP POLICY IF EXISTS "Sender can update own messages" ON messages;

DROP POLICY IF EXISTS "messages_select_match_member" ON messages;
DROP POLICY IF EXISTS "messages_insert_match_member" ON messages;
DROP POLICY IF EXISTS "messages_update_sender_only" ON messages;
DROP POLICY IF EXISTS "messages_update_match_member" ON messages;

CREATE POLICY "messages_select_match_member"
  ON messages FOR SELECT
  USING (
    room_id IN (
      SELECT id FROM matches
      WHERE user_a = auth.uid() OR user_b = auth.uid()
    )
  );

CREATE POLICY "messages_insert_match_member"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender
    AND room_id IN (
      SELECT id FROM matches
      WHERE user_a = auth.uid() OR user_b = auth.uid()
    )
  );

CREATE POLICY "messages_update_match_member"
  ON messages FOR UPDATE
  USING (
    room_id IN (
      SELECT id FROM matches
      WHERE user_a = auth.uid() OR user_b = auth.uid()
    )
  );

COMMIT;
```

Validation:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'messages';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'messages'
ORDER BY policyname;
```

Functional test:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT id::text FROM profiles LIMIT 1), true);
SELECT COUNT(*) FROM messages
WHERE room_id IN (SELECT id FROM matches WHERE user_a = auth.uid() OR user_b = auth.uid());
ROLLBACK;
```

Rollback:

```sql
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
```

### 8) games

```sql
BEGIN;

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Match members can select games" ON games;
DROP POLICY IF EXISTS "Match members can insert games" ON games;
DROP POLICY IF EXISTS "Match members can update games" ON games;
DROP POLICY IF EXISTS "Match members can delete games" ON games;

DROP POLICY IF EXISTS "games_select_player" ON games;
DROP POLICY IF EXISTS "games_insert_player" ON games;
DROP POLICY IF EXISTS "games_update_player" ON games;
DROP POLICY IF EXISTS "games_delete_player" ON games;

CREATE POLICY "games_select_player"
  ON games FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "games_insert_player"
  ON games FOR INSERT
  WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "games_update_player"
  ON games FOR UPDATE
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "games_delete_player"
  ON games FOR DELETE
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

COMMIT;
```

Validation:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'games';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'games'
ORDER BY policyname;

SELECT policyname, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'games' AND policyname = 'games_insert_player';
```

Functional test:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT id::text FROM profiles LIMIT 1), true);
SELECT COUNT(*) FROM games WHERE player1_id = auth.uid() OR player2_id = auth.uid();
ROLLBACK;
```

Rollback:

```sql
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
```

### 9) moves

```sql
BEGIN;

ALTER TABLE moves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Match members can select moves" ON moves;
DROP POLICY IF EXISTS "Players can insert their own moves" ON moves;

DROP POLICY IF EXISTS "moves_select_game_player" ON moves;
DROP POLICY IF EXISTS "moves_insert_own" ON moves;

CREATE POLICY "moves_select_game_player"
  ON moves FOR SELECT
  USING (
    game_id IN (
      SELECT id FROM games
      WHERE player1_id = auth.uid() OR player2_id = auth.uid()
    )
  );

CREATE POLICY "moves_insert_own"
  ON moves FOR INSERT
  WITH CHECK (auth.uid() = player_id);

COMMIT;
```

Validation:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'moves';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'moves'
ORDER BY policyname;
```

Functional test:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT id::text FROM profiles LIMIT 1), true);
SELECT COUNT(*) FROM moves
WHERE game_id IN (SELECT id FROM games WHERE player1_id = auth.uid() OR player2_id = auth.uid());
ROLLBACK;
```

Rollback:

```sql
ALTER TABLE moves DISABLE ROW LEVEL SECURITY;
```

## Final verification query (after all tables)

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles','photos','swipes','game_secrets','matches','challenges','messages','games','moves')
ORDER BY tablename;
```

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles','photos','swipes','game_secrets','matches','challenges','messages','games','moves')
ORDER BY tablename, policyname;
```

## Testing strategy for implementation phase

- Unit-level:
  - game type normalizer
  - route resolver mapping
  - toast dedupe window behavior
- Integration-level:
  - Player B accept -> direct game route
  - Player A away from match -> app-level toast + join
  - simultaneous A/B setup race
  - Guess Who secret retry behavior and fallback banner
  - overlay no-show timeline and reset behavior
- Regression checks:
  - Word Blitz unchanged
  - DotDash unchanged
  - no route path drift
  - no false forfeit on normal game-end navigation

## Risks and mitigations

- Realtime duplicate events causing duplicate UX: mitigate with 5s dedupe keying.
- Asynchronous setup failure before CTA: mitigate with error toast + retry pipeline and gated success toast.
- Incorrect cleanup during transitions: mitigate with strict `titleCardActiveRef` guard and one-shot cleanup refs.
- RLS rollout blast radius: mitigate by table-by-table order, validation query after each table, and explicit rollback command per table.

## Implementation readiness

Design is approved by section with incorporated corrections:

- messages UPDATE policy uses match membership scope
- Guess Who secret insertion has bounded retries and non-blocking fallback
- title-card unmount cleanup guard is explicit

Next step: convert this design into a detailed implementation plan and execute in phased commits.
