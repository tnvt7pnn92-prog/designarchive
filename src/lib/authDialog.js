// Opens the sign-up / sign-in dialog from anywhere (header, nudges, locked features).
//   reason: picks the sentence that explains why an account helps at that moment
//   mode:   "signup" (default) or "signin" — only the words differ, the flow is the same
import { useSyncExternalStore } from "react";

let state = { open: false, reason: null, mode: "signup" };
const listeners = new Set();

export function openAuth(reason = "menu", mode = "signup") {
  state = { open: true, reason, mode };
  listeners.forEach((listener) => listener());
}

export function closeAuth() {
  state = { open: false, reason: null, mode: "signup" };
  listeners.forEach((listener) => listener());
}

export function useAuthDialog() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state
  );
}
