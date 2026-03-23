-- Phase 8 — After all 9 tables: final verification (design doc)

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles','photos','swipes','game_secrets','matches','challenges','messages','games','moves')
ORDER BY tablename;

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles','photos','swipes','game_secrets','matches','challenges','messages','games','moves')
ORDER BY tablename, policyname;
