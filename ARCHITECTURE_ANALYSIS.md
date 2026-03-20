# Duel — Focused Architecture Analysis

Scope: 6 files — `database.ts`, `useMultiplayerGame.ts`, `GameBoard.tsx`, `LobbyScreen.tsx`, `MatchScreen.tsx`, `gameStore.ts`

---

## 1. Data Flow Map: DB → Hook → Component

### Write path (player action → DB)
```
GameBoard (user action)
  → submitMove(newState) [useMultiplayerGame hook]
    → optimistic: setGame(updatedGame) in local state
    → fire-and-forget: submitGameMove(gameId, newState, nextTurn, winner)
      → Promise.all([
          supabase.from('game_moves').insert(move),   ← NOT atomic
          supabase.from('games').update(state, turn, winner)
        ])
```

### Read path (DB → screen)
```
Supabase 'games' row
  → getGame(gameId) polled every 2.5s [useMultiplayerGame]
    → compares updated_at timestamp to detect changes
    → if changed: setGame(freshRow) → triggers React re-render
      → GameBoard reads game.state, game.current_turn, game.winner
```

### Lobby flow
```
MatchScreen: acceptChallenge → navigate('/game/:matchId/lobby', { state: { gameType } })
  → LobbyScreen: createOrJoinGame(matchId, gameType, userId, initialState)
    → DB: check for existing game row → insert if none
    → Poll game row every 2s checking state.ready[myId]
    → updateGameReady: read game → mutate state.ready → write back
    → Both ready → countdown → navigate('/game/:matchId/play')
      → GameBoard: useMultiplayerGame(matchId) → getGame → poll loop
```

### Result flow
```
GameBoard detects winner
  → navigate('/game/:matchId/result', { state: { ...fullGameState } })
    → GameResult reads everything from location.state (no DB fallback)
```

---

## 2. Top 5 Critical Bugs

### Bug 1: Non-atomic move + state update (HIGH — data loss)
- **Location:** `database.ts:submitGameMove` (line ~340)
- **Root cause:** `Promise.all` fires `game_moves.insert` and `games.update` independently. If one succeeds and the other fails, DB is inconsistent — move recorded but turn not swapped, or turn swapped but move lost.
- **Impact:** Silent corruption of game state. No retry, no rollback.

### Bug 2: Read-modify-write race in lobby ready (HIGH — stuck lobbies)
- **Location:** `database.ts:updateGameReady` (line ~400)
- **Root cause:** Reads `state.ready`, sets `state.ready[userId] = true`, writes back. Two players hitting ready simultaneously: Player A reads `{ready:{}}`, Player B reads `{ready:{}}`, Player A writes `{ready:{A:true}}`, Player B writes `{ready:{B:true}}` — Player A's ready is lost.
- **Impact:** One player appears stuck as "not ready." Lobby never starts. User must leave and re-enter.

### Bug 3: Check-then-insert race in game creation (MEDIUM — duplicate games)
- **Location:** `database.ts:createOrJoinGame` (line ~280)
- **Root cause:** Checks if game row exists with `.select()`, then `.insert()` if not found. No unique constraint on `(match_id, game_type)`. Two players creating simultaneously → two game rows → they each poll different rows → each sees an empty game.
- **Impact:** Players appear to be in different games. Game never progresses.

### Bug 4: location.state fragility (MEDIUM — broken refresh)
- **Location:** `LobbyScreen.tsx` (line ~60), `GameResult.tsx`
- **Root cause:** `gameType` passed via `location.state` from MatchScreen → LobbyScreen. On page refresh, `location.state` is null. LobbyScreen redirects to `/matches`. GameResult has the same problem — all result data is in `location.state` with no DB fallback.
- **Impact:** Any page refresh during lobby or result screen kicks the user out. Mobile browsers frequently kill and restore tabs, triggering this.

### Bug 5: Turn always swaps on submitMove (MEDIUM — broken multi-step turns)
- **Location:** `useMultiplayerGame.ts:submitMove` (line ~150)
- **Root cause:** `nextTurn = current_turn === player1_id ? player2_id : player1_id` — hardcoded swap on every call. Guess Who has multi-step turns (ask → answer → flip). GameBoard works around this by bundling flip + end_turn into one submitMove and using `sub_phase` to fake staying on the same turn.
- **Impact:** The workaround is fragile. Any future game with multi-step turns must replicate this same hack. If the workaround breaks, turns desync.

---

## 3. Correct Architecture for Game Flow

### Current flow (problematic)
```
MatchScreen → [location.state] → LobbyScreen → [poll] → GameBoard → [location.state] → GameResult
```

