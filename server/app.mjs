// The accounts API, for Railway (or any Node host). No framework: node:http, node:crypto and the
// shared validation rules of the site (src/lib/signup.js), so the server checks exactly what the
// form checks.
//
//   POST   /auth/signup      { firstName, lastName, birthDate, country, email, password } → { token, user }
//   POST   /auth/login       { email, password }                                        → { token, user }
//   POST   /auth/logout      (Authorization: Bearer <token>)
//   POST   /auth/forgot      { email }  — sends a reset link when email is configured (always 204)
//   POST   /auth/reset       { token, password }
//   GET    /me               → { user }
//   PATCH  /me               { firstName?, lastName?, birthDate?, country? } → { user }
//   POST   /me/password      { current, password }
//   DELETE /me               { password }
//   GET    /health
//
// Passwords are stored as scrypt hashes; sessions are random tokens of which only a hash is kept.
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { emailValid, normalizeEmail, passwordProblem, validateProfile, validateSignUp } from "../src/lib/signup.js";

const scrypt = promisify(scryptCallback);
const SESSION_DAYS = 30;
const RESET_MINUTES = 60;
const MAX_BODY = 16 * 1024;

// ---------- passwords and tokens ----------
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, n, r, p, salt, key] = String(stored).split("$");
  if (scheme !== "scrypt") return false;
  const expected = Buffer.from(key, "base64");
  const actual = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return timingSafeEqual(expected, actual);
}

const newToken = () => randomBytes(32).toString("base64url");
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const daysFromNow = (days) => new Date(Date.now() + days * 86_400_000).toISOString();

// A hash to compare against when the email is unknown, so a wrong email and a wrong password take
// the same time (no way to probe which addresses have an account).
const DUMMY_HASH = await hashPassword(randomBytes(12).toString("hex"));

// ---------- rate limits (per server instance, in memory) ----------
function limiter(max, windowMs) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 10_000) hits.clear();
    return recent.length > max;
  };
}

// ---------- the public shape of a user ----------
const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  firstName: u.firstName,
  lastName: u.lastName,
  birthDate: u.birthDate,
  country: u.country,
  createdAt: u.createdAt,
});

