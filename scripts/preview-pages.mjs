// Shows the site exactly as GitHub Pages will serve it: under /design-archive/, with the static
// pages and the sitemap pointing at the local address.
//
//   npm run preview:pages      → http://localhost:4173/ (sends you on to /design-archive/)
//   npm run preview            → the same, served at the root (base "/")
//
// It always builds first, with the matching base. Previewing a build made for a different base
// (plain `npm run build` uses "/") gives a blank page: the HTML asks for /assets/… while the
// server only answers under /design-archive/assets/….
import { spawnSync } from "node:child_process";
import { preview } from "vite";

// --base=/ for a site served at the root; the GitHub Pages project path otherwise.
const BASE = (process.argv.find((arg) => arg.startsWith("--base="))?.slice(7) ?? "/design-archive/").replace(/\/?$/, "/");
const PORT = 4173;
const SITE_URL = `http://localhost:${PORT}${BASE.replace(/\/$/, "")}`;

const build = spawnSync("npm run build", {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, VITE_BASE: BASE, SITE_URL },
});
if (build.status !== 0) process.exit(build.status ?? 1);

const server = await preview({
  base: BASE,
  preview: { port: PORT, strictPort: true },
  plugins: [
    {
      name: "root-to-base",
      // The bare address has nothing to show under a base path: go to the site instead.
      configurePreviewServer(previewServer) {
        previewServer.middlewares.use((req, res, next) => {
          if (BASE !== "/" && (req.url === "/" || req.url === "")) {
            res.statusCode = 302;
            res.setHeader("Location", BASE);
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
});
server.printUrls();
