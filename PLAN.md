# Lobbyless Flow — Implementation Plan (v2)

## Current State (post-merge from main)

Main already has:
- `WaitingForOpponentOverlay` on all 5 game boards (blocks play until `bothPresent`)
- `LeaveGameDialog` + `OpponentLeftOverlay` on all game boards
- `useMultiplayerGame` hook with `bothPresent`, `opponentLeft`, Realtime subscriptions
- `setPlayerPresent` RPC called automatically by the hook on mount
- `abandonGame` RPC wired up via `LeaveGameDialog`
- `initialState` parameter removed from `createOrJoinGame` (now hardcoded `{ ready: {} }`)

**What's left:** Change navigation to skip the lobby. Move game_secrets insertion.
Add `initialiseGame` RPC call. Delete lobby files.

---

## File-by-File Changes

### 1. `src/lib/database.ts`

**A. Add `initialiseGame` wrapper (after line 786, after `setPlayerPresent`)**

```ts
/** Call the initialise_game RPC after game creation. */
export async function initialiseGame(gameId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('initialise_game', { p_game_id: gameId });
    if (error) console.error('[initialiseGame]', error.message);
  } catch (err) {
    console.error('[initialiseGame] threw:', err);
  }
}
```

**B. Delete `updateGameReady` (lines 677–690)**

Frontend stops calling `set_player_ready`. Function body removed.
Import in LobbyScreen goes away with the file deletion.

---

### 2. `src/lib/gameConstants.ts`

**Add `GAME_ROUTES` mapping (after line 12)**

Centralise the game-type → route mapping used by LobbyScreen's
`handleCountdownComplete` (lines 241–261) so MatchScreen, GamePicker,
and GameSetup can all share it:

```ts
export function gameRoute(matchId: string, gameType: string): string {
  switch (gameType) {
    case 'word_blitz':    return `/games/word-blitz/${matchId}`;
    case 'draughts':      return `/games/draughts/${matchId}`;
    case 'connect_four':  return `/games/connect-four/${matchId}`;
    case 'battleship':    return `/games/battleship/${matchId}`;
    case 'dot_dash':      return `/dotdash/${matchId}/play`;
    default:              return `/game/${matchId}/play`;  // guess_who
  }
}
```

---

### 3. `src/pages/MatchScreen.tsx`

All four navigate-to-lobby call sites must change to navigate-to-game-board.

**A. Add imports (line 6–17 area)**

Add: `initialiseGame` from `../lib/database`
Add: `gameRoute` from `../lib/gameConstants`

**B. Realtime challenge listener (line 275)**

```
Current:  navigate(`/game/${updated.match_id}/lobby?type=${updated.game_type}`);
New:      navigate(gameRoute(updated.match_id, updated.game_type));
```

Also call `initialiseGame` — but this happens in a realtime callback where
the game may not exist yet. Safer to let the game board's `useMultiplayerGame`
create the game, then `initialiseGame` is called from there (see §5).
Just change navigation.

**C. Realtime accepted-challenge detection (line 303)**

```
Current:  navigate(`/game/${accepted.match_id}/lobby?type=${accepted.game_type}`);
New:      navigate(gameRoute(accepted.match_id, accepted.game_type));
```

**D. Polling accepted-challenge detection (line 326)**

```
Current:  navigate(`/game/${accepted.match_id}/lobby?type=${accepted.game_type}`);
New:      navigate(gameRoute(accepted.match_id, accepted.game_type));
```

**E. `handleAccept` (line 351)**

```
Current:  navigate(`/game/${c.match_id}/lobby?type=${c.game_type}`);
New:      navigate(gameRoute(c.match_id, c.game_type));
```

---

### 4. `src/pages/game/GamePicker.tsx`

**A. Mutual-match navigation (line 106)**

Add import: `gameRoute` from `../../lib/gameConstants`

```
Current:  navigate(`/game/${matchId}/lobby?type=${game.id}`);
New:      navigate(gameRoute(matchId, game.id));
```

---

### 5. `src/lib/useMultiplayerGame.ts`

**Add `initialiseGame` call after game creation (after line 127)**

Import `initialiseGame` from `./database` (add to line 15–21 imports).

After `setGameRow(row)` at line 127, add:

```ts
// Signal server to initialise the game
initialiseGame(row.id);
```

Fire-and-forget. Both players call it; the RPC is idempotent.
This covers all entry paths (handleAccept, GamePicker mutual, game board mount).

---

### 6. `src/pages/game/GameBoard.tsx` (Guess Who)

**A. Add game_secrets insertion on mount (after existing `getMySecret` effect, line 137)**

Add imports at line 14: `insertGameSecret` from `../../lib/database`

