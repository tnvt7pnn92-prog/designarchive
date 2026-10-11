-- Design Archive — accounts, sync, identifications, buying guide, subscriptions.
--
-- Every table has Row Level Security on: a signed-in person reads and changes only their own rows.
-- Tables written only by the server functions (usage, costs, Stripe events, subscriptions) have no
-- write policy at all: the browser cannot touch them, only the service role can.
-- Plan limits live in `plan_limits`, filled from src/lib/plans.js by `node scripts/sync-plans.mjs --push`
-- (the values below are the same, so a fresh database works straight away).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------------------------
-- Plans
-- ---------------------------------------------------------------------------------------------

create table public.plan_limits (
  plan text primary key check (plan in ('guest', 'free', 'pro', 'studio')),
  limits jsonb not null,
  features jsonb not null
);

insert into public.plan_limits (plan, limits, features) values
  ('guest', '{"identifyPerDay":1,"identifyPerMonth":null,"favourites":null,"moodboards":1,"wishlist":0,"identifyHistory":0}',
            '{"guide":"preview","wishlistAlerts":false,"shareMoodboards":false,"sync":false,"export":"watermark"}'),
  ('free',  '{"identifyPerDay":null,"identifyPerMonth":5,"favourites":50,"moodboards":1,"wishlist":10,"identifyHistory":5}',
            '{"guide":"preview","wishlistAlerts":false,"shareMoodboards":false,"sync":true,"export":"watermark"}'),
  ('pro',   '{"identifyPerDay":null,"identifyPerMonth":60,"favourites":null,"moodboards":null,"wishlist":null,"identifyHistory":null}',
            '{"guide":"full","wishlistAlerts":true,"shareMoodboards":true,"sync":true,"export":"hires"}'),
  ('studio','{"identifyPerDay":null,"identifyPerMonth":250,"favourites":null,"moodboards":null,"wishlist":null,"identifyHistory":null}',
            '{"guide":"full","wishlistAlerts":true,"shareMoodboards":true,"sync":true,"export":"studio"}');

alter table public.plan_limits enable row level security;
-- The limits are public information (they are on the pricing page).
create policy "plan limits are public" on public.plan_limits for select using (true);

-- ---------------------------------------------------------------------------------------------
-- Subscriptions (written only by the Stripe webhook)
-- ---------------------------------------------------------------------------------------------

create table public.subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free', 'pro', 'studio')),
  status text,                 -- Stripe's status: trialing, active, past_due, canceled, unpaid, incomplete…
  billing_interval text,       -- month | year
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  trial_used boolean not null default false,
  trial_reminder_sent boolean not null default false,
  grace_until timestamptz,     -- after a failed payment: 7 days before the plan lapses
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
create policy "own subscription is readable" on public.subscriptions for select using (user_id = auth.uid());

-- The plan in force for a person, now. Paid plans count while active or trialing, and for 7 days
-- after a failed payment; otherwise the free plan. Never deletes anything.
create or replace function public.current_plan(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select s.plan
    from subscriptions s
    where s.user_id = uid
      and s.plan in ('pro', 'studio')
      and (
        s.status in ('active', 'trialing')
        or (s.status in ('past_due', 'unpaid') and s.grace_until is not null and s.grace_until > now())
      )
      and (s.current_period_end is null or s.current_period_end > now() - interval '1 day')
  ), case when uid is null then 'guest' else 'free' end);
$$;

