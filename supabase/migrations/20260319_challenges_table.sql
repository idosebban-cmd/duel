-- Reference migration for the challenges table (already exists in live DB)
CREATE TABLE IF NOT EXISTS challenges (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id   uuid NOT NULL REFERENCES matches(id),
  from_user  uuid NOT NULL REFERENCES profiles(id),
  to_user    uuid NOT NULL REFERENCES profiles(id),
  game_type  text NOT NULL,
  status     text NOT NULL DEFAULT 'pending',
  expires_at  timestamptz,
  created_at  timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_challenges_match_id ON challenges(match_id);
CREATE INDEX IF NOT EXISTS idx_challenges_to_user_status ON challenges(to_user, status);
