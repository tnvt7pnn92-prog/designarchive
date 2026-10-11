// The visitor's collection: every piece they own, are looking for, have seen around or simply
// saved — one label each, one state at a time. It replaces the two older lists (the heart's
// "saved" and "Looking for"): what a browser already held under those keys is carried over the
// first time this module loads. Kept in this browser and, with an account, in the `collection`
// table (see lib/userData.js and lib/sync.js).
import { createStore, useStore } from "./userData.js";

// own: "I own it" · want: "Looking for" (budget, notes) · seen: "Seen" (where, when) · saved: the heart
export const STATUSES = ["own", "want", "seen", "saved"];

const EMPTY = [];
const MAX = 2000;
const OLD_SAVED = "design-archive:saved";
const OLD_WISHLIST = "design-archive:wishlist";

function normalizeItem(item) {
  if (!item || typeof item.id !== "string" || !item.id) return null;
  const price = item.maxPrice === null || item.maxPrice === undefined || item.maxPrice === "" ? NaN : Number(item.maxPrice);
  const addedAt = item.addedAt ?? new Date().toISOString();
  return {
    id: item.id,
    status: STATUSES.includes(item.status) ? item.status : "saved",
    maxPrice: Number.isFinite(price) && price >= 0 ? Math.round(price) : null,
    notes: typeof item.notes === "string" ? item.notes.slice(0, 500) : "",
    place: typeof item.place === "string" ? item.place.slice(0, 120) : "",
    seenOn: /^\d{4}-\d{2}-\d{2}$/.test(item.seenOn ?? "") ? item.seenOn : null,
    addedAt,
    updatedAt: item.updatedAt ?? addedAt,
  };
}

function normalize(value) {
  if (!Array.isArray(value)) return EMPTY;
  const seen = new Set();
  const out = [];
  for (const raw of value) {
    const item = normalizeItem(raw);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out.slice(0, MAX);
}

// The two older lists as one: what was in "Looking for" keeps its budget and notes and becomes
// `want`; the hearts become `saved`, in the order they were in (newest first). A piece in both
// is `want`.
export function fromLegacy(savedIds, wishlist, now = Date.now()) {
  const wanted = Array.isArray(wishlist) ? wishlist.filter((item) => item && typeof item.id === "string") : [];
  const wantedIds = new Set(wanted.map((item) => item.id));
  const saved = (Array.isArray(savedIds) ? savedIds : []).filter((id) => typeof id === "string" && !wantedIds.has(id));
  return normalize([
    ...wanted.map((item) => ({ ...item, status: "want" })),
    ...saved.map((id, i) => ({ id, status: "saved", addedAt: new Date(now - i).toISOString() })),
  ]);
}

function readOld(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// Union by piece; when both sides have the same piece, the most recently edited wins.
export function mergeCollection(local, remote) {
  const byId = new Map(remote.map((item) => [item.id, item]));
  for (const item of local) {
    const other = byId.get(item.id);
    if (!other || item.updatedAt > other.updatedAt) byId.set(item.id, item);
  }
  return normalize([...byId.values()].sort((a, b) => b.addedAt.localeCompare(a.addedAt)));
}

const toRow = (userId, item) => ({
  user_id: userId,
  piece_id: item.id,
  status: item.status,
  max_price: item.maxPrice,
  notes: item.notes,
  place: item.place,
  seen_on: item.seenOn,
  created_at: item.addedAt,
  updated_at: item.updatedAt,
});

const fromRow = (row) => ({
  id: row.piece_id,
  status: row.status,
  maxPrice: row.max_price,
  notes: row.notes ?? "",
  place: row.place ?? "",
  seenOn: row.seen_on,
  addedAt: row.created_at,
  updatedAt: row.updated_at,
});

export const collectionStore = createStore("collection", {
  key: "design-archive:collection",
  empty: EMPTY,
  normalize,
  migrate() {
    const saved = readOld(OLD_SAVED);
    const wishlist = readOld(OLD_WISHLIST);
    return saved === undefined && wishlist === undefined ? undefined : fromLegacy(saved, wishlist);
  },
  remote: {
    async pull(client, userId) {
      const { data, error } = await client
        .from("collection")
        .select("piece_id, status, max_price, notes, place, seen_on, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return normalize(data.map(fromRow));
    },
    merge: mergeCollection,
    added: (local, remote) => local.filter((item) => !remote.some((other) => other.id === item.id)).length,
    async push(client, userId, next, previous) {
      const changed = next.filter((item) => {
        const before = previous.find((other) => other.id === item.id);
        return !before || before.updatedAt !== item.updatedAt;
      });
      const removed = previous.filter((item) => !next.some((other) => other.id === item.id)).map((item) => item.id);
      // Removals first: moving a piece out of a full group must free its place before another
      // takes it.
      if (removed.length) {
        const { error } = await client.from("collection").delete().eq("user_id", userId).in("piece_id", removed);
        if (error) throw error;
      }
      if (changed.length) {
        const { error } = await client.from("collection").upsert(changed.map((item) => toRow(userId, item)), { onConflict: "user_id,piece_id" });
        if (error) throw error;
      }
    },
    // For the one-off import on first sign-in.
    toImport: (value) => value,
  },
});

// The old keys go once their content is safely under the new one.
if (typeof window !== "undefined" && !collectionStore.saveFailed()) {
  try {
    localStorage.removeItem(OLD_SAVED);
    localStorage.removeItem(OLD_WISHLIST);
  } catch {
    /* storage blocked: the old keys are simply never read again */
  }
}

export function useCollection() {
  return useStore(collectionStore);
}

export function statusOf(id) {
  return collectionStore.get().find((item) => item.id === id)?.status ?? null;
}

// Puts a piece in the collection with a state, or changes its state (newest first).
export function setStatus(id, status, patch = {}) {
  const now = new Date().toISOString();
  collectionStore.set((list) => {
    const current = list.find((item) => item.id === id);
    if (current) return list.map((item) => (item.id === id ? normalizeItem({ ...item, ...patch, status, updatedAt: now }) : item));
    return [normalizeItem({ id, ...patch, status, addedAt: now, updatedAt: now }), ...list].slice(0, MAX);
  });
}

export function updateItem(id, patch) {
  collectionStore.set((list) => list.map((item) => (item.id === id ? normalizeItem({ ...item, ...patch, updatedAt: new Date().toISOString() }) : item)));
}

export function removeFromCollection(ids) {
  const gone = new Set([].concat(ids));
  collectionStore.set((list) => list.filter((item) => !gone.has(item.id)));
}
