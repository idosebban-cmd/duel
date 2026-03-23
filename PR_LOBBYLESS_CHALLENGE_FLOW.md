# PR draft — copy into GitHub

**Base:** `main`  
**Compare:** `feat/lobbyless-challenge-flow`

---

## Title (copy this)

    feat: Lobbyless challenge flow, title/no-show UX, RLS on all tables

---

## Description (copy everything below this line into the PR body)

## Summary

Implements the **lobbyless challenge flow** for multiplayer **Guess Who**, **Connect Four**, **Draughts**, and **Battleship** (Word Blitz & Dot Dash unchanged). Removes the Guess Who lobby; adds shared **GameTitleCard** + **useNoShowGuard**; app-level challenge handling; Battleship placement feedback; documentation and SQL artifacts for **RLS on all 9 tables** (applied/verified on live DB).

## What’s included

### Challenge & navigation
- **`challengeGameFlow`** (`prepareAcceptedChallenge`: `createOrJoinGame` → `initialise_game`) shared by **`App.tsx`** (listener) and **`MatchScreen.tsx`** (accept).
- **App-level realtime** on `challenges` for outgoing challenges: success toast (deduped), error + retry, **Join game** = navigation only.
- **Removed** `LobbyScreen.tsx` and Guess Who `/game/:id/lobby` route; **GamePicker** / **GameSetup** updated to avoid lobby URLs.

### Game boards (4 titles)
- **`GameTitleCard`** 3s overlay; **`useNoShowGuard`** (30s / 60s / 120s) with **`opponentActivityTick`** from **`useMultiplayerGame`**.
- **Guess Who** (`GameBoard`): secret insert retries, failure banner + Leave → `abandon_game`.
- **Battleship**: placement “waiting for opponent” overlay; **← Games** during placement → `abandonGame` then navigate to `/match/:matchId` (fallback `/matches`).

### Database & RLS
- **`database.ts`**: `initializeGame` via `initialise_game` RPC; **`markMessagesRead`** uses `mark_messages_read` RPC (match-member RLS).
- **`supabase/phase8_rls_rollout/`**: ordered SQL for **profiles → photos → swipes → game_secrets → matches → challenges → messages → games → moves** (incl. **`messages_update_match_member`**).
- Docs: **`DATABASE_AUTHORITY.md`**, **`CLAUDE.md`**, Phase 9 checklist; design spec under `docs/superpowers/specs/`.

### Tests & cleanup
- **E2E** (`game-flow.spec.ts`): lobbyless `/play` routes; legacy lobby deep-link expectations updated.

## Reviewer notes

- **Not merging from automation** — review and merge manually.
- After merge: confirm **Netlify** deploy hash vs `main`, then QA on **playduel.app**.

---

## Push & open PR (run locally)

```bash
git push -u origin feat/lobbyless-challenge-flow
```

Compare URL (opens “Open a pull request” when the branch exists on the remote):

https://github.com/idosebban-cmd/duel/compare/main...feat/lobbyless-challenge-flow?expand=1

**Branch:** `feat/lobbyless-challenge-flow` — run `git log -1 --oneline` after push to confirm tip.
