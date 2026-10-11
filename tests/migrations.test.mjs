// The database migrations, run for real on an in-process Postgres (PGlite): the initial schema,
// then every later migration in order, over the data an existing account would have. What
// Supabase provides around the schema (auth.users, auth.uid(), storage, its roles) is stubbed
// with the little the migrations touch. Row level security is covered by integration.test.mjs,
// against a real project.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../supabase/migrations");
const files = readdirSync(dir).filter((name) => name.endsWith(".sql")).sort();
const sql = (name) => readFileSync(path.join(dir, name), "utf8");

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
let db;
const rows = async (query, params) => (await db.query(query, params)).rows;
const as = (uid) => db.exec(`select set_config('test.uid', '${uid}', false)`);

before(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
  `);
  await db.exec(sql(files[0]));

  // Two accounts as they were before the collection: hearts and a "Looking for" list.
  await db.exec(`
    insert into auth.users (id, email) values ('${A}', 'a@example.com'), ('${B}', 'b@example.com');
    insert into public.favourites (user_id, piece_id, created_at) values
      ('${A}', 'egg-chair', '2026-09-01T10:00:00Z'), ('${A}', 'arco-lamp', '2026-09-02T10:00:00Z'), ('${B}', 'egg-chair', '2026-09-03T10:00:00Z');
    insert into public.wishlist (user_id, piece_id, max_price, notes, created_at, updated_at) values
      ('${A}', 'arco-lamp', 900, 'marble base intact', '2026-09-05T10:00:00Z', '2026-09-06T10:00:00Z'),
      ('${A}', 'panton-chair', null, '', '2026-09-07T10:00:00Z', '2026-09-07T10:00:00Z');
  `);
  for (const name of files.slice(1)) await db.exec(sql(name));
});

test("migrations: hearts and \"looking for\" are copied into the collection, nothing lost", async () => {
  const a = await rows("select piece_id, status, max_price, notes from collection where user_id = $1 order by piece_id", [A]);
  assert.deepEqual(a, [
    // In both lists: "looking for" wins and keeps its price and notes.
    { piece_id: "arco-lamp", status: "want", max_price: 900, notes: "marble base intact" },
    { piece_id: "egg-chair", status: "saved", max_price: null, notes: "" },
    { piece_id: "panton-chair", status: "want", max_price: null, notes: "" },
  ]);
  assert.equal((await rows("select count(*)::int as n from collection where user_id = $1", [B]))[0].n, 1);
  // The old tables are still there, untouched.
  assert.equal((await rows("select count(*)::int as n from favourites"))[0].n, 3);
  assert.equal((await rows("select count(*)::int as n from wishlist"))[0].n, 2);
});

test("migrations: the first sign-in import takes the collection, and the two old lists from an older browser", async () => {
  await as(A);
  const payload = {
    collection: [
      { id: "tulip-chair", status: "own", notes: "kitchen", addedAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-21T10:00:00Z" },
      { id: "egg-chair", status: "seen", place: "Porta Portese", seenOn: "2026-09-27", addedAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-28T10:00:00Z" },
      // Older than what the account holds: the account's version stays.
      { id: "arco-lamp", status: "saved", addedAt: "2026-09-02T10:00:00Z", updatedAt: "2026-09-03T10:00:00Z" },
    ],
    favourites: ["panton-chair", "wishbone-chair"],
    // An older browser also sends the progress of the daily quiz, which no longer exists.
    quiz: { days: {}, streak: { current: 3 } },
    wishlist: [{ id: "ph5-lamp", maxPrice: 400, notes: "", addedAt: "2026-09-10T10:00:00Z", updatedAt: "2026-09-10T10:00:00Z" }],
  };
  const [{ result }] = await rows("select import_local_data($1::jsonb) as result", [JSON.stringify(payload)]);
  assert.equal(result.collection, 3); // tulip-chair, wishbone-chair, ph5-lamp are new
  const after = Object.fromEntries((await rows("select piece_id, status, place, seen_on::text as seen_on from collection where user_id = $1", [A])).map((row) => [row.piece_id, row]));
  assert.equal(after["tulip-chair"].status, "own");
  assert.equal(after["egg-chair"].status, "seen");
  assert.equal(after["egg-chair"].place, "Porta Portese");
  assert.equal(after["egg-chair"].seen_on, "2026-09-27");
  assert.equal(after["arco-lamp"].status, "want");
  // A bare heart from an older browser adds a piece but never changes one that is already there.
  assert.equal(after["panton-chair"].status, "want");
  assert.equal(after["wishbone-chair"].status, "saved");
  assert.equal(after["ph5-lamp"].status, "want");
});

test("migrations: \"download my data\" carries the collection", async () => {
  await as(A);
  const [{ data }] = await rows("select export_my_data() as data");
  assert.equal(data.email, "a@example.com");
  assert.equal(data.collection.length, 6);
  assert.equal("favourites" in data, false);
});

test("migrations: the daily quiz leaves no table behind", async () => {
  const [{ exists }] = await rows("select to_regclass('public.quiz_state') is not null as exists");
  assert.equal(exists, false);
});
test("migrations: a shared board tells where its pieces lie, an older board still opens", async () => {
  const content = {
    version: 4,
    format: "a3",
    background: "paper",
    elements: [
      { id: "p1", type: "photo", objectId: "egg-chair", x: 100, y: 120, width: 160 },
      { id: "t1", type: "text", text: "Hello", x: 0, y: 0 },
    ],
  };
  await db.query(
    "insert into moodboards (id, user_id, title, content, share_slug, preview_path) values (gen_random_uuid(), $1, 'Shared', $2::jsonb, 'abc123', 'a/b.png'), (gen_random_uuid(), $4, 'Old', $3::jsonb, 'old123', 'a/c.png')",
    [A, JSON.stringify(content), JSON.stringify({ version: 3, background: "ink", elements: [{ id: "p", type: "photo", objectId: "arco-lamp", x: 1, y: 2, width: 160 }] }), B]
  );
  const [{ board }] = await rows("select get_shared_moodboard('abc123') as board");
  assert.equal(board.format, "a3");
  assert.deepEqual(board.pieces, ["egg-chair"]);
  assert.deepEqual(board.labels, [{ objectId: "egg-chair", x: 100, y: 120, width: 160 }]);
  const [{ board: old }] = await rows("select get_shared_moodboard('old123') as board");
  assert.equal(old.format, null);
  assert.equal(old.labels.length, 1);
});

test("migrations: no plans and no identifications are left, and nothing is limited", async () => {
  for (const table of ["plan_limits", "subscriptions", "usage", "stripe_events", "identifications", "identification_feedback", "ai_costs", "price_bases"]) {
    const [{ exists }] = await rows("select to_regclass($1) is not null as exists", [`public.${table}`]);
    assert.equal(exists, false, table);
  }
  const functions = await rows("select proname from pg_proc where proname in ('current_plan', 'plan_limit', 'plan_feature', 'entitlements', 'consume_usage', 'enforce_collection_limit', 'enforce_plan_limit', 'moodboard_editable', 'my_identifications')");
  assert.deepEqual(functions, []);
  assert.equal((await rows("select count(*)::int as n from storage.buckets where id = 'identifications'"))[0].n, 0);
  // Well past the old free plan: 60 pieces "looking for" and 60 more, all accepted.
  for (let i = 0; i < 60; i++) {
    await db.query("insert into collection (user_id, piece_id, status) values ($1, $2, 'want'), ($1, $3, 'own')", [B, `want-${i}`, `own-${i}`]);
  }
  assert.equal((await rows("select count(*)::int as n from collection where user_id = $1", [B]))[0].n, 121);
});

test("migrations: sharing needs only an account; the guide is readable by everyone", async () => {
  await as(A);
  const [{ id }] = await rows("insert into moodboards (id, user_id, title, content) values (gen_random_uuid(), $1, 'Mine', '{}'::jsonb) returning id", [A]);
  const [{ slug }] = await rows("select share_moodboard($1) as slug", [id]);
  assert.ok(slug);
  const guide = await rows("select policyname, qual from pg_policies where tablename = 'buying_guide'");
  assert.deepEqual(guide.map((p) => [p.policyname, p.qual]), [["the guide is readable by everyone", "true"]]);
  const [{ data }] = await rows("select export_my_data() as data");
  assert.equal("identifications" in data, false);
  assert.equal("subscription" in data, false);
});