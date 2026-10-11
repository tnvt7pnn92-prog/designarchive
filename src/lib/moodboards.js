// Several moodboards per visitor. Each board has a title, its content (the format of
// lib/moodboard.js, with its version number), dates and an optional public share link. Kept in
// this browser (lib/userData.js) and, with an account, in the `moodboards` table.
//
// The board being edited is `activeId`; MoodboardContext loads it into the editor and writes the
// editor's changes back here.
import { boardContent, boardPayload, DEFAULT_FORMAT, legacyBoardKeys, loadBoard } from "./moodboard.js";
import { createStore, useStore } from "./userData.js";

const now = () => new Date().toISOString();

export function newBoardId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16)
  );
}

function makeBoard({ title = "", content, id = newBoardId() } = {}) {
  const stamp = now();
  return { id, title, createdAt: stamp, updatedAt: stamp, shareSlug: null, ...boardContent(content) };
}

function normalizeBoard(board) {
  if (!board || typeof board.id !== "string") return null;
  return {
    id: board.id,
    title: typeof board.title === "string" ? board.title.slice(0, 80) : "",
    createdAt: board.createdAt ?? now(),
    updatedAt: board.updatedAt ?? board.createdAt ?? now(),
    shareSlug: typeof board.shareSlug === "string" ? board.shareSlug : null,
    ...boardContent(board),
  };
}

// There is always at least one board, and the active one exists.
function normalize(value) {
  const boards = (Array.isArray(value?.boards) ? value.boards : []).map(normalizeBoard).filter(Boolean);
  const unique = boards.filter((board, i) => boards.findIndex((other) => other.id === board.id) === i);
  if (!unique.length) unique.push(makeBoard({ content: { format: DEFAULT_FORMAT } }));
  const activeId = unique.some((board) => board.id === value?.activeId) ? value.activeId : unique[0].id;
  return { activeId, boards: unique };
}

// The board saved before several were possible becomes the first one.
function migrate() {
  const legacy = loadBoard();
  const board = makeBoard({ content: legacy });
  try {
    for (const key of legacyBoardKeys()) localStorage.removeItem(key);
  } catch {
    /* storage blocked */
  }
  return { activeId: board.id, boards: [board] };
}

// Union by id; when both sides have the same board, the most recently edited wins. An empty,
// untouched board created on this device is dropped if the account already has boards.
export function mergeBoards(local, remote) {
  if (!remote.boards.length) return local;
  const byId = new Map(remote.boards.map((board) => [board.id, board]));
  for (const board of local.boards) {
    const blank = !board.elements.length && !board.title;
    const other = byId.get(board.id);
    if (!other && blank) continue;
    if (!other || board.updatedAt > other.updatedAt) byId.set(board.id, board);
  }
  const boards = [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return normalize({ activeId: local.activeId, boards });
}

const toRow = (userId, board) => ({
  id: board.id,
  user_id: userId,
  title: board.title,
  content: boardPayload(board),
  created_at: board.createdAt,
  updated_at: board.updatedAt,
});

export const moodboardsStore = createStore("moodboards", {
  key: "design-archive:moodboards",
  empty: normalize(null),
  normalize,
  migrate,
  remote: {
    async pull(client, userId) {
      const { data, error } = await client
        .from("moodboards")
        .select("id, title, content, share_slug, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const boards = data.map((row) =>
        normalizeBoard({ id: row.id, title: row.title, ...row.content, shareSlug: row.share_slug, createdAt: row.created_at, updatedAt: row.updated_at })
      );
      return { activeId: null, boards: boards.filter(Boolean) };
    },
    merge: mergeBoards,
    added: (local, remote) =>
      local.boards.filter((board) => (board.elements.length || board.title) && !remote.boards.some((other) => other.id === board.id)).length,
    async push(client, userId, next, previous) {
      const changed = next.boards.filter((board) => {
        const before = previous.boards.find((other) => other.id === board.id);
        return !before || before.updatedAt !== board.updatedAt;
      });
      const removed = previous.boards.filter((board) => !next.boards.some((other) => other.id === board.id)).map((b) => b.id);
      if (changed.length) {
        const { error } = await client.from("moodboards").upsert(changed.map((board) => toRow(userId, board)));
        if (error) throw error;
      }
      if (removed.length) {
        const { error } = await client.from("moodboards").delete().eq("user_id", userId).in("id", removed);
        if (error) throw error;
      }
    },
    toImport: (value) => value.boards,
  },
});

export function useMoodboards() {
  return useStore(moodboardsStore);
}

export function activeBoard(state = moodboardsStore.get()) {
  return state.boards.find((board) => board.id === state.activeId) ?? state.boards[0];
}

export function setActiveBoard(id) {
  moodboardsStore.set((state) => (state.boards.some((b) => b.id === id) && state.activeId !== id ? { ...state, activeId: id } : state));
}

// The editor's changes to the active board: its elements, ground, and sheet details (format,
// title block, real-scale room width).
export function saveActiveContent(elements, background, sheet = {}) {
  const stamp = now();
  moodboardsStore.set((state) => ({
    ...state,
    boards: state.boards.map((board) => (board.id === state.activeId ? { ...board, ...sheet, elements, background, updatedAt: stamp } : board)),
  }));
  return stamp;
}

// A new board, opened at once. `content` can start it from a template or the collection;
// a new board is an A3 sheet unless another format is chosen.
export function createBoard(title = "", content = {}) {
  const board = makeBoard({ title, content: { format: DEFAULT_FORMAT, background: "paper", ...content } });
  moodboardsStore.set((state) => ({ activeId: board.id, boards: [...state.boards, board] }));
  return board.id;
}

export function duplicateBoard(id, title) {
  const source = moodboardsStore.get().boards.find((board) => board.id === id);
  if (!source) return null;
  const board = makeBoard({ title, content: source });
  moodboardsStore.set((state) => ({ activeId: board.id, boards: [...state.boards, board] }));
  return board.id;
}

export function renameBoard(id, title) {
  moodboardsStore.set((state) => ({
    ...state,
    boards: state.boards.map((board) => (board.id === id ? { ...board, title: title.slice(0, 80), updatedAt: now() } : board)),
  }));
}

export function deleteBoard(id) {
  moodboardsStore.set((state) => {
    if (state.boards.length < 2) return state;
    const boards = state.boards.filter((board) => board.id !== id);
    return normalize({ activeId: state.activeId === id ? boards[0].id : state.activeId, boards });
  });
}

export function setShareSlug(id, shareSlug) {
  moodboardsStore.replace({
    ...moodboardsStore.get(),
    boards: moodboardsStore.get().boards.map((board) => (board.id === id ? { ...board, shareSlug } : board)),
  });
}
