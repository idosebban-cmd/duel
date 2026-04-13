-- Push notification webhooks — apply manually in the Supabase SQL editor.
--
-- Prerequisites:
--   1. pg_net extension enabled (Dashboard → Database → Extensions → enable pg_net)
--   2. RENDER_SERVER_URL = your Render server URL (e.g. https://duel-fast.onrender.com)
--   3. WEBHOOK_SECRET = shared secret set in both Supabase (below) and Render env vars
--
-- Replace the two placeholders below before running:
--   __RENDER_SERVER_URL__  → e.g. https://duel-fast.onrender.com
--   __WEBHOOK_SECRET__     → a random string you generate (set same value in Render dashboard)

-- Ensure pg_net is available (installs into the `net` schema by default on Supabase)
create extension if not exists pg_net with schema net;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. New match created → notify both users
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.notify_match_created()
returns trigger language plpgsql security definer as $$
begin
  perform net.http_post(
    url     := '__RENDER_SERVER_URL__/api/notify/match-created',
    body    := jsonb_build_object(
      'type', 'INSERT',
      'record', jsonb_build_object(
        'id', NEW.id,
        'user_a', NEW.user_a,
        'user_b', NEW.user_b
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '__WEBHOOK_SECRET__'
    )
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_match_created on public.matches;
create trigger trg_notify_match_created
  after insert on public.matches
  for each row
  execute function public.notify_match_created();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Turn changed in a game → notify the player whose turn it is
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.notify_turn_changed()
returns trigger language plpgsql security definer as $$
begin
  if OLD.current_turn is distinct from NEW.current_turn
     and NEW.winner is null
     and NEW.status in ('playing', 'pending')
  then
    perform net.http_post(
      url     := '__RENDER_SERVER_URL__/api/notify/turn-changed',
      body    := jsonb_build_object(
        'type', 'UPDATE',
        'record', jsonb_build_object(
          'id', NEW.id,
          'match_id', NEW.match_id,
          'game_type', NEW.game_type,
          'current_turn', NEW.current_turn,
          'player1_id', NEW.player1_id,
          'player2_id', NEW.player2_id,
          'status', NEW.status,
          'winner', NEW.winner
        ),
        'old_record', jsonb_build_object(
          'current_turn', OLD.current_turn
        )
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', '__WEBHOOK_SECRET__'
      )
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_turn_changed on public.games;
create trigger trg_notify_turn_changed
  after update on public.games
  for each row
  execute function public.notify_turn_changed();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. New chat message → notify the recipient
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.notify_chat_message()
returns trigger language plpgsql security definer as $$
begin
  perform net.http_post(
    url     := '__RENDER_SERVER_URL__/api/notify/chat-message',
    body    := jsonb_build_object(
      'type', 'INSERT',
      'record', jsonb_build_object(
        'id', NEW.id,
        'room_id', NEW.room_id,
        'sender', NEW.sender,
        'content', NEW.content
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '__WEBHOOK_SECRET__'
    )
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_chat_message on public.messages;
create trigger trg_notify_chat_message
  after insert on public.messages
  for each row
  execute function public.notify_chat_message();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Game challenge created → notify the challenged user
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.notify_challenge_created()
returns trigger language plpgsql security definer as $$
begin
  perform net.http_post(
    url     := 'https://duel-fast.onrender.com/api/notify/challenge-created',
    body    := jsonb_build_object(
      'type', 'INSERT',
      'record', jsonb_build_object(
        'id', NEW.id,
        'match_id', NEW.match_id,
        'from_user', NEW.from_user,
        'to_user', NEW.to_user,
        'game_type', NEW.game_type,
        'status', NEW.status
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '__WEBHOOK_SECRET__'
    )
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_challenge_created on public.challenges;
create trigger trg_notify_challenge_created
  after insert on public.challenges
  for each row
  execute function public.notify_challenge_created();
