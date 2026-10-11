// Where accounts live. On Railway: the Postgres database Railway provides (DATABASE_URL). Without
// it — on your computer, and in the tests — an in-memory store with the same methods, so the
// server can be tried with no database at all (everything is lost when it stops).
import { randomUUID } from "node:crypto";

const SCHEMA = `
create table if not exists users (
  id uuid primary key,
  email text not null,
  password_hash text not null,
  first_name text not null,
  last_name text not null,
  birth_date date not null,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists users_email_key on users (lower(email));

-- Accounts made when sign-up asked for the Italian province: the country of residence takes its
-- place. An Italian province means Italy; "EE" (abroad) says no country, so it stays empty until
-- the person sets it on the account page. The old column is kept (no data is dropped) but no
-- longer required.
alter table users add column if not exists country text;
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'province') then
    alter table users alter column province drop not null;
    update users set country = 'IT' where country is null and province is not null and province <> 'EE';
  end if;
end $$;

create table if not exists sessions (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_user_idx on sessions (user_id);

create table if not exists password_resets (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);
`;

// Rows as the rest of the server uses them (camelCase, dates as YYYY-MM-DD).
const toUser = (row) =>
  row && {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date instanceof Date ? row.birth_date.toISOString().slice(0, 10) : String(row.birth_date).slice(0, 10),
    country: row.country,
    createdAt: new Date(row.created_at).toISOString(),
  };

export async function postgresStore(databaseUrl) {
  const { default: pg } = await import("pg");
  // Railway's internal network needs no TLS; its public URL does.
  const ssl = /sslmode=require|\.proxy\.rlwy\.net|railway\.app/.test(databaseUrl) ? { rejectUnauthorized: false } : undefined;
  const pool = new pg.Pool({ connectionString: databaseUrl, ssl, max: 5 });
  await pool.query(SCHEMA);
  const one = async (sql, params) => (await pool.query(sql, params)).rows[0] ?? null;

  return {
    kind: "postgres",
    async createUser(user) {
      const row = await one(
        `insert into users (id, email, password_hash, first_name, last_name, birth_date, country)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict ((lower(email))) do nothing
         returning *`,
        [randomUUID(), user.email, user.passwordHash, user.firstName, user.lastName, user.birthDate, user.country]
      );
      return toUser(row);
    },
    findUserByEmail: async (email) => toUser(await one("select * from users where lower(email) = lower($1)", [email])),
    findUserById: async (id) => toUser(await one("select * from users where id = $1", [id])),
    async updateUser(id, patch) {
      const row = await one(
        `update users set first_name = coalesce($2, first_name), last_name = coalesce($3, last_name),
           birth_date = coalesce($4, birth_date), country = coalesce($5, country),
           password_hash = coalesce($6, password_hash), updated_at = now()
         where id = $1 returning *`,
        [id, patch.firstName ?? null, patch.lastName ?? null, patch.birthDate ?? null, patch.country ?? null, patch.passwordHash ?? null]
      );
      return toUser(row);
    },
    deleteUser: async (id) => void (await pool.query("delete from users where id = $1", [id])),
    createSession: async (tokenHash, userId, expiresAt) =>
      void (await pool.query("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)", [tokenHash, userId, expiresAt])),
    async findSession(tokenHash) {
      const row = await one("select user_id, expires_at from sessions where token_hash = $1", [tokenHash]);
      return row && { userId: row.user_id, expiresAt: new Date(row.expires_at).toISOString() };
    },
    deleteSession: async (tokenHash) => void (await pool.query("delete from sessions where token_hash = $1", [tokenHash])),
    deleteSessionsOf: async (userId) => void (await pool.query("delete from sessions where user_id = $1", [userId])),
    createReset: async (tokenHash, userId, expiresAt) =>
      void (await pool.query("insert into password_resets (token_hash, user_id, expires_at) values ($1, $2, $3)", [tokenHash, userId, expiresAt])),
    async useReset(tokenHash) {
      const row = await one(
        "update password_resets set used_at = now() where token_hash = $1 and used_at is null and expires_at > now() returning user_id",
        [tokenHash]
      );
      return row?.user_id ?? null;
    },
    close: () => pool.end(),
  };
}

export function memoryStore() {
  const users = new Map();
  const sessions = new Map();
  const resets = new Map();
  const byEmail = (email) => [...users.values()].find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  return {
    kind: "memory",
    async createUser(user) {
      if (byEmail(user.email)) return null;
      const row = { ...user, id: randomUUID(), createdAt: new Date().toISOString() };
      users.set(row.id, row);
      return { ...row };
    },
    findUserByEmail: async (email) => (byEmail(email) ? { ...byEmail(email) } : null),
    findUserById: async (id) => (users.has(id) ? { ...users.get(id) } : null),
    async updateUser(id, patch) {
      const user = users.get(id);
      if (!user) return null;
      for (const [key, value] of Object.entries(patch)) if (value !== undefined && value !== null) user[key] = value;
      return { ...user };
    },
    async deleteUser(id) {
      users.delete(id);
      for (const [hash, s] of sessions) if (s.userId === id) sessions.delete(hash);
    },
    createSession: async (tokenHash, userId, expiresAt) => void sessions.set(tokenHash, { userId, expiresAt }),
    findSession: async (tokenHash) => sessions.get(tokenHash) ?? null,
    deleteSession: async (tokenHash) => void sessions.delete(tokenHash),
    async deleteSessionsOf(userId) {
      for (const [hash, s] of sessions) if (s.userId === userId) sessions.delete(hash);
    },
    createReset: async (tokenHash, userId, expiresAt) => void resets.set(tokenHash, { userId, expiresAt, used: false }),
    async useReset(tokenHash) {
      const r = resets.get(tokenHash);
      if (!r || r.used || r.expiresAt <= new Date().toISOString()) return null;
      r.used = true;
      return r.userId;
    },
    close: async () => {},
  };
}
