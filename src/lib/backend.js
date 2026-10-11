// The link to Supabase (accounts, database, server functions). Everything here is optional:
// without VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the environment the site works as a
// plain static site, saving in the browser, and the account features say they are not active.
//
// Only the public "anon" key ever reaches the browser. The secret service role key lives in the
// server functions under supabase/functions and nowhere else.
const URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const backendConfigured = Boolean(URL && ANON_KEY);

// Where supabase-js keeps the session in the browser.
export const AUTH_STORAGE_KEY = "design-archive:auth";

let clientPromise = null;

// The Supabase client, loaded on demand: the library is only downloaded by visitors who sign in
// (or already are), so the site stays as light as before for everyone else.
export function getClient() {
  if (!backendConfigured) return Promise.resolve(null);
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(URL, ANON_KEY, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: AUTH_STORAGE_KEY,
      },
    })
  );
  return clientPromise;
}

// Whether this browser has signed in before, or is coming back from a sign-in link: the two
// cases in which the client must load straight away.
export function authPending() {
  if (!backendConfigured) return false;
  try {
    if (localStorage.getItem(AUTH_STORAGE_KEY)) return true;
  } catch {
    /* storage blocked */
  }
  const params = new URLSearchParams(window.location.search);
  return params.has("code") || window.location.hash.includes("access_token");
}

// Calls a server function (supabase/functions/<name>) with the visitor's session, if any.
// Returns { data, error } like the Supabase client, never throws.
export async function callFunction(name, body, { method = "POST" } = {}) {
  const client = await getClient();
  if (!client) return { data: null, error: { code: "not_configured" } };
  const { data, error } = await client.functions.invoke(name, { body, method });
  if (!error) return { data, error: null };
  // Server functions answer errors with a JSON body { code, message }: surface it.
  let detail = { code: "network", message: error.message };
  try {
    const response = error.context;
    if (response && typeof response.json === "function") detail = { ...detail, ...(await response.json()) };
  } catch {
    /* not JSON */
  }
  return { data: null, error: detail };
}
