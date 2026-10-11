// Where the site is served from. On GitHub Pages a project site lives under /<repo>/, so every
// absolute path the app builds by hand (share links, the router's basename) goes through here.
export const BASE = import.meta.env.BASE_URL ?? "/";

// The router wants the base without its trailing slash ("" for a site served at the root).
export const ROUTER_BASENAME = BASE.replace(/\/$/, "");

// A full URL for an in-app path, e.g. siteUrl("/stories") → "https://example.github.io/archive/stories".
export function siteUrl(path = "/") {
  return `${window.location.origin}${ROUTER_BASENAME}${path.startsWith("/") ? path : `/${path}`}`;
}