```ts
// Insert my secret character into game_secrets (idempotent upsert)
useEffect(() => {
  if (!mp.gameId || !matchId || mySecretId) return;
  let cancelled = false;
  (async () => {
    const board = boardRef.current;
    if (!board) return;
    const isPlayer1 = mp.myRole === 'player1';
    const mySecretCharId = isPlayer1 ? board.p1SecretId : board.p2SecretId;
    const ok = await insertGameSecret(mp.gameId!, myUserId, mySecretCharId);
    if (!cancelled && ok) {
      const charId = await getMySecret(mp.gameId!);
      if (!cancelled && charId) setMySecretId(charId);
    }
  })();
  return () => { cancelled = true; };
}, [mp.gameId, matchId, mp.myRole, myUserId, mySecretId]);
```

The `WaitingForOpponentOverlay` already blocks gameplay until `bothPresent`,
so both players have time to insert their secret before any guessing starts.

---

### 7. `src/pages/game/GameSetup.tsx`

**A. Change navigation (line 70)**

Add import: `gameRoute` from `../../lib/gameConstants`

```
Current:  navigate(`/game/${data.gameId}/lobby?type=guess_who`);
New:      navigate(gameRoute(data.gameId, 'guess_who'));
```

**B. Change navigation (line 101)**

```
Current:  navigate(`/game/${gameId.trim()}/lobby?type=guess_who`);
New:      navigate(gameRoute(gameId.trim(), 'guess_who'));
```

---

### 8. `src/pages/game/DotDashSetup.tsx`

**A. Change navigation (line 53)**

Add import: `gameRoute` from `../../lib/gameConstants`

```
Current:  navigate(`/dotdash/${data.gameId}/lobby?type=dot_dash`);
New:      navigate(gameRoute(data.gameId, 'dot_dash'));
```

**B. Change navigation (line 75)**

```
Current:  navigate(`/dotdash/${gameId.trim()}/lobby?type=dot_dash`);
New:      navigate(gameRoute(gameId.trim(), 'dot_dash'));
```

---

### 9. `src/App.tsx`

**A. Delete lobby routes (lines 111, 133)**

Remove:
```tsx
<Route path="/game/:gameId/lobby" element={<ProtectedRoute><LobbyScreen /></ProtectedRoute>} />
<Route path="/dotdash/:gameId/lobby" element={<ProtectedRoute><DotDashLobby /></ProtectedRoute>} />
```

**B. Remove LobbyScreen import** from imports at the top.
**C. Remove DotDashLobby import** if it has a separate import.

---

### 10. Delete files

**A. `src/pages/game/LobbyScreen.tsx`** — entire file deleted.

**B. `src/pages/game/DotDashLobby.tsx`** — delete if it exists as a separate file
(App.tsx line 133 references it).

---

## Files NOT changed

| File | Why |
|------|-----|
| `useMultiplayerGame.ts` (beyond §5) | Already handles game creation, presence, Realtime |
| All 5 game board files (beyond GameBoard §6) | Already have `WaitingForOpponentOverlay`, `LeaveGameDialog`, `OpponentLeftOverlay`, `bothPresent` gating |
| `database.ts` (beyond §1) | `createOrJoinGame`, `insertGameSecret`, `setPlayerPresent`, `abandonGame` all unchanged |
| `MultiplayerOverlays.tsx` | Already complete |
| `gameStore.ts` | No changes needed |
| Result screens | No changes needed |

---

## RLS notes

- `games_insert_player` policy: keep `player1_id OR player2_id` (not tightened)
- `matches_insert_participant` policy: tighten to `auth.uid() = user_a`
- Re-enable order (post-implementation): profiles → photos → swipes → game_secrets → matches → challenges → messages → games → moves

---

## Risk flags

1. **game_secrets timing (Guess Who):** Secret insertion now happens on GameBoard
   mount instead of lobby. The `WaitingForOpponentOverlay` blocks gameplay until
   `bothPresent`, giving both players time to insert secrets. If a player
   guesses before opponent's secret exists, `check_guess` raises "Opponent secret
   not found" — but this can't happen because `bothPresent` must be true first.

2. **Double `createOrJoinGame`:** Both `handleAccept` path and `useMultiplayerGame`
   hook may call it. Safe — `uq_games_match_type_active` prevents duplicates.

3. **`initialiseGame` failure:** Fire-and-forget from `useMultiplayerGame`.
   Both players call it; second call is a no-op. If both fail, game stays
   in un-initialised state — needs monitoring.

4. **Stale lobby URLs:** Anyone with a bookmarked `/game/:id/lobby` URL
   will 404. Low risk — lobbies are transient, not bookmarked.
