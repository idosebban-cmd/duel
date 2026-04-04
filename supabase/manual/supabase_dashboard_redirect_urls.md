# Supabase Dashboard: allowed redirect URLs (manual)

Project: `maqjhjvgfvomslktfznz`.

In **Authentication → URL configuration → Redirect URLs**, add every URL the app sends as `emailRedirectTo`, `redirectTo` (OAuth), or password reset, including:

- `app.playduel://`
- `app.playduel:///onboarding/create-account` (OAuth return on native)
- `app.playduel:///login` (password reset on native)

Keep existing web entries such as `https://playduel.app/**` or path-specific URLs as needed.

Without these entries, Supabase will reject native deep-link redirects and email confirmation will not return to the app.
