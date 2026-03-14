-- Add intent column to profiles for the "Just Play" feature.
-- Safe: IF NOT EXISTS prevents errors on re-run; DEFAULT 'romance' means
-- every existing user keeps their current behaviour unchanged.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS intent TEXT DEFAULT 'romance'
  CHECK (intent IN ('romance', 'play', 'both'));
