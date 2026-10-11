// Where the piece page's close button goes back to: the last page in this tab that was not a
// piece, remembered as its place in the tab's history. Opening pieces one after another (the
// pager, the related rows) keeps the same origin, so closing returns to the archive, search or
// story the visitor started from — with its filters and scroll position, since it is a real Back.
const KEY = "design-archive:piece-origin";

const historyIndex = () => {
  const idx = window.history.state?.idx;
  return typeof idx === "number" ? idx : null;
};

export function rememberOrigin(pathname) {
  if (pathname.startsWith("/piece/")) return;
  const idx = historyIndex();
  if (idx === null) return;
  try {
    sessionStorage.setItem(KEY, String(idx));
  } catch {
    /* storage blocked: closing falls back to the archive */
  }
}

// How many steps Back lead to the origin (a negative number), or null when the piece was the
// first page opened in this tab — then there is nowhere in the site to go back to.
export function stepsToOrigin() {
  const idx = historyIndex();
  let stored = null;
  try {
    stored = sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
  const origin = stored === null ? NaN : Number(stored);
  if (idx === null || !Number.isInteger(origin) || origin >= idx) return null;
  return origin - idx;
}
