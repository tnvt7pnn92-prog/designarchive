-- No more plans, no more photo identification (October 2026).
--
-- The site has no subscriptions any more: every feature is open to everyone, and an account only
-- keeps the collection and the moodboards in step between devices. "Identify" is gone too, with
-- its price range. So:
--   1. every limit goes: the triggers on the collection and the moodboards, and the functions they
--      read (plan_limits, current_plan, plan_limit, plan_feature, entitlements, usage);
--   2. the functions that asked about the plan no longer do: a moodboard is always editable by its
--      owner, sharing needs only an account, the measurements are readable by everyone;
--   3. the tables of the subscriptions and of the identifications are dropped, with the private
--      bucket of the identification photos;
--   4. "download my data" no longer mentions them.
-- The collection, the moodboards, the shared links, the profiles and the buying guide stay as
-- they are.

-- 1. Limits ------------------------------------------------------------------------------------

drop trigger if exists collection_limit on public.collection;
drop trigger if exists moodboards_limit on public.moodboards;
drop trigger if exists favourites_limit on public.favourites;
drop trigger if exists wishlist_limit on public.wishlist;
drop function if exists public.enforce_collection_limit();
drop function if exists public.enforce_plan_limit();

-- 2. What no longer asks about the plan ---------------------------------------------------------

drop policy if exists "own editable moodboards can change" on public.moodboards;
create policy "own moodboards can change" on public.moodboards for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
drop function if exists public.moodboard_editable(uuid, uuid);

create or replace function public.share_moodboard(board uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  slug text;
begin
  if uid is null then raise exception 'not signed in'; end if;
  update moodboards
     set share_slug = coalesce(share_slug, translate(encode(gen_random_bytes(9), 'base64'), '+/', '-_')),
         preview_path = uid::text || '/' || board::text || '.png',
         updated_at = now()
   where id = board and user_id = uid
  returning share_slug into slug;
  if slug is null then raise exception 'not found'; end if;
  return slug;
end;
$$;

drop policy if exists "own shared pictures can be written" on storage.objects;
drop policy if exists "own shared pictures can be replaced" on storage.objects;
create policy "own shared pictures can be written" on storage.objects for insert
  with check (bucket_id = 'shared-boards' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own shared pictures can be replaced" on storage.objects for update
  using (bucket_id = 'shared-boards' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "measurements for plans that include them" on public.buying_guide;
drop policy if exists "complete guide for plans that include it" on public.buying_guide;
create policy "the guide is readable by everyone" on public.buying_guide for select using (true);

-- 3. Plans, usage, identifications --------------------------------------------------------------

drop function if exists public.entitlements();
drop function if exists public.consume_usage(text, text, text, integer);
drop function if exists public.refund_usage(text, text, text);
drop function if exists public.plan_feature(uuid, text);
drop function if exists public.plan_limit(uuid, text);
drop function if exists public.current_plan(uuid);
drop function if exists public.my_identifications();

drop table if exists public.usage;
drop table if exists public.subscriptions;
drop table if exists public.plan_limits;
drop table if exists public.stripe_events;
drop view if exists public.ai_costs_daily;
drop table if exists public.ai_costs;
drop table if exists public.identification_feedback;
drop table if exists public.identifications;
drop table if exists public.price_bases;

drop policy if exists "own identification photos are readable" on storage.objects;
drop policy if exists "own identification photos can be deleted" on storage.objects;
delete from storage.objects where bucket_id = 'identifications';
delete from storage.buckets where id = 'identifications';

-- 4. "Download my data" -------------------------------------------------------------------------

create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'email', (select email from auth.users where id = auth.uid()),
    'profile', (select to_jsonb(p) from profiles p where p.id = auth.uid()),
    'collection', (select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]') from collection c where c.user_id = auth.uid()),
    'moodboards', (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]') from moodboards m where m.user_id = auth.uid()),
    'moodboard_library', (select to_jsonb(l) from moodboard_library l where l.user_id = auth.uid())
  );
$$;
