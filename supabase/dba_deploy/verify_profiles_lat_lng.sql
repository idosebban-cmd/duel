-- Run against LIVE Supabase (read-only verification).
-- Expected: two rows for latitude and longitude on public.profiles.

SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('latitude', 'longitude')
ORDER BY column_name;
