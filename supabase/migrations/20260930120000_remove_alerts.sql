-- The weekly "Looking for" alerts are gone: flea markets have no online inventory, so the site
-- cannot know which pieces will be there, and the feature promised more than it could keep.
--
-- Nothing in the database belonged only to the alerts except the `wishlistAlerts` flag of each
-- plan. The "Looking for" list itself (budget, notes) is untouched.
--
-- If the old function was already deployed, switch it off by hand (neither step is part of a
-- migration):
--   select cron.unschedule('wishlist-alerts');        -- SQL Editor, if the weekly job was scheduled
--   npx supabase functions delete wishlist-alerts     -- removes the deployed function

update public.plan_limits set features = features - 'wishlistAlerts';
