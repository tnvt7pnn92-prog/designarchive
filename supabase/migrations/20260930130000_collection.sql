-- The collection: one row per piece a person keeps, with one state at a time —
--   own    "I own it"
--   want   "Looking for" (top price, notes)
--   seen   "Seen" (where, when, notes)
--   saved  the heart
-- It replaces `favourites` and `wishlist`. Nothing is lost: their rows are copied here (a piece in
-- both lists becomes `want`, with its price and notes), and the two old tables stay, read-only,
-- for one release — a later migration drops them once this one has been checked.
--
-- Plan limits are unchanged: "Looking for" counts against `wishlist` (10 on the free plan), the
-- other three states share `favourites` (50 on the free plan).

create table public.collection (
  user_id uuid not null references auth.users on delete cascade,
  piece_id text not null check (char_length(piece_id) between 1 and 120),
  status text not null default 'saved' check (status in ('own', 'want', 'seen', 'saved')),
  max_price integer check (max_price is null or max_price >= 0),
  notes text not null default '' check (char_length(notes) <= 500),
  place text not null default '' check (char_length(place) <= 120),
  seen_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, piece_id)
);
create index collection_user_idx on public.collection (user_id, created_at desc);

alter table public.collection enable row level security;
create policy "own collection" on public.collection for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------------------------
-- The existing rows (before the limit trigger exists: what is already saved is never refused)
-- ---------------------------------------------------------------------------------------------

insert into public.collection (user_id, piece_id, status, created_at, updated_at)
select user_id, piece_id, 'saved', created_at, created_at
from public.favourites
on conflict (user_id, piece_id) do nothing;

insert into public.collection (user_id, piece_id, status, max_price, notes, created_at, updated_at)
select user_id, piece_id, 'want', max_price, notes, created_at, updated_at
from public.wishlist
on conflict (user_id, piece_id) do update
  set status = 'want', max_price = excluded.max_price, notes = excluded.notes,
      created_at = least(collection.created_at, excluded.created_at),
      updated_at = greatest(collection.updated_at, excluded.updated_at);

-- The old tables: readable by their owner (for "download my data" of an older session and for a
-- rollback), no longer writable from the browser, no longer limited.
drop trigger if exists favourites_limit on public.favourites;
drop trigger if exists wishlist_limit on public.wishlist;
drop policy if exists "own favourites" on public.favourites;
drop policy if exists "own wishlist" on public.wishlist;
create policy "own favourites are readable" on public.favourites for select using (user_id = auth.uid());
create policy "own wishlist is readable" on public.wishlist for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------------------------------
-- Plan limits: on a new row, and when a row moves between "Looking for" and the other states
-- ---------------------------------------------------------------------------------------------

create or replace function public.enforce_collection_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  key text := case when new.status = 'want' then 'wishlist' else 'favourites' end;
  old_status text;
  lim integer;
  current_count integer;
begin
  if coalesce(current_setting('app.importing', true), '') = 'on' then
    return new;
  end if;
  -- An upsert of a row that already exists arrives here as an insert: compare with the stored row.
  if tg_op = 'UPDATE' then
    old_status := old.status;
  else
    select status into old_status from collection where user_id = new.user_id and piece_id = new.piece_id;
  end if;
  -- Same group as before: not a new place in that group, never limited.
  if old_status is not null and (old_status = 'want') = (new.status = 'want') then
    return new;
  end if;
  lim := public.plan_limit(new.user_id, key);
  if lim is null then
    return new;
  end if;
  select count(*) into current_count
  from collection
  where user_id = new.user_id
    and piece_id <> new.piece_id
    and (status = 'want') = (new.status = 'want');
  if current_count >= lim then
    raise exception 'limit_reached: %', key using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger collection_limit before insert or update of status on public.collection
  for each row execute function public.enforce_collection_limit();

-- ---------------------------------------------------------------------------------------------
-- First sign-in: everything the browser held, merged in one call (see src/lib/sync.js)
-- ---------------------------------------------------------------------------------------------
-- Same function as before, with the collection in place of the two lists. A browser still running
-- the previous version of the site sends `favourites` and `wishlist`: they are read as `saved` and
-- `want`. (Anything else it sends, like the progress of the daily quiz the site no longer has,
-- is ignored.)

create or replace function public.import_local_data(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  added_collection integer := 0;
  added_boards integer := 0;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  perform set_config('app.importing', 'on', true);

  with incoming as (
    select value ->> 'id' as piece_id,
           case when value ->> 'status' in ('own', 'want', 'seen', 'saved') then value ->> 'status' else 'saved' end as status,
           nullif(value ->> 'maxPrice', '')::integer as max_price,
           left(coalesce(value ->> 'notes', ''), 500) as notes,
           left(coalesce(value ->> 'place', ''), 120) as place,
           nullif(value ->> 'seenOn', '')::date as seen_on,
           coalesce((value ->> 'addedAt')::timestamptz, now()) as created_at,
           coalesce((value ->> 'updatedAt')::timestamptz, now()) as updated_at,
           0 as bare
    from (select * from jsonb_array_elements(coalesce(payload -> 'collection', '[]')) limit 2000) items
    union all
    select value ->> 'id', 'want', nullif(value ->> 'maxPrice', '')::integer, left(coalesce(value ->> 'notes', ''), 500), '', null,
           coalesce((value ->> 'addedAt')::timestamptz, now()), coalesce((value ->> 'updatedAt')::timestamptz, now()), 0
    from (select * from jsonb_array_elements(coalesce(payload -> 'wishlist', '[]')) limit 1000) items
    union all
    -- A bare heart carries no date: it only ever adds a piece, it never changes one already here.
    select value #>> '{}', 'saved', null, '', '', null, now(), now(), 1
    from (select * from jsonb_array_elements(coalesce(payload -> 'favourites', '[]')) limit 2000) items
    where not exists (select 1 from collection c where c.user_id = uid and c.piece_id = value #>> '{}')
  ), rows as (
    -- One row per piece: a dated entry before a bare heart, then the most recently edited.
    select distinct on (piece_id) *
    from incoming
    where char_length(piece_id) between 1 and 120
    order by piece_id, bare, updated_at desc
  ), inserted as (
    insert into collection (user_id, piece_id, status, max_price, notes, place, seen_on, created_at, updated_at)
    select uid, piece_id, status, max_price, notes, place, seen_on, created_at, updated_at
    from rows
    on conflict (user_id, piece_id) do update
      set status = excluded.status, max_price = excluded.max_price, notes = excluded.notes,
          place = excluded.place, seen_on = excluded.seen_on, updated_at = excluded.updated_at
      where excluded.updated_at > collection.updated_at
    returning (xmax = 0) as fresh
  )
  select count(*) filter (where fresh) into added_collection from inserted;

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

  return jsonb_build_object('collection', added_collection, 'moodboards', added_boards);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- "Download my data": the collection in place of the two lists
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
    'collection', (select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]') from collection c where c.user_id = auth.uid()),
    'moodboards', (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]') from moodboards m where m.user_id = auth.uid()),
    'moodboard_library', (select to_jsonb(l) from moodboard_library l where l.user_id = auth.uid()),

    'identifications', (select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at), '[]') from identifications i where i.user_id = auth.uid()),
    'subscription', (select to_jsonb(s) - 'stripe_customer_id' - 'stripe_subscription_id' from subscriptions s where s.user_id = auth.uid()),
    'usage', (select coalesce(jsonb_agg(to_jsonb(u)), '[]') from usage u where u.subject = auth.uid()::text)
  );
$$;
