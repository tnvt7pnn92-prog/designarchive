// Tests against a real Supabase project (use the test project, never production).
// Skipped unless .env.local (or the environment) has SUPABASE_URL, VITE_SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY. They create two throw-away users and delete them at the end.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = { ...process.env };
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const URL = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const skip = !(URL && ANON && SERVICE) && "set SUPABASE_URL, VITE_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY to run";

const admin = skip ? null : createClient(URL, SERVICE, { auth: { persistSession: false } });
const users = {};

async function makeUser(label) {
  const email = `test-${label}-${Date.now()}@example.com`;
  const password = crypto.randomUUID();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const signed = await client.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  return { id: data.user.id, email, client, token: signed.data.session.access_token };
}

before(async () => {
  if (skip) return;
  users.a = await makeUser("a");
  users.b = await makeUser("b");
});

after(async () => {
  if (skip) return;
  await admin.from("buying_guide").delete().eq("piece_id", "egg-chair-test");
  for (const user of Object.values(users)) await admin.auth.admin.deleteUser(user.id);
});

test("nobody reads or changes someone else's rows", { skip }, async () => {
  const { a, b } = users;
  assert.equal((await a.client.from("collection").insert({ user_id: a.id, piece_id: "egg-chair", status: "own" })).error, null);
  assert.equal((await a.client.from("moodboards").insert({ id: crypto.randomUUID(), user_id: a.id, title: "A" })).error, null);

  for (const table of ["collection", "favourites", "wishlist", "moodboards", "profiles"]) {
    const column = table === "profiles" ? "id" : "user_id";
    const { data } = await b.client.from(table).select("*").eq(column, a.id);
    assert.deepEqual(data ?? [], [], `${table} leaks`);
  }
  // Writing into someone else's rows is refused.
  const forged = await b.client.from("collection").insert({ user_id: a.id, piece_id: "wishbone-chair", status: "want" });
  assert.notEqual(forged.error, null);
  await b.client.from("collection").delete().eq("user_id", a.id);
  const { data: still } = await admin.from("collection").select("piece_id").eq("user_id", a.id);
  assert.equal(still.length, 1);
  // The two lists the collection replaced are read-only now, even for their owner.
  assert.notEqual((await a.client.from("favourites").insert({ user_id: a.id, piece_id: "egg-chair" })).error, null);
  assert.notEqual((await a.client.from("wishlist").insert({ user_id: a.id, piece_id: "egg-chair" })).error, null);

  // The same through the raw REST API, as someone would call it by hand.
  const response = await fetch(`${URL}/rest/v1/collection?user_id=eq.${a.id}`, { headers: { apikey: ANON, Authorization: `Bearer ${b.token}` } });
  assert.deepEqual(await response.json(), []);
  const anonymous = await fetch(`${URL}/rest/v1/moodboards?select=*`, { headers: { apikey: ANON } });
  assert.deepEqual(await anonymous.json(), []);
});

test("there is no limit on the collection any more", { skip }, async () => {
  const { b } = users;
  const rows = Array.from({ length: 60 }, (_, i) => ({ user_id: b.id, piece_id: `test-piece-${i}`, status: i % 2 ? "want" : "own" }));
  assert.equal((await b.client.from("collection").insert(rows)).error, null);
  await admin.from("collection").delete().eq("user_id", b.id);
});

test("the measurements are readable by everyone", { skip }, async () => {
  const { a } = users;
  await admin.from("buying_guide").upsert({ piece_id: "egg-chair-test", dimensions: { width: 86, unit: "cm" } });
  const { data } = await a.client.from("buying_guide").select("dimensions").eq("piece_id", "egg-chair-test");
  assert.equal(data?.length, 1);
});