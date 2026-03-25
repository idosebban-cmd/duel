-- Client-updated activity timestamp for match-card presence (run on live DB before relying on last_seen).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen timestamptz;

COMMENT ON COLUMN public.profiles.last_seen IS 'Last time the user had an active app session (client-updated, throttled).';
