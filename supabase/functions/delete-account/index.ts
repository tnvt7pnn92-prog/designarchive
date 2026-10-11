// "Delete my account": removes the pictures of the shared moodboards, then deletes the person —
// every table row goes with them (foreign keys cascade). There is no undo.
import { admin, userFrom } from "../_shared/clients.ts";
import { fail, json, preflight } from "../_shared/http.ts";

async function removeFolder(bucket: string, prefix: string) {
  const { data: entries } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  const files = (entries ?? []).filter((entry) => entry.id).map((entry) => `${prefix}/${entry.name}`);
  for (let i = 0; i < files.length; i += 100) await admin.storage.from(bucket).remove(files.slice(i, i + 100));
}

Deno.serve(async (request) => {
  const early = preflight(request);
  if (early) return early;
  const user = await userFrom(request);
  if (!user) return fail(request, 401, "not_signed_in");

  try {
    await removeFolder("shared-boards", user.id);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch (error) {
    console.error("delete-account", error);
    return fail(request, 500, "failed");
  }
  return json(request, { ok: true });
});