-- A numeric limit of the plan in force (null = unlimited).
create or replace function public.plan_limit(uid uuid, key text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (limits ->> key)::integer from plan_limits where plan = public.current_plan(uid);
$$;

create or replace function public.plan_feature(uid uuid, key text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select features ->> key from plan_limits where plan = public.current_plan(uid);
$$;

-- ---------------------------------------------------------------------------------------------
-- Usage counters (identifications per day / month). Written only through consume_usage().
-- ---------------------------------------------------------------------------------------------

create table public.usage (
  subject text not null,       -- a user id, or "guest:<hash of ip + device>"
  feature text not null,       -- identify
  period text not null,        -- YYYY-MM (monthly limits) or YYYY-MM-DD (daily limits)
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (subject, feature, period)
);

alter table public.usage enable row level security;
create policy "own usage is readable" on public.usage for select using (subject = auth.uid()::text);

-- Counts one use if it fits under the limit (null = unlimited). Returns the new count, or -1 when
-- the limit is reached. Atomic: two requests at once cannot both take the last slot.
create or replace function public.consume_usage(p_subject text, p_feature text, p_period text, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  result integer;
begin
  insert into usage (subject, feature, period, count)
  values (p_subject, p_feature, p_period, 0)
  on conflict (subject, feature, period) do nothing;

  update usage
     set count = count + 1, updated_at = now()
   where subject = p_subject and feature = p_feature and period = p_period
     and (p_limit is null or count < p_limit)
  returning count into result;

  return coalesce(result, -1);
end;
$$;

-- Gives a use back when the identification failed on our side.
create or replace function public.refund_usage(p_subject text, p_feature text, p_period text)
returns void
language sql
security definer
set search_path = public
as $$
  update usage set count = greatest(count - 1, 0), updated_at = now()
   where subject = p_subject and feature = p_feature and period = p_period;
$$;

revoke execute on function public.consume_usage(text, text, text, integer) from public, anon, authenticated;
revoke execute on function public.refund_usage(text, text, text) from public, anon, authenticated;

-- What the signed-in person's plan allows, for the site to decide what to show.
create or replace function public.entitlements()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'plan', public.current_plan(auth.uid()),
    'status', s.status,
    'period_end', s.current_period_end,
    'cancel_at_period_end', coalesce(s.cancel_at_period_end, false),
    'trial_end', s.trial_end,
    'usage', jsonb_build_object(
      'identify_month', coalesce((select count from usage where subject = auth.uid()::text and feature = 'identify' and period = to_char(now() at time zone 'utc', 'YYYY-MM')), 0),
      'identify_day', coalesce((select count from usage where subject = auth.uid()::text and feature = 'identify' and period = to_char(now() at time zone 'utc', 'YYYY-MM-DD')), 0)
    )
  )
  from (select 1) one
  left join subscriptions s on s.user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------------------------
-- The person's own collections (mirrors of the browser's, see src/lib/sync.js)
-- ---------------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '' check (char_length(name) <= 80),
  lang text check (lang in ('en', 'it', 'es', 'fr', 'zh')),
  city text not null default '' check (char_length(city) <= 80),
  role text check (role in ('enthusiast', 'homeowner', 'professional')),
  updated_at timestamptz not null default now()
);

create table public.favourites (
  user_id uuid not null references auth.users on delete cascade,
  piece_id text not null check (char_length(piece_id) between 1 and 120),
  created_at timestamptz not null default now(),
  primary key (user_id, piece_id)
);

create table public.wishlist (
  user_id uuid not null references auth.users on delete cascade,
  piece_id text not null check (char_length(piece_id) between 1 and 120),
  max_price integer check (max_price is null or max_price >= 0),
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, piece_id)
);

