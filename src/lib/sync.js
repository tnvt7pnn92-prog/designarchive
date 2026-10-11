// Mirrors the browser's collections (lib/userData.js) to the signed-in account. Loaded only
// after a sign-in.
//
//   First sign-in on this device: what this browser holds (used as a guest) is merged with the
//   account — nothing is lost — through one server call, then a notice says what was added.
//   Later starts: changes made since the last successful sync are sent first, then the account's
//   version is loaded. Items deleted on another device therefore stay deleted.
//   While signed in: every change is saved at once in the browser and sent a moment later; a
//   failure is retried (backoff, and as soon as the connection comes back).
//   Sign-out: the account's data is removed from this browser.
import { useSyncExternalStore } from "react";
import { allStores } from "./userData.js";
// Every synced collection registers itself when its module loads.
import "./collection.js";
import "./moodboards.js";
import "./moodboardLibrary.js";
import "./profile.js";

const PUSH_DELAY = 1200;
const RETRY = [5_000, 30_000, 120_000];
const lastKey = (userId, name) => `design-archive:sync:${userId}:${name}`;
const mergedKey = (userId) => `design-archive:merged:${userId}`;

let session = null; // { client, userId, unsubscribers, timers, attempts }
let status = { state: "idle", error: null };
const statusListeners = new Set();

function setStatus(next) {
  status = next;
  statusListeners.forEach((listener) => listener());
}

export function useSyncStatus() {
  return useSyncExternalStore(
    (listener) => {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    },
    () => status,
    () => status
  );
}

const synced = () => allStores().filter((store) => store.remote);

function readLast(userId, store) {
  try {
    const raw = localStorage.getItem(lastKey(userId, store.name));
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeLast(userId, store, value) {
  try {
    localStorage.setItem(lastKey(userId, store.name), JSON.stringify(value));
  } catch {
    /* storage full: the next start merges instead of diffing, which is safe */
  }
}

async function pushStore(store) {
  if (!session) return;
  const { client, userId } = session;
  const previous = readLast(userId, store) ?? store.empty;
  const next = store.get();
  if (JSON.stringify(previous) === JSON.stringify(next)) return;
  try {
    setStatus({ state: "syncing", error: null });
    await store.remote.push(client, userId, next, previous);
    writeLast(userId, store, next);
    session.attempts.set(store.name, 0);
    setStatus({ state: navigator.onLine ? "idle" : "offline", error: null });
  } catch (error) {
    const attempt = (session.attempts.get(store.name) ?? 0) + 1;
    session.attempts.set(store.name, attempt);
    setStatus({ state: navigator.onLine ? "error" : "offline", error: error.message ?? String(error) });
    schedule(store, RETRY[Math.min(attempt - 1, RETRY.length - 1)]);
  }
}

function schedule(store, delay = PUSH_DELAY) {
  if (!session) return;
  clearTimeout(session.timers.get(store.name));
  session.timers.set(
    store.name,
    setTimeout(() => pushStore(store), delay)
  );
}

function flushAll() {
  for (const store of synced()) schedule(store, 0);
}

// One server call carrying everything this browser holds, merged with the account (what a guest
// saved is never thrown away).
async function importMerged(client, merged) {
  const payload = Object.fromEntries(merged.map(({ store, value }) => [store.name, store.remote.toImport(value)]));
  const { error } = await client.rpc("import_local_data", { payload });
  if (error) throw error;
}

export async function startSync(client, user) {
  stopSync();
  session = { client, userId: user.id, unsubscribers: [], timers: new Map(), attempts: new Map() };
  const { userId } = session;
  setStatus({ state: "syncing", error: null });

  let firstTime = false;
  try {
    firstTime = !localStorage.getItem(mergedKey(userId));
  } catch {
    firstTime = true;
  }

  try {
    const remote = new Map();
    for (const store of synced()) remote.set(store.name, await store.remote.pull(client, userId));

    if (firstTime) {
      const merged = synced().map((store) => {
        const local = store.get();
        const value = store.remote.merge(local, remote.get(store.name));
        return { store, value, added: store.remote.added(local, remote.get(store.name)) };
      });
      await importMerged(client, merged);
      for (const { store, value } of merged) {
        store.replace(value);
        writeLast(userId, store, value);
      }
      try {
        localStorage.setItem(mergedKey(userId), new Date().toISOString());
      } catch {
        /* storage full */
      }
      const counts = Object.fromEntries(merged.map(({ store, added }) => [store.name, added]));
      if (counts.collection || counts.moodboards) {
        window.dispatchEvent(new CustomEvent("design-archive:merged", { detail: counts }));
      }
      window.dispatchEvent(new CustomEvent("design-archive:first-sync", { detail: { userId } }));
    } else {
      for (const store of synced()) {
        const last = readLast(userId, store);
        const local = store.get();
        let value = remote.get(store.name);
        // Changes made here since the last sync go to the account first.
        if (last !== undefined && JSON.stringify(last) !== JSON.stringify(local)) {
          await store.remote.push(client, userId, local, last);
          value = store.remote.merge(local, value);
        } else if (last === undefined && JSON.stringify(local) !== JSON.stringify(store.empty)) {
          // A collection this device has never synced (one that did not exist at its last visit,
          // like the collection that replaced the saved pieces): nothing held here is dropped.
          const merged = store.remote.merge(local, value);
          await store.remote.push(client, userId, merged, value);
          value = merged;
        }
        store.replace(value);
        writeLast(userId, store, value);
      }
    }
    setStatus({ state: "idle", error: null });
  } catch (error) {
    setStatus({ state: navigator.onLine ? "error" : "offline", error: error.message ?? String(error) });
  }

  for (const store of synced()) session.unsubscribers.push(store.onChange(() => schedule(store)));
  const online = () => flushAll();
  window.addEventListener("online", online);
  session.unsubscribers.push(() => window.removeEventListener("online", online));
}

export function stopSync({ signedOut = false } = {}) {
  if (session) {
    session.unsubscribers.forEach((unsubscribe) => unsubscribe());
    session.timers.forEach((timer) => clearTimeout(timer));
    if (signedOut) {
      // The account's data leaves this browser with the account.
      for (const store of synced()) {
        store.replace(store.empty);
        try {
          localStorage.removeItem(lastKey(session.userId, store.name));
        } catch {
          /* storage blocked */
        }
      }
    }
  }
  session = null;
  setStatus({ state: "idle", error: null });
}
