# DBA deployment (live Supabase: `maqjhjvgfvomslktfznz`)

## Before frontend merge

1. Run `verify_profiles_lat_lng.sql` in the SQL editor and confirm `latitude` / `longitude` exist on `public.profiles`.
2. Deploy `get_discovery_profiles.sql` (creates `get_discovery_profiles` RPC).
3. Confirm `GRANT EXECUTE` for `authenticated` succeeded.
4. Tell the team the RPC is live so the frontend can call `get_discovery_profiles`.

Per project rules, do not merge frontend changes that rely on this RPC until step 2–4 are confirmed on production.

## Hangman RPCs (`hangman_rpcs.sql`)

1. Run `hangman_rpcs.sql` in the Supabase SQL Editor for project `maqjhjvgfvomslktfznz`.
2. Confirm `hangman_submit_setup` and `hangman_submit_guess` exist and `GRANT EXECUTE` to `authenticated` succeeded.
3. **Do not merge** frontend changes that call these RPCs until DBA confirms they are live on production.
