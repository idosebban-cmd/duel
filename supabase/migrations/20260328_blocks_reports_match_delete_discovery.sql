-- Blocks & reports (App Store safety), match delete for block flow, discovery RPC update.
-- Deploy to live Supabase (project maqjhjvgfvomslktfznz) before relying on the app.

-- ─── blocks ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON public.blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON public.blocks (blocked_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocks_insert_own" ON public.blocks;
DROP POLICY IF EXISTS "blocks_select_own" ON public.blocks;
DROP POLICY IF EXISTS "blocks_select_if_involved" ON public.blocks;
DROP POLICY IF EXISTS "blocks_delete_own" ON public.blocks;

CREATE POLICY "blocks_insert_own"
  ON public.blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

-- Bidirectional discovery: either party can read the row (no extra columns exposed).
CREATE POLICY "blocks_select_if_involved"
  ON public.blocks FOR SELECT
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "blocks_delete_own"
  ON public.blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- ─── reports ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN (
    'Inappropriate content',
    'Harassment or abuse',
    'Fake profile or impersonation',
    'Underage user',
    'Spam'
  )),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (reporter_id <> reported_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_id ON public.reports (reported_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;

CREATE POLICY "reports_insert_own"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- ─── matches: allow participants to delete (e.g. after block) ───────────────
DROP POLICY IF EXISTS "matches_delete_participant" ON public.matches;

CREATE POLICY "matches_delete_participant"
  ON public.matches FOR DELETE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- ─── get_discovery_profiles: exclude blocked users both ways ────────────────
CREATE OR REPLACE FUNCTION public.get_discovery_profiles(
  caller_id uuid,
  caller_lat double precision,
  caller_lng double precision,
  max_distance_km double precision,
  intent_filter text,
  min_age integer,
  max_age integer,
  gender_filter text
)
RETURNS SETOF profiles
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.profiles p
  WHERE p.id <> caller_id
    AND p.name IS NOT NULL
    AND p.age IS NOT NULL
    AND p.character IS NOT NULL
    AND p.age >= min_age
    AND p.age <= max_age
    AND (
      gender_filter IS NULL
      OR trim(gender_filter) = ''
      OR p.gender = gender_filter
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.swipes s
      WHERE s.from_user = caller_id
        AND s.to_user = p.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.blocks b
      WHERE (b.blocker_id = caller_id AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id AND b.blocked_id = caller_id)
    )
    AND (
      (intent_filter = 'play' AND p.intent IN ('play', 'both'))
      OR (intent_filter = 'romance' AND p.intent IN ('romance', 'both'))
      OR (intent_filter = 'all')
    )
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND (
      6371.0 * acos(
        GREATEST(
          -1.0::double precision,
          LEAST(
            1.0::double precision,
            cos(radians(caller_lat))
              * cos(radians(p.latitude::double precision))
              * cos(radians(p.longitude::double precision) - radians(caller_lng))
            + sin(radians(caller_lat)) * sin(radians(p.latitude::double precision))
          )
        )
      )
    ) <= max_distance_km
  ORDER BY p.created_at DESC
  LIMIT 100;
$$;

COMMENT ON FUNCTION public.get_discovery_profiles(
  uuid, double precision, double precision, double precision, text, integer, integer, text
) IS 'Distance-filtered discover list; excludes swipes, mutual blocks, null lat/lng.';

GRANT EXECUTE ON FUNCTION public.get_discovery_profiles(
  uuid, double precision, double precision, double precision, text, integer, integer, text
) TO authenticated;
