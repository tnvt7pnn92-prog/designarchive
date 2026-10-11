// Sharing a moodboard with a read-only public link (with an account). The owner's picture of the
// board goes to a public storage folder, and the board gets a random slug; /m/<slug> shows the
// picture and the pieces on it. Turning sharing off removes the slug, and the link stops working.
import { getClient } from "./backend.js";
import { currentUser } from "./auth.js";
import { boardPayload } from "./moodboard.js";
import { setShareSlug } from "./moodboards.js";

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function shareBoard(board, pngDataUrl) {
  const client = await getClient();
  const user = currentUser();
  if (!client || !user) return { error: { code: "not_signed_in" } };

  // The board must exist in the account before it can be shared.
  const { error: saveError } = await client.from("moodboards").upsert({
    id: board.id,
    user_id: user.id,
    title: board.title,
    content: boardPayload(board),
    created_at: board.createdAt,
    updated_at: board.updatedAt,
  });
  if (saveError) return { error: saveError };

  const blob = await dataUrlToBlob(pngDataUrl);
  const { error: uploadError } = await client.storage
    .from("shared-boards")
    .upload(`${user.id}/${board.id}.png`, blob, { upsert: true, contentType: "image/png" });
  if (uploadError) return { error: uploadError };

  const { data: slug, error } = await client.rpc("share_moodboard", { board: board.id });
  if (error) return { error };
  setShareSlug(board.id, slug);
  return { slug };
}

export async function unshareBoard(board) {
  const client = await getClient();
  if (!client) return { error: { code: "not_configured" } };
  const { error } = await client.rpc("unshare_moodboard", { board: board.id });
  if (error) return { error };
  setShareSlug(board.id, null);
  return {};
}

// What a shared link shows: title, date, the picture and the pieces on the board.
export async function loadSharedBoard(slug) {
  const client = await getClient();
  if (!client) return { error: { code: "not_configured" } };
  const { data, error } = await client.rpc("get_shared_moodboard", { slug });
  if (error || !data) return { error: error ?? { code: "not_found" } };
  const { data: file } = client.storage.from("shared-boards").getPublicUrl(data.preview_path);
  return { board: { ...data, previewUrl: `${file.publicUrl}?v=${encodeURIComponent(data.updated_at)}` } };
}
