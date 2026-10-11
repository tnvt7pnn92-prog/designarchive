// The main sections, in one place, so a new section is added once rather than in several files
// that silently drift apart. Plain data (no React, no imports): the prerender script reads it too.

// The header: know a piece, find it, read its story, and put it in a room. The collection lives
// in the menu, under "Your space".
export const NAV_ITEMS = [
  { to: "/archive", key: "nav.archive" },
  { to: "/markets", key: "nav.markets" },
  { to: "/stories", key: "nav.stories" },
  { to: "/moodboard", key: "nav.moodboard" },
];

// "Your space" in the header menu.
export const ACCOUNT_ITEMS = [{ to: "/collection", key: "nav.collection" }];

// The account page: at the foot of the header menu, with the language and signing out.
export const ACCOUNT_PAGE = { to: "/account", key: "nav.account" };

// Everything else: in the header's menu and in the footer.
export const SECONDARY_ITEMS = [
  { to: "/designers", key: "designers.title" },
];

// The command palette: every section.
export const FOOTER_ITEMS = [...NAV_ITEMS, ACCOUNT_ITEMS[0], ...SECONDARY_ITEMS];
