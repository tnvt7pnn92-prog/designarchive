// One data layer for everything a visitor keeps: the collection, moodboards, the moodboard
// library and the profile.
//
// Every collection lives in the browser (localStorage), which is what the components read and
// write — instantly, online or not. When the visitor is signed in, lib/sync.js mirrors each
// collection to their account in the background: it merges on sign-in, pushes every change, and
// retries after a failure or when the connection comes back. Components never know which of the
// two is active.
import { useSyncExternalStore } from "react";

const registry = new Map();

// What the site no longer keeps (the daily quiz, removed in September 2026) leaves this browser.
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("design-archive:quiz");
  } catch {
    /* storage blocked: nothing to clear */
  }
}

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// A collection kept in localStorage under `key`.
//   empty      the value when nothing is stored
//   normalize  turns whatever was stored (old formats, hand-edited values) into a valid value
//   migrate    optional: builds a first value from older storage keys
//   remote     optional sync adapter (see lib/sync.js): { pull, push, merge, added, clear }
export function createStore(name, { key, empty, normalize = (value) => value, migrate, remote }) {
  const listeners = new Set();
  const changeHooks = new Set();

  let failed = false;
  let migrated = false;

  function persist(next) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      failed = false;
    } catch {
      failed = true; // full or blocked storage: the value still lives for this visit
    }
  }

  const load = () => {
    if (typeof window === "undefined") return empty;
    const stored = readJson(key);
    if (stored !== undefined) return normalize(stored) ?? empty;
    const fromOld = migrate?.();
    if (fromOld === undefined) return empty;
    migrated = true;
    return normalize(fromOld) ?? empty;
  };

  let value = load();
  // Data carried over from older keys is written in the new place straight away, since the
  // migration may already have removed the old keys.
  if (migrated) persist(value);

  const emit = () => listeners.forEach((listener) => listener());

  const store = {
    name,
    key,
    empty,
    remote,
    get: () => value,
    saveFailed: () => failed,
    // A change made by the visitor: saved locally, then offered to the sync.
    set(updater) {
      const next = typeof updater === "function" ? updater(value) : updater;
      if (next === value) return value;
      const previous = value;
      value = next;
      persist(next);
      emit();
      changeHooks.forEach((hook) => hook(next, previous));
      return next;
    },
    // A value coming from the account (or a sign-out): saved locally, not pushed back.
    replace(next) {
      value = next;
      persist(next);
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onChange(hook) {
      changeHooks.add(hook);
      return () => changeHooks.delete(hook);
    },
  };

  // Other tabs write to the same key: follow them.
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key !== key) return;
      value = load();
      emit();
    });
  }

  registry.set(name, store);
  return store;
}

export function useStore(store) {
  return useSyncExternalStore(store.subscribe, store.get, () => store.empty);
}

// Every collection, for the sync and for "download my data".
export function allStores() {
  return [...registry.values()];
}

// Everything kept in this browser, as one object — the guest version of "download my data".
export function localSnapshot() {
  return Object.fromEntries(allStores().map((store) => [store.name, store.get()]));
}

// Empties every collection in this browser (used by "delete my data" and on sign-out).
export function clearLocalData() {
  for (const store of allStores()) store.replace(store.empty);
}
