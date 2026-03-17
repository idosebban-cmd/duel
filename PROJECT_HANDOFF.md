# Duel — Project Handoff Document

> **Last updated:** 2026-03-17
> **Repo:** `idosebban-cmd/duel`
> **Active branch:** `claude/explore-duel-app-qSTZJ`

---

## 1. Project Overview

**Duel** is a dating + gaming hybrid app. Users build profiles through a multi-step onboarding flow, discover matches via a swipe-based interface, and play competitive multiplayer games to deepen connections.

### Core Concept
- Users create profiles (name, age, gender, preferences, character avatars)
- Swipe-based discovery matches players (like/pass)
- 6 multiplayer games: Guess Who, Dot Dash, Word Blitz, Draughts, Connect Four, Battleship
- "Just Play" intent: users choose romance-only, play-only, or both
- 18 bot seed profiles for testing and fallback matchmaking

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19.2 + TypeScript 5.9 + Vite 7.3 |
| Styling | Tailwind CSS 3.4 (neon/arcade theme) |
| Animations | Framer Motion 12 |
| State | Zustand 5.0 (persisted) |
| Forms | React Hook Form 7.71 + Zod 4.3 |
| Routing | React Router DOM 7.13 |
| Real-time | Socket.io 4.8 (client) / 4.7 (server) |
| Backend | Node.js Express 4.18 |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Deployment | Render (primary), Netlify/Vercel fallbacks |

### Environment Variables

```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
VITE_SERVER_URL=<optional: game-server-url>
```

---

## 2. File Structure

```
duel/
├── src/
│   ├── main.tsx                    # React 19 entry point
│   ├── App.tsx                     # Router with 40+ routes
│   ├── index.css                   # Global neon styles
│   │
│   ├── store/
│   │   ├── authStore.ts            # Supabase auth session/user state
│   │   ├── onboardingStore.ts      # 11-step form persistence (localStorage)
│   │   ├── gameStore.ts            # Guess Who game state
│   │   └── dotDashStore.ts         # Dot Dash maze game state
│   │
│   ├── types/
│   │   ├── game.ts                 # Character, PlayerState, GamePhase enums
│   │   └── dotDash.ts              # Maze/direction types
│   │
│   ├── lib/
│   │   ├── supabase.ts             # Client init (returns null if env missing)
│   │   ├── database.ts             # ALL DB operations (~21KB)
│   │   ├── socket.ts               # Socket.io client factory
│   │   ├── useMultiplayerGame.ts   # Polling-based multiplayer hook (2.5s)
│   │   └── featureFlags.ts         # ENABLE_JUST_PLAY toggle
│   │
│   ├── utils/
│   │   ├── profileValidation.ts    # checkProfileCompleteness()
│   │   ├── assetMaps.ts            # Character/element/affiliation image maps
│   │   ├── wordList.ts             # Word Blitz word list (~30KB)
│   │   └── preloadImages.ts        # Preload PNGs on app init
│   │
│   ├── components/
│   │   ├── ProtectedRoute.tsx      # Auth guard (redirect to /login)
│   │   ├── ui/                     # Button, Input, ProgressBar, PageTransition, Icons
│   │   ├── game/                   # GuessModal, CharacterCard, CountdownScreen
│   │   └── onboarding/             # WelcomeScreen, AvatarSelection/, BasicsForm,
│   │                               # PhotoUpload, GameSelection, RelationshipGoals,
│   │                               # PreferencesStep, LifestyleQuestions, BioStep,
│   │                               # PromptsSelection, PlayerCardPreview
│   │
│   └── pages/
│       ├── LandingPage.tsx         # Public landing
│       ├── LoginScreen.tsx         # Supabase auth (sign-in/sign-up)
│       ├── DiscoverScreen.tsx      # Card swiper (~1826 lines)
│       ├── MatchesScreen.tsx       # List of matches + last message
│       ├── ChatScreen.tsx          # Direct messaging
│       ├── ProfileScreen.tsx       # Edit own profile (~1928 lines)
│       └── game/
│           ├── GamePicker.tsx      # 6 game options
│           ├── GameSetup.tsx       # Dev/demo game creation
│           ├── LobbyScreen.tsx     # Pre-game countdown
│           ├── GameBoard.tsx       # Guess Who gameplay
│           ├── GameResult.tsx      # Win/loss/draw
│           ├── WordBlitz.tsx       # Word grid game
│           ├── Draughts.tsx        # Checkers
│           ├── ConnectFour.tsx     # Grid drop game
│           ├── Battleship.tsx      # Ship placement + targeting
│           ├── DotDashSetup.tsx    # Maze game init
│           ├── DotDashLobby.tsx    # Maze lobby
│           ├── DotDashBoard.tsx    # Maze gameplay
│           └── DotDashResult.tsx   # Maze results
│
├── server/
│   ├── server.js                   # Express + Socket.io (PORT 3001)
│   ├── routes/                     # /api/games/*, /api/dotdash/*
│   ├── services/
│   │   ├── gameService.js          # In-memory game store
│   │   └── dotDashService.js       # Maze generation logic
│   └── handlers/                   # Socket event handlers
│
├── supabase/
│   ├── schema.sql                  # Full schema + RLS + triggers
│   └── migrations/
│       ├── 20260314_add_intent_column.sql
│       └── 20260315_seed_bot_profiles.sql
│
├── public/                         # Character/element/affiliation/game-icon PNGs
├── render.yaml                     # Primary deployment config
├── netlify.toml                    # Netlify fallback
├── vercel.json                     # Vercel fallback
├── vite.config.ts                  # Code splitting (vendor/motion/forms/ui)
└── tailwind.config.js              # Custom neon theme
```

