-- Diagnostic test trigger — run in Supabase SQL editor to confirm pg_net fires
-- on real match inserts. Replace placeholders before running.
--
-- After running, insert a match and then check:
--   SELECT * FROM net._http_response ORDER BY created DESC LIMIT 5;
--
-- You should see a row with the request. If the Render server is up,
-- status_code will be 200. If not, you'll see a connection error.
--
-- Replace:
--   __RENDER_SERVER_URL__  → e.g. https://duel-fast.onrender.com
--   __WEBHOOK_SECRET__     → same secret as in Render env vars

-- ═══════════════════════════════════════════════════════════════════════════════
-- Step 1: Verify pg_net is working with a standalone call (no trigger)
-- Run this and then check net._http_response for the result.
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT net.http_post(
  url     := '__RENDER_SERVER_URL__/api/notify/match-created',
  body    := '{"type":"INSERT","record":{"id":"00000000-0000-0000-0000-000000000000","user_a":"00000000-0000-0000-0000-000000000001","user_b":"00000000-0000-0000-0000-000000000002"}}'::jsonb,
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-webhook-secret', '__WEBHOOK_SECRET__'
  )
);

-- After running the above, wait a few seconds then run:
-- SELECT id, status_code, content, created FROM net._http_response ORDER BY created DESC LIMIT 5;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Step 2: Simple test trigger that logs a hardcoded ping on ANY matches insert
-- This helps isolate whether the trigger mechanism itself fires.
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.test_ping_on_match()
returns trigger language plpgsql security definer as $$
begin
  perform net.http_post(
    url     := '__RENDER_SERVER_URL__/health',
    body    := jsonb_build_object('test', true, 'match_id', NEW.id),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return NEW;
end;
$$;

drop trigger if exists trg_test_ping_match on public.matches;
create trigger trg_test_ping_match
  after insert on public.matches
  for each row
  execute function public.test_ping_on_match();

-- After creating the trigger, create a real match in the app (or INSERT manually),
-- then check:
--   SELECT id, status_code, content, created FROM net._http_response ORDER BY created DESC LIMIT 5;
--
-- If you see a row with status_code = 200 and content = '{"status":"ok",...}',
-- triggers are firing correctly.

-- ═══════════════════════════════════════════════════════════════════════════════
-- Cleanup: remove the test trigger when done
-- ═══════════════════════════════════════════════════════════════════════════════
-- drop trigger if exists trg_test_ping_match on public.matches;
-- drop function if exists public.test_ping_on_match();
