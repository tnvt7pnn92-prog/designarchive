-- Identify with a price range, in place of the buying guide (October 2026).
--
-- 1. The plans: the feature "guide" becomes "price" (wide | full: Identify's estimate) and
--    "measures" (none | full: the real measurements behind the room's real proportions).
-- 2. buying_guide stays (its signs are now public on the site; its measurements remain for the
--    plans with "measures"): only its reading rule changes.
-- 3. price_bases: the sourced price bands of each piece. No policy at all: only the server
--    functions (service role) read it, and they return one piece's range at a time — the bases
--    cannot be downloaded in bulk.
-- Nothing here deletes data.

update public.plan_limits
set features = (features - 'guide')
  || jsonb_build_object(
       'price', case when features ->> 'guide' = 'full' then 'full' else 'wide' end,
       'measures', case when features ->> 'guide' = 'full' then 'full' else 'none' end
     )
where features ? 'guide';

drop policy if exists "complete guide for plans that include it" on public.buying_guide;
create policy "measurements for plans that include them" on public.buying_guide for select
  using (public.plan_feature(auth.uid(), 'measures') = 'full');

create table if not exists public.price_bases (
  piece_id text primary key,
  base jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.price_bases enable row level security;
revoke all on public.price_bases from anon, authenticated;