---

## 3. Database Schema

All tables live in Supabase PostgreSQL with Row-Level Security enabled.

### profiles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | References auth.users |
| email | text NOT NULL | |
| name | text | |
| age | integer | |
| bio | text | |
| location | text | |
| gender | text | |
| interested_in | text | |
| birthday | text | |
| character | text | Avatar character |
| element | text | Avatar element |
| affiliation | text | Avatar affiliation |
| game_types | text[] | Default '{}' |
| favorite_games | text[] | Default '{}' |
| looking_for | text[] | Default '{}' |
| kids, drinking, smoking, cannabis, pets, exercise | text | Lifestyle (all optional) |
| intent | text | CHECK (romance\|play\|both), default 'romance' |
| preferred_age_min | integer | Default 18 |
| preferred_age_max | integer | Default 65 |
| preferred_distance | integer | null = anywhere |
| latitude | decimal(10,8) | |
| longitude | decimal(11,8) | |
| created_at | timestamptz | |
| updated_at | timestamptz | Auto-trigger |

**RLS:** All authenticated can read; only owner can insert/update.
**Index:** (latitude, longitude)

### photos
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid FK→profiles | |
| photo_url | text | URL in Supabase Storage |
| order | integer | Default 0 |
| created_at | timestamptz | |

**RLS:** All authenticated can read; owner can insert/update/delete.

### swipes
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK→profiles | |
| target_id | uuid FK→profiles | |
| action | text | CHECK (like\|pass) |
| created_at | timestamptz | |

**Unique constraint:** (user_id, target_id). **RLS:** Owner/target can read; owner can insert/update.

### matches
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_a | uuid FK→profiles | Always user_a < user_b |
| user_b | uuid FK→profiles | |
| matched_at | timestamptz | |
| game_selected | text | |

**Unique constraint:** (user_a, user_b). **RLS:** Both matched users can read/insert.

### games
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| match_id | uuid FK→matches | |
| game_type | text | |
| player1_id | uuid FK→auth.users | |
| player2_id | uuid FK→auth.users | |
| state | jsonb | Default '{}' |
| current_turn | uuid FK→auth.users | |
| winner | text | 'player1'\|'player2'\|'draw'\|null |
| created_at, updated_at | timestamptz | updated_at has auto-trigger |

