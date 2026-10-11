// The accounts API (server/), run against the in-memory store: no database, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createApp, hashPassword, verifyPassword } from "../server/app.mjs";
import { memoryStore } from "../server/store.mjs";

const TODAY = new Date("2026-09-29T12:00:00Z");

async function withServer(fn, options = {}) {
  const server = createServer(createApp({ store: memoryStore(), allowedOrigins: ["http://localhost:5173"], now: () => TODAY, ...options }));
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, body, token) => {
    const response = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", Origin: "http://localhost:5173", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null, headers: response.headers };
  };
  try {
    await fn(call);
  } finally {
    server.close();
  }
}

const person = {
  firstName: "Ada",
  lastName: "Prova",
  birthDate: "1990-05-17",
  country: "IT",
  email: "ada.prova@example.com",
  password: "prova1234",
};

test("passwords are hashed with scrypt and verified", async () => {
  const hash = await hashPassword("prova1234");
  assert.match(hash, /^scrypt\$/);
  assert.equal(hash.includes("prova1234"), false);
  assert.equal(await verifyPassword("prova1234", hash), true);
  assert.equal(await verifyPassword("prova12345", hash), false);
});

test("accounts: sign up, sign in, profile, password, sign out, delete", async () => {
  await withServer(async (call) => {
    const signup = await call("POST", "/auth/signup", { ...person, email: "  Ada.Prova@Example.com " });
    assert.equal(signup.status, 201);
    assert.equal(signup.body.user.email, "ada.prova@example.com");
    assert.equal(signup.body.user.country, "IT");
    assert.equal("passwordHash" in signup.body.user, false);
    assert.equal(signup.headers.get("access-control-allow-origin"), "http://localhost:5173");
    const token = signup.body.token;

    const again = await call("POST", "/auth/signup", person);
    assert.equal(again.status, 409);
    assert.equal(again.body.errors.email, "emailTaken");

    const young = await call("POST", "/auth/signup", { ...person, email: "young@example.com", birthDate: "2015-01-01" });
    assert.equal(young.status, 422);
    assert.equal(young.body.errors.birthDate, "tooYoung");

    const bad = await call("POST", "/auth/signup", { ...person, email: "x", password: "short", country: "ZZ", firstName: "" });
    assert.deepEqual(Object.keys(bad.body.errors).sort(), ["country", "email", "firstName", "password"]);

    assert.equal((await call("POST", "/auth/login", { email: person.email, password: "wrong1234" })).status, 401);
    assert.equal((await call("POST", "/auth/login", { email: "nobody@example.com", password: "prova1234" })).status, 401);
    const login = await call("POST", "/auth/login", { email: "ADA.PROVA@example.com", password: person.password });
    assert.equal(login.status, 200);

    assert.equal((await call("GET", "/me")).status, 401);
    const me = await call("GET", "/me", null, token);
    assert.equal(me.body.user.firstName, "Ada");

    const patched = await call("PATCH", "/me", { country: "fr", firstName: "  Adele " }, token);
    assert.equal(patched.status, 200);
    assert.equal(patched.body.user.country, "FR");
    assert.equal(patched.body.user.firstName, "Adele");
    assert.equal((await call("PATCH", "/me", { birthDate: "2020-01-01" }, token)).status, 422);

    assert.equal((await call("POST", "/me/password", { current: "wrong1234", password: "nuova5678" }, token)).status, 401);
    assert.equal((await call("POST", "/me/password", { current: person.password, password: "nuova5678" }, token)).status, 204);
    // The other session (from the login above) is gone; this one still works.
    assert.equal((await call("GET", "/me", null, login.body.token)).status, 401);
    assert.equal((await call("GET", "/me", null, token)).status, 200);
    assert.equal((await call("POST", "/auth/login", { email: person.email, password: "nuova5678" })).status, 200);

    assert.equal((await call("POST", "/auth/logout", null, token)).status, 204);
    assert.equal((await call("GET", "/me", null, token)).status, 401);

    const fresh = await call("POST", "/auth/login", { email: person.email, password: "nuova5678" });
    assert.equal((await call("DELETE", "/me", { password: "wrong1234" }, fresh.body.token)).status, 401);
    assert.equal((await call("DELETE", "/me", { password: "nuova5678" }, fresh.body.token)).status, 204);
    assert.equal((await call("POST", "/auth/login", { email: person.email, password: "nuova5678" })).status, 401);
  });
});

test("accounts: password reset by email link", async () => {
  const sent = [];
  await withServer(
    async (call) => {
      await call("POST", "/auth/signup", person);
      assert.equal((await call("POST", "/auth/forgot", { email: "nobody@example.com" })).status, 204);
      assert.equal(sent.length, 0);
      assert.equal((await call("POST", "/auth/forgot", { email: person.email })).status, 204);
      const token = /#token=([\w-]+)/.exec(sent[0].text)[1];
      assert.equal((await call("POST", "/auth/reset", { token, password: "weak" })).status, 422);
      assert.equal((await call("POST", "/auth/reset", { token, password: "rinnovata99" })).status, 204);
      assert.equal((await call("POST", "/auth/reset", { token, password: "altra12345" })).status, 400);
      assert.equal((await call("POST", "/auth/login", { email: person.email, password: "rinnovata99" })).status, 200);
    },
    { sendEmail: async (mail) => sent.push(mail), siteUrl: "https://example.github.io/design-archive" }
  );
});

test("accounts: without an email service, reset says so", async () => {
  await withServer(async (call) => {
    const response = await call("POST", "/auth/forgot", { email: person.email });
    assert.equal(response.status, 503);
    assert.equal(response.body.error, "email_not_configured");
  });
});