### Recommended flow
```
MatchScreen → /game/:matchId/lobby?type=guessWho → LobbyScreen → /game/:matchId/play → GameBoard → /game/:matchId/result → GameResult
```

### Key changes:

- **Replace `location.state` with URL params + DB lookups**
  - `gameType` → query param `?type=guessWho` (survives refresh)
  - GameResult → read from `games` table by matchId (already available)
  - LobbyScreen → read gameType from the game row itself (it's stored there)

- **Add `submitMoveWithoutTurnSwap` to useMultiplayerGame**
  - Two methods: `submitMove` (swaps turn) and `updateState` (same turn)
  - Eliminates the sub_phase workaround in GameBoard
  - Each game defines its own turn logic

- **Make submitMove transactional**
  - Single Supabase RPC call that inserts move + updates game in one transaction
  - Or: store moves as JSONB array inside the game row (eliminates `game_moves` table for simple games)

- **Replace polling with Supabase Realtime**
  - Subscribe to `games` table changes filtered by game ID
  - Keep polling as fallback with longer interval (10s)
  - Eliminates 2.5s latency and reduces DB load

- **Atomic ready toggle**
  - Use a Postgres RPC: `set_player_ready(game_id, user_id)` that does the read-modify-write in a single SQL statement
  - Example: `UPDATE games SET state = jsonb_set(state, '{ready,<userId>}', 'true') WHERE id = game_id`

- **GameStore cleanup**
  - Remove dead fields: `lobbyState`, `gameState`, `gameOverPayload` (Socket.IO leftovers)
  - Keep: `myUserId`, `myName`, `myAvatar`, `pendingFlips`, `isCountingDown`, `errorMessage`

---

## 4. DB Changes Needed

### 4a. Unique constraint to prevent duplicate games
```sql
ALTER TABLE games ADD CONSTRAINT uq_match_game
  UNIQUE (match_id, game_type)
  WHERE winner IS NULL;
```
- Partial unique index: only one active (no winner) game per match+type
- `createOrJoinGame` can then use `INSERT ... ON CONFLICT DO NOTHING` + `SELECT`

### 4b. Atomic move submission (RPC)
```sql
CREATE FUNCTION submit_move(
  p_game_id UUID,
  p_player_id UUID,
  p_move JSONB,
  p_new_state JSONB,
  p_next_turn UUID,
  p_winner UUID DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO game_moves (game_id, player_id, move_data)
  VALUES (p_game_id, p_player_id, p_move);

  UPDATE games
  SET state = p_new_state,
      current_turn = p_next_turn,
      winner = p_winner,
      updated_at = now()
  WHERE id = p_game_id;
END;
$$ LANGUAGE plpgsql;
```

### 4c. Atomic ready toggle (RPC)
```sql
CREATE FUNCTION set_player_ready(p_game_id UUID, p_user_id UUID)
RETURNS jsonb AS $$
  UPDATE games
  SET state = jsonb_set(
    state,
    ARRAY['ready', p_user_id::text],
    'true'::jsonb
  ),
  updated_at = now()
  WHERE id = p_game_id
  RETURNING state->'ready';
$$ LANGUAGE sql;
```

### 4d. Row-Level Security (RLS)
- **games:** Players can only `SELECT`/`UPDATE` rows where `player1_id = auth.uid() OR player2_id = auth.uid()`
- **game_moves:** Players can only `INSERT` where `player_id = auth.uid()`, `SELECT` where they're a participant in the parent game
- **challenges:** Users can only `INSERT` where `challenger_id = auth.uid()`, `UPDATE` (accept/decline) where `challenged_id = auth.uid()`
- **Enable RLS on all tables** — currently disabled, meaning any authenticated user can read/write any row

### 4e. Optimistic locking (optional, recommended)
```sql
-- Add version column
ALTER TABLE games ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Update only if version matches
UPDATE games SET state = $1, version = version + 1
WHERE id = $2 AND version = $3;
```
- If 0 rows affected → conflict detected → re-read and retry
- Prevents silent overwrites from stale reads

---

## Priority Order

1. **Atomic ready toggle** (RPC) — fixes stuck lobbies, easiest win
2. **Unique constraint on games** — fixes duplicate game rows
3. **Atomic move submission** (RPC) — fixes data loss on partial failures
4. **Replace location.state** — fixes refresh crashes
5. **Enable RLS** — fixes security (any user can modify any game)
6. **Realtime subscription** — performance improvement, not a bug fix
7. **submitMove turn logic** — code quality, not a runtime bug currently