**Index:** (match_id, game_type). **RLS:** Match members can select/insert/update.

### moves
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| game_id | uuid FK→games | |
| player_id | uuid FK→auth.users | |
| move_data | jsonb | |
| created_at | timestamptz | |

**Index:** (game_id, created_at). **RLS:** Match members can select; players insert own.

### messages
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| room_id | text | Match ID used as room |
| sender | uuid | |
| content | text | |
| delivered | boolean | |
| created_at | timestamptz | |
| metadata | jsonb | |

**Index:** (room_id, created_at). Messages table is referenced in code but may need manual setup.

### Storage bucket: "photos"
- Public read, authenticated upload (user folder), owner delete.

### Migration order
1. `supabase/schema.sql` — full schema
2. `supabase/migrations/20260314_add_intent_column.sql` — intent field
3. `supabase/migrations/20260315_seed_bot_profiles.sql` — 18 bot profiles

---

## 4. Patterns and Conventions

### State Management
- **Zustand** stores per domain: `authStore`, `onboardingStore`, `gameStore`, `dotDashStore`
- Onboarding persists to localStorage; photos use sessionStorage
- No Redux; shallow comparison for nested updates

### Component Patterns
- Functional components only, hooks-based
- Custom hook `useMultiplayerGame<S>()` for DB-polling multiplayer (2.5s interval)
- Page transitions via Framer Motion `<AnimatePresence>`