class HttpError extends Error {
  constructor(status, code, extra = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function createApp({ store, allowedOrigins = [], sendEmail = null, siteUrl = "", now = () => new Date() }) {
  const tooManyLogins = limiter(10, 15 * 60_000);
  const tooManySignups = limiter(5, 60 * 60_000);
  const tooManyResets = limiter(5, 60 * 60_000);

  async function readJson(req) {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY) throw new HttpError(413, "too_large");
      chunks.push(chunk);
    }
    if (!chunks.length) return {};
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      return body && typeof body === "object" ? body : {};
    } catch {
      throw new HttpError(400, "bad_json");
    }
  }

  async function startSession(user) {
    const token = newToken();
    await store.createSession(hashToken(token), user.id, daysFromNow(SESSION_DAYS));
    return { token, user: publicUser(user) };
  }

  async function requireUser(req) {
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? "");
    if (!match) throw new HttpError(401, "not_signed_in");
    const session = await store.findSession(hashToken(match[1]));
    if (!session || session.expiresAt <= now().toISOString()) throw new HttpError(401, "not_signed_in");
    const user = await store.findUserById(session.userId);
    if (!user) throw new HttpError(401, "not_signed_in");
    return { user, tokenHash: hashToken(match[1]) };
  }

  const clean = (body) => ({
    firstName: typeof body.firstName === "string" ? body.firstName.trim() : "",
    lastName: typeof body.lastName === "string" ? body.lastName.trim() : "",
    birthDate: typeof body.birthDate === "string" ? body.birthDate.trim() : "",
    country: typeof body.country === "string" ? body.country.trim().toUpperCase() : "",
  });

  const routes = {
    "GET /health": async () => ({ ok: true, store: store.kind }),

    "POST /auth/signup": async (req, body, ip) => {
      if (tooManySignups(ip)) throw new HttpError(429, "rate_limited");
      const data = { ...clean(body), email: normalizeEmail(body.email), password: typeof body.password === "string" ? body.password : "" };
      const errors = validateSignUp(data, now());
      if (Object.keys(errors).length) throw new HttpError(422, "invalid", { errors });
      const user = await store.createUser({ ...data, passwordHash: await hashPassword(data.password) });
      if (!user) throw new HttpError(409, "email_taken", { errors: { email: "emailTaken" } });
      return [201, await startSession(user)];
    },

    "POST /auth/login": async (req, body, ip) => {
      const email = normalizeEmail(body.email);
      if (tooManyLogins(`${ip}|${email}`)) throw new HttpError(429, "rate_limited");
      const password = typeof body.password === "string" ? body.password : "";
      const user = emailValid(email) ? await store.findUserByEmail(email) : null;
      const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !ok) throw new HttpError(401, "invalid_credentials");
      return startSession(user);
    },

    "POST /auth/logout": async (req) => {
      const { tokenHash } = await requireUser(req);
      await store.deleteSession(tokenHash);
      return [204, null];
    },

    "POST /auth/forgot": async (req, body, ip) => {
      if (!sendEmail) throw new HttpError(503, "email_not_configured");
      const email = normalizeEmail(body.email);
      if (tooManyResets(`${ip}|${email}`)) throw new HttpError(429, "rate_limited");
      const user = emailValid(email) ? await store.findUserByEmail(email) : null;
      // Same answer either way: nobody learns whether an address has an account.
      if (user) {
        const token = newToken();
        await store.createReset(hashToken(token), user.id, new Date(Date.now() + RESET_MINUTES * 60_000).toISOString());
        await sendEmail({
          to: user.email,
          subject: "Design Archive — choose a new password",
          text: `To choose a new password, open this link within ${RESET_MINUTES} minutes:\n\n${siteUrl}/nuova-password#token=${token}\n\nIf you did not ask for it, ignore this email.`,
        });
      }
      return [204, null];
    },

    "POST /auth/reset": async (req, body) => {
      const problem = passwordProblem(body.password);
      if (problem) throw new HttpError(422, "invalid", { errors: { password: problem === "short" ? "passwordShort" : problem === "long" ? "passwordLong" : "passwordWeak" } });
      const userId = typeof body.token === "string" ? await store.useReset(hashToken(body.token)) : null;
      if (!userId) throw new HttpError(400, "reset_expired");
      await store.updateUser(userId, { passwordHash: await hashPassword(body.password) });
      await store.deleteSessionsOf(userId);
      return [204, null];
    },

    "GET /me": async (req) => ({ user: publicUser((await requireUser(req)).user) }),

    "PATCH /me": async (req, body) => {
      const { user } = await requireUser(req);
      const next = { ...publicUser(user), ...Object.fromEntries(Object.entries(clean(body)).filter(([key]) => key in body)) };
      const errors = validateProfile(next, now());
      if (Object.keys(errors).length) throw new HttpError(422, "invalid", { errors });
      const updated = await store.updateUser(user.id, { firstName: next.firstName, lastName: next.lastName, birthDate: next.birthDate, country: next.country });
      return { user: publicUser(updated) };
    },

    "POST /me/password": async (req, body) => {
      const { user, tokenHash } = await requireUser(req);
      if (!(await verifyPassword(String(body.current ?? ""), user.passwordHash))) throw new HttpError(401, "invalid_credentials");
      const problem = passwordProblem(body.password);
      if (problem) throw new HttpError(422, "invalid", { errors: { password: problem === "short" ? "passwordShort" : problem === "long" ? "passwordLong" : "passwordWeak" } });
      await store.updateUser(user.id, { passwordHash: await hashPassword(body.password) });
      // Signed out everywhere else; this device keeps its session.
      await store.deleteSessionsOf(user.id);
      await store.createSession(tokenHash, user.id, daysFromNow(SESSION_DAYS));
      return [204, null];
    },

    "DELETE /me": async (req, body) => {
      const { user } = await requireUser(req);
      if (!(await verifyPassword(String(body.password ?? ""), user.passwordHash))) throw new HttpError(401, "invalid_credentials");
      await store.deleteUser(user.id);
      return [204, null];
    },
  };

  function cors(req, res) {
    const origin = req.headers.origin;
    if (origin && (allowedOrigins.includes("*") || allowedOrigins.includes(origin))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
      res.setHeader("Access-Control-Max-Age", "600");
    }
  }

  return async function handle(req, res) {
    cors(req, res);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }
    const path = new URL(req.url, "http://x").pathname.replace(/\/+$/, "") || "/";
    const route = routes[`${req.method} ${path}`];
    const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "").split(",")[0].trim();
    try {
      if (!route) throw new HttpError(404, "not_found");
      const body = req.method === "GET" ? {} : await readJson(req);
      const result = await route(req, body, ip);
      const [status, payload] = Array.isArray(result) ? result : [200, result];
      if (payload === null) res.writeHead(status).end();
      else res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }).end(JSON.stringify(payload));
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error(error);
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }).end(
        JSON.stringify({ error: error instanceof HttpError ? error.code : "server_error", ...(error.extra ?? {}) })
      );
    }
  };
}