create table public.moodboards (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  title text not null default '' check (char_length(title) <= 80),
  content jsonb not null default '{}'::jsonb check (pg_column_size(content) < 5000000),
  share_slug text unique,
  preview_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index moodboards_user_idx on public.moodboards (user_id, created_at);

create table public.moodboard_library (
  user_id uuid primary key references auth.users on delete cascade,
  content jsonb not null default '{}'::jsonb check (pg_column_size(content) < 8000000),
  updated_at timestamptz not null default now()
);

create table public.quiz_state (
  user_id uuid primary key references auth.users on delete cascade,
  state jsonb not null default '{}'::jsonb check (pg_column_size(state) < 200000),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.favourites enable row level security;
alter table public.wishlist enable row level security;
alter table public.moodboards enable row level security;
alter table public.moodboard_library enable row level security;
alter table public.quiz_state enable row level security;

create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own favourites" on public.favourites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own wishlist" on public.wishlist for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own library" on public.moodboard_library for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own quiz" on public.quiz_state for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Moodboards past the plan's limit stay readable but cannot be changed: the oldest N are editable.
create or replace function public.moodboard_editable(board uuid, owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.plan_limit(owner, 'moodboards') is null then true
    else board in (
      select id from moodboards where user_id = owner
      order by created_at asc, id asc
      limit public.plan_limit(owner, 'moodboards')
    )
  end;
$$;

create policy "own moodboards are readable" on public.moodboards for select using (user_id = auth.uid());
create policy "own moodboards can be added" on public.moodboards for insert with check (user_id = auth.uid());
create policy "own editable moodboards can change" on public.moodboards for update
  using (user_id = auth.uid() and public.moodboard_editable(id, user_id))
  with check (user_id = auth.uid());
create policy "own moodboards can be deleted" on public.moodboards for delete using (user_id = auth.uid());

-- Limits on new rows (saved pieces, "Looking for", moodboards). A one-off import of what a guest
-- had saved sets app.importing and is never refused: nothing someone saved is thrown away.
create or replace function public.enforce_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lim integer;
  current_count integer;
  already boolean;
  key text := tg_argv[0];
begin
  if coalesce(current_setting('app.importing', true), '') = 'on' then
    return new;
  end if;
  -- An upsert of a row that already exists is an update, not a new row: never limited here.
  if tg_table_name = 'moodboards' then
    select exists (select 1 from moodboards where id = new.id) into already;
  else
    execute format('select exists (select 1 from %I where user_id = $1 and piece_id = $2)', tg_table_name)
      into already using new.user_id, new.piece_id;
  end if;
  if already then
    return new;
  end if;
  lim := public.plan_limit(new.user_id, key);
  if lim is null then
    return new;
  end if;
  execute format('select count(*) from %I where user_id = $1', tg_table_name) into current_count using new.user_id;
  if current_count >= lim then
    raise exception 'limit_reached: %', key using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger favourites_limit before insert on public.favourites
  for each row execute function public.enforce_plan_limit('favourites');
create trigger wishlist_limit before insert on public.wishlist
  for each row execute function public.enforce_plan_limit('wishlist');
create trigger moodboards_limit before insert on public.moodboards
  for each row execute function public.enforce_plan_limit('moodboards');

-- ---------------------------------------------------------------------------------------------
-- First sign-in: everything the browser held, merged in one call (see src/lib/sync.js)
-- ---------------------------------------------------------------------------------------------

create or replace function public.import_local_data(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  added_favourites integer := 0;
  added_wishlist integer := 0;
  added_boards integer := 0;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  perform set_config('app.importing', 'on', true);

  with rows as (
    select value #>> '{}' as piece_id from jsonb_array_elements(coalesce(payload -> 'favourites', '[]')) limit 2000
  ), inserted as (
    insert into favourites (user_id, piece_id)
    select uid, piece_id from rows where char_length(piece_id) between 1 and 120
    on conflict do nothing
    returning 1
  )
  select count(*) into added_favourites from inserted;

  with rows as (
    select * from jsonb_array_elements(coalesce(payload -> 'wishlist', '[]')) limit 1000
  ), inserted as (
    insert into wishlist (user_id, piece_id, max_price, notes, created_at, updated_at)
    select uid, value ->> 'id', nullif(value ->> 'maxPrice', '')::integer, left(coalesce(value ->> 'notes', ''), 500),
           coalesce((value ->> 'addedAt')::timestamptz, now()), coalesce((value ->> 'updatedAt')::timestamptz, now())
    from rows where char_length(value ->> 'id') between 1 and 120
    on conflict (user_id, piece_id) do update
      set max_price = excluded.max_price, notes = excluded.notes, updated_at = excluded.updated_at
      where excluded.updated_at > wishlist.updated_at
    returning (xmax = 0) as fresh
  )
  select count(*) filter (where fresh) into added_wishlist from inserted;

  with rows as (
    select * from jsonb_array_elements(coalesce(payload -> 'moodboards', '[]')) limit 200
  ), inserted as (
    insert into moodboards (id, user_id, title, content, created_at, updated_at)
    select (value ->> 'id')::uuid, uid, left(coalesce(value ->> 'title', ''), 80),
           jsonb_build_object('version', coalesce(value -> 'version', '3'::jsonb), 'background', value -> 'background', 'elements', coalesce(value -> 'elements', '[]'::jsonb)),
           coalesce((value ->> 'createdAt')::timestamptz, now()), coalesce((value ->> 'updatedAt')::timestamptz, now())
    from rows
    where value ->> 'id' ~ '^[0-9a-f-]{36}$'
    on conflict (id) do update
      set title = excluded.title, content = excluded.content, updated_at = excluded.updated_at
      where moodboards.user_id = uid and excluded.updated_at > moodboards.updated_at
    returning (xmax = 0) as fresh
  )
  select count(*) filter (where fresh) into added_boards from inserted;

  if payload ? 'library' then
    insert into moodboard_library (user_id, content) values (uid, payload -> 'library')
    on conflict (user_id) do update set content = excluded.content, updated_at = now();
  end if;

  if payload ? 'quiz' then
    insert into quiz_state (user_id, state) values (uid, payload -> 'quiz')
    on conflict (user_id) do update set state = excluded.state, updated_at = now();
  end if;

  if payload ? 'profile' then
    insert into profiles (id, name, lang, city, role)
    values (
      uid,
      left(coalesce(payload #>> '{profile,name}', ''), 80),
      nullif(payload #>> '{profile,lang}', ''),
      left(coalesce(payload #>> '{profile,city}', ''), 80),
      nullif(payload #>> '{profile,role}', '')
    )
    on conflict (id) do update
      set name = coalesce(nullif(excluded.name, ''), profiles.name),
          lang = coalesce(excluded.lang, profiles.lang),
          city = coalesce(nullif(excluded.city, ''), profiles.city),
          role = coalesce(excluded.role, profiles.role),
          updated_at = now();
  end if;

  return jsonb_build_object('favourites', added_favourites, 'wishlist', added_wishlist, 'moodboards', added_boards);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Sharing a moodboard by link (Pro and Studio)
-- ---------------------------------------------------------------------------------------------

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
  if coalesce(public.plan_feature(uid, 'shareMoodboards'), 'false') <> 'true' then
    raise exception 'limit_reached: share' using errcode = 'P0001';
  end if;
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

create or replace function public.unshare_moodboard(board uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update moodboards set share_slug = null where id = board and user_id = auth.uid();
$$;

-- What a public link shows: never the owner, only the title, date, picture and pieces.
create or replace function public.get_shared_moodboard(slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'title', m.title,
    'updated_at', m.updated_at,
    'preview_path', m.preview_path,
    'pieces', coalesce((
      select jsonb_agg(distinct el ->> 'objectId')
      from jsonb_array_elements(coalesce(m.content -> 'elements', '[]'::jsonb)) el
      where el ->> 'type' = 'photo' and el ? 'objectId'
    ), '[]'::jsonb)
  )
  from moodboards m
  where m.share_slug is not null and m.share_slug = slug;
$$;

grant execute on function public.get_shared_moodboard(text) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Identifications (written by the `identify` function; read and deleted by their owner)
-- ---------------------------------------------------------------------------------------------

create table public.identifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  result jsonb not null,
  photo_paths text[] not null default '{}',
  model text,
  created_at timestamptz not null default now()
);
create index identifications_user_idx on public.identifications (user_id, created_at desc);

alter table public.identifications enable row level security;
create policy "own identifications are readable" on public.identifications for select using (user_id = auth.uid());
create policy "own identifications can be deleted" on public.identifications for delete using (user_id = auth.uid());

-- The history as the plan allows it: the last N (null = all), with the total for "N more with Pro".
create or replace function public.my_identifications()
returns table (id uuid, result jsonb, photo_paths text[], created_at timestamptz, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.result, i.photo_paths, i.created_at, count(*) over () as total
  from identifications i
  where i.user_id = auth.uid()
  order by i.created_at desc
  limit coalesce(public.plan_limit(auth.uid(), 'identifyHistory'), 100000);
$$;

create table public.identification_feedback (
  id bigserial primary key,
  identification_id uuid references public.identifications on delete set null,
  user_id uuid references auth.users on delete set null,
  candidates text[] not null default '{}',
  correct_piece_id text,
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now()
);
alter table public.identification_feedback enable row level security;

-- What each call to the AI model cost, to keep an eye on it (server only).
create table public.ai_costs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  subject_kind text not null check (subject_kind in ('guest', 'user')),
  plan text,
  model text,
  input_tokens integer,
  output_tokens integer,
  cache_read_tokens integer,
  cache_write_tokens integer,
  images integer,
  cost_usd numeric(10, 5),
  duration_ms integer,
  ok boolean not null default true
);
alter table public.ai_costs enable row level security;

create view public.ai_costs_daily with (security_invoker = true) as
  select date_trunc('day', created_at)::date as day, subject_kind, count(*) as calls,
         round(sum(cost_usd), 4) as cost_usd, round(avg(cost_usd), 5) as avg_cost_usd
  from public.ai_costs group by 1, 2 order by 1 desc, 2;

-- Stripe events already handled, so a webhook delivered twice is applied once.
create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Buying guide: the complete version, readable only by plans that include it
-- ---------------------------------------------------------------------------------------------

create table public.buying_guide (
  piece_id text primary key,
  authenticity jsonb not null default '[]'::jsonb,
  prices jsonb not null default '[]'::jsonb,
  dimensions jsonb,
  in_production boolean,
  manufacturer_url text,
  updated_at timestamptz not null default now()
);
alter table public.buying_guide enable row level security;
create policy "complete guide for plans that include it" on public.buying_guide for select
  using (public.plan_feature(auth.uid(), 'guide') = 'full');

-- ---------------------------------------------------------------------------------------------
-- "Download my data"
-- ---------------------------------------------------------------------------------------------

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
    'favourites', (select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at), '[]') from favourites f where f.user_id = auth.uid()),
    'wishlist', (select coalesce(jsonb_agg(to_jsonb(w) order by w.created_at), '[]') from wishlist w where w.user_id = auth.uid()),
    'moodboards', (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]') from moodboards m where m.user_id = auth.uid()),
    'moodboard_library', (select to_jsonb(l) from moodboard_library l where l.user_id = auth.uid()),
    'quiz', (select to_jsonb(q) from quiz_state q where q.user_id = auth.uid()),
    'identifications', (select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at), '[]') from identifications i where i.user_id = auth.uid()),
    'subscription', (select to_jsonb(s) - 'stripe_customer_id' - 'stripe_subscription_id' from subscriptions s where s.user_id = auth.uid()),
    'usage', (select coalesce(jsonb_agg(to_jsonb(u)), '[]') from usage u where u.subject = auth.uid()::text)
  );
$$;

-- ---------------------------------------------------------------------------------------------
-- Storage: private identification photos, public pictures of shared moodboards
-- ---------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('identifications', 'identifications', false, 2097152, array['image/jpeg']),
       ('shared-boards', 'shared-boards', true, 8388608, array['image/png'])
on conflict (id) do nothing;

-- Identification photos: the owner can read and delete their own folder; only the server writes.
create policy "own identification photos are readable" on storage.objects for select
  using (bucket_id = 'identifications' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own identification photos can be deleted" on storage.objects for delete
  using (bucket_id = 'identifications' and (storage.foldername(name))[1] = auth.uid()::text);

-- Shared moodboard pictures: public to read (that is the point of a link); only plans with
-- sharing can write, and only in their own folder.
create policy "own shared pictures can be written" on storage.objects for insert
  with check (bucket_id = 'shared-boards' and (storage.foldername(name))[1] = auth.uid()::text
              and public.plan_feature(auth.uid(), 'shareMoodboards') = 'true');
create policy "own shared pictures can be replaced" on storage.objects for update
  using (bucket_id = 'shared-boards' and (storage.foldername(name))[1] = auth.uid()::text
         and public.plan_feature(auth.uid(), 'shareMoodboards') = 'true');
create policy "own shared pictures can be deleted" on storage.objects for delete
  using (bucket_id = 'shared-boards' and (storage.foldername(name))[1] = auth.uid()::text);