### Styling
- Tailwind utility-first with custom neon theme colors:
  - `hot-bubblegum` (#FF6BA8), `electric-mint` (#4EFFC4), `lemon-pop` (#FFE66D), `grape-neon` (#B565FF)
- Fonts: "Return Of The Boss" (display), "Balsamiq Sans" (body), "JetBrains Mono" (mono)
- Custom classes: `shadow-manga`, `rounded-card` (20px), `rounded-pill` (50px)
- Keyframes: float, pulseGlow, confettiFall, spin-slow

### Forms
- React Hook Form + Zod for validation
- Data flows through `onboardingStore` → `upsertProfile()` on completion
- Photos stored separately in storage bucket + photos table

### Naming Conventions
- Components: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Store actions: verb-based (`setUser`, `updateAvatar`, `recordSwipe`)
- DB functions: operation prefix (`get*`, `upsert*`, `record*`, `update*`, `submit*`)

### Error Handling
- Try-catch in all async DB calls
- Fire-and-forget for non-critical ops (passes, photo metadata)
- Retry once for critical ops (match insertion — see BUG 2 fix)
- Console logging with `[functionName]` prefix for errors

### Bot Profiles
- UUID prefix: `a0000000-0000-0000-0000-00000000` (18 bots, IDs `0001`–`0012`)
- Bot matches: 25% random chance, independent of DB success
- Intent distribution: 2 romance, 2 play, 2 both per gender pairing

---

## 5. Branch and Deployment Workflow

### Branch Strategy
- **Main branch:** `main` — merged PRs only
- **Development branches:** Must start with `claude/` and end with a session ID suffix
  - Current: `claude/explore-duel-app-qSTZJ`
- Push command: `git push -u origin claude/<branch-name>`
- Pushes to non-`claude/` branches will fail with 403

### PR Process
1. Develop and commit on the `claude/` branch
2. Push to origin
3. Create PR via `gh pr create` targeting `main`
4. PRs are merged from the GitHub UI

### Deployment
- **Primary:** Render (`render.yaml`)
  - Build: `npm install && npm run build && cd server && npm install`
  - Start: `node server/server.js`
  - Port: 10000
- **Fallback:** Netlify (static SPA), Vercel (SPA with rewrites)

### Build
```bash
npm run build    # tsc -b && vite build → dist/
npm run dev      # Vite HMR on :5173
npm run lint     # ESLint
cd server && npm run dev   # Game server on :3001
```

---

## 6. Current State

### Working
- Full onboarding flow (11 steps) with persistence
- Supabase auth (sign-up, sign-in, email confirmation bypass)
- Profile creation, editing, and viewing
- Discovery/swipe interface with filters (age, distance, gender, intent)
- Match detection (mutual likes + bot 25% match rate)
- Match persistence with retry logic (no phantom matches)
- Match list screen with profile previews
- Navigation between discovery, matches, games, profile
- All 6 game UIs render (Guess Who, Dot Dash, Word Blitz, Draughts, Connect Four, Battleship)
- Guess Who and Dot Dash have server-side game logic via Socket.io
- Photo upload to Supabase Storage
- Bot seed profiles (18 profiles across intents)
- Build passes cleanly (`tsc -b && vite build`)

### Known Incomplete / Broken
- **ChatScreen:** Schema exists but messaging UI is minimal/placeholder
- **Multiplayer polling:** 2.5s interval — not true real-time for DB-based games
- **Socket.io games:** Guess Who and Dot Dash use in-memory server state (lost on restart)
- **Word Blitz, Draughts, Connect Four, Battleship:** UI exists but multiplayer backend not wired
- **Photo management:** Relies on Supabase Storage bucket being set up; no graceful error UX if missing
- **Messages table:** Referenced in code but may require manual creation (see schema.sql comments)
- **No test suite:** No unit or integration tests configured
- **TypeScript strict mode:** Not enabled (`any` allowed)
- **DiscoverScreen / ProfileScreen:** Very large files (~1800+ lines each) — candidates for refactoring

---

## 7. Pending Tasks / Planned Work

- **Create PR** for the latest bug fixes on `claude/explore-duel-app-qSTZJ`
- Wire up real-time messaging in ChatScreen (Supabase Realtime subscriptions)
- Add multiplayer backend for Word Blitz, Draughts, Connect Four, Battleship
- Persist Socket.io game state to database (currently in-memory only)
- Add blocking/reporting functionality
- Performance: lazy-load images, virtualize long lists in DiscoverScreen
- Add test coverage (at least for database.ts and game logic)
- Consider splitting DiscoverScreen and ProfileScreen into smaller components

---

## 8. Key Lessons Learned / Gotchas

### Supabase Client
- `supabase.ts` returns `null` if env vars are missing — every call site must handle this
- Supabase query results are `PromiseLike`, not real `Promise` — using `.catch()` causes build errors. Always use `try/catch` with `await`
- RLS policies can silently return empty results if auth context is wrong — check `auth.uid()` matches

### Match Logic
- **Never return fake client-generated UUIDs** for matches. If the DB insert fails, the match won't appear on the Matches screen, creating phantom UI state. Always return `{ matched: false }` on failure.
- Match rows enforce `user_a < user_b` ordering — the insert logic must sort the IDs before upserting
- Bot match detection is independent of the swipe DB write — bots never "swipe back"

### Navigation
- **Don't use `window.history.back()`** in SPA — it navigates to the previous page in browser history, which might be a game result or external page. Use `navigate('/discover')` or explicit routes.

### Onboarding
- Onboarding data persists in localStorage via Zustand — clearing localStorage resets progress
- Photos are stored in sessionStorage (separate from Zustand) — they're lost on tab close
- Email confirmation flow: users can onboard before confirming email

### Build & Deploy
- `tsc -b` runs before Vite build — type errors block deployment
- Vite code-splits into vendor/motion/forms/ui chunks. The main chunk is large (~727KB) — consider further splitting
- Render deployment runs both frontend build and server install in one step

### Common Pitfalls
- Adding `async/await` around Supabase calls that return `PromiseLike` can cause subtle issues — always test the build after DB changes
- The `intent` column was added via migration — if running on a fresh DB, run migrations in order
- Bot profile UUIDs are hardcoded — don't change the `BOT_PREFIX` constant without updating the seed SQL
- Fire-and-forget patterns (swipe passes, photo metadata) intentionally skip `await` — don't "fix" these by adding error handling
