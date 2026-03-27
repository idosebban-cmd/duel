-- Permanently delete the currently authenticated user's account and related data.
-- IMPORTANT: This function is SECURITY DEFINER and deletes from auth.users.

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- 1) messages where room_id belongs to my matches
  delete from public.messages
  where room_id in (
    select id
    from public.matches
    where user_a = v_uid or user_b = v_uid
  );

  -- Extra cleanup for related tables
  delete from public.challenges
  where match_id in (
    select id
    from public.matches
    where user_a = v_uid or user_b = v_uid
  )
  or from_user = v_uid
  or to_user = v_uid;

  delete from public.moves
  where game_id in (
    select id
    from public.games
    where player1_id = v_uid or player2_id = v_uid
  );

  delete from public.game_secrets
  where player_id = v_uid
     or game_id in (
       select id
       from public.games
       where player1_id = v_uid or player2_id = v_uid
     );

  delete from public.photos
  where user_id = v_uid;

  delete from public.swipes
  where from_user = v_uid or to_user = v_uid;

  -- 2) games involving the user
  delete from public.games
  where player1_id = v_uid or player2_id = v_uid;

  -- 3) matches involving the user
  delete from public.matches
  where user_a = v_uid or user_b = v_uid;

  -- 4) profile
  delete from public.profiles
  where id = v_uid;

  -- 5) auth user row
  delete from auth.users
  where id = v_uid;
end;
$$;

