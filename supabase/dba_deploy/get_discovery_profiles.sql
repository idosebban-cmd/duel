-- DBA DEPLOYMENT REQUIRED — Live Supabase (project ref: maqjhjvgfvomslktfznz)
-- Deploy before frontend calls get_discovery_profiles.

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
) IS 'Distance-filtered discover list; excludes null lat/lng candidates and outgoing swipes.';

GRANT EXECUTE ON FUNCTION public.get_discovery_profiles(
  uuid, double precision, double precision, double precision, text, integer, integer, text
) TO authenticated;
