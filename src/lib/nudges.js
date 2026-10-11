// Discreet invitations to create an account, at the moments it helps (never on arrival):
//   "favourites"  the third saved piece
//   "moodboards"  a second moodboard
// Each is shown once per browser, only to guests, and only when accounts are available.
import { backendConfigured } from "./backend.js";
import { currentUser } from "./auth.js";

const KEY = "design-archive:nudges";

function shown() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

export function nudge(reason) {
  if (!backendConfigured || currentUser()) return;
  const seen = shown();
  if (seen[reason]) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...seen, [reason]: new Date().toISOString() }));
  } catch {
    /* storage blocked: it may be shown again, which is harmless */
  }
  window.dispatchEvent(new CustomEvent("design-archive:nudge", { detail: { reason } }));
}
