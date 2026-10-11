// Starts the accounts API. On Railway: `node server/index.mjs` (see railway.json).
//
// Environment:
//   DATABASE_URL      Postgres (Railway sets it when you add a Postgres database). Without it the
//                     accounts live in memory — fine for trying it on your computer, lost on restart.
//   ALLOWED_ORIGINS   the site's addresses, comma separated (e.g. https://you.github.io,http://localhost:5173)
//   SITE_URL          the site's address, for the link in password-reset emails
//   RESEND_API_KEY, EMAIL_FROM   optional: send password-reset emails through Resend
//   PORT              set by Railway
import { createServer } from "node:http";
import { createApp } from "./app.mjs";
import { memoryStore, postgresStore } from "./store.mjs";

const env = process.env;
const store = env.DATABASE_URL ? await postgresStore(env.DATABASE_URL) : memoryStore();
const allowedOrigins = (env.ALLOWED_ORIGINS ?? "http://localhost:5173,http://localhost:4173")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);

// Password-reset emails, only when a Resend key is set.
const sendEmail = env.RESEND_API_KEY
  ? async ({ to, subject, text }) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.EMAIL_FROM ?? "Design Archive <onboarding@resend.dev>", to, subject, text }),
      });
      if (!response.ok) console.error(`resend: ${response.status} ${await response.text()}`);
    }
  : null;

const handle = createApp({ store, allowedOrigins, sendEmail, siteUrl: (env.SITE_URL ?? "").replace(/\/$/, "") });
const port = Number(env.PORT ?? 8787);
createServer(handle).listen(port, () => {
  console.log(`accounts api on :${port} · store: ${store.kind} · origins: ${allowedOrigins.join(", ")}${sendEmail ? " · reset emails on" : ""}`);
  if (store.kind === "memory") console.log("  (no DATABASE_URL: accounts are kept in memory and lost on restart)");
});
