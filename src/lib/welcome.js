// The welcome after the first sign-in on a device, when the profile is still empty: a name, a
// city and a role, all optional. Shown once per account and browser.
// (No import of the profile here: this module is in the first load, the profile code is not.)
import { useSyncExternalStore } from "react";

const seenKey = (userId) => `design-archive:welcomed:${userId}`;

let open = false;
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());

export function maybeWelcome(userId, profile) {
  if (profile.name || profile.role) return;
  try {
    if (localStorage.getItem(seenKey(userId))) return;
    localStorage.setItem(seenKey(userId), new Date().toISOString());
  } catch {
    /* no storage: show it anyway, once for this page */
  }
  open = true;
  emit();
}

export function closeWelcome() {
  open = false;
  emit();
}

export function useWelcome() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => open,
    () => false
  );
}
