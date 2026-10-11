// Who is visiting: nobody in particular ("guest"), or a signed-in account. Without an accounts
// service the status is "offline" and the site simply works in the browser.
//
// Two services can hold the accounts, chosen by the environment:
//   - Railway (VITE_API_URL): email + password, with name, date of birth and country of residence
//     (lib/account.js, server/). Saved pieces and boards stay in this browser.
//   - Supabase (VITE_SUPABASE_URL): email link or Google, with the synced collections and shared
//     moodboards (supabase-js loads only when needed).
import { useSyncExternalStore } from "react";
import { authPending, backendConfigured, getClient } from "./backend.js";
import { accountsConfigured, fetchMe, signIn, signOutAccount, signUp, storedToken } from "./account.js";
import { siteUrl } from "./site.js";

export const authProvider = accountsConfigured ? "railway" : backendConfigured ? "supabase" : null;

function initialStatus() {
  if (typeof window === "undefined") return authProvider ? "guest" : "offline";
  if (authProvider === "railway") return storedToken() ? "loading" : "guest";
  if (authProvider === "supabase") return authPending() ? "loading" : "guest";
  return "offline";
}

let state = { status: initialStatus(), user: null };
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());

function setState(patch) {
  state = { ...state, ...patch };
  emit();
}

export function useAuth() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state
  );
}

export const currentUser = () => state.user;

// ---------- Supabase ----------
let connecting = null;

function onUser(client, user) {
  const previous = state.user;
  if (user && user.id !== previous?.id) {
    setState({ status: "signedIn", user });
    import("./sync.js").then(({ startSync }) => startSync(client, user));
  } else if (!user && previous) {
    setState({ status: "guest", user: null });
    import("./sync.js").then(({ stopSync }) => stopSync({ signedOut: true }));
  } else if (!user) {
    setState({ status: "guest", user: null });
  }
}

// Loads the client and follows the session from then on. Safe to call many times.
export function connect() {
  if (authProvider !== "supabase") return Promise.resolve(null);
  connecting ??= getClient().then(async (client) => {
    const { data } = await client.auth.getSession();
    onUser(client, data.session?.user ?? null);
    client.auth.onAuthStateChange((_event, session) => onUser(client, session?.user ?? null));
    return client;
  });
  return connecting;
}

const redirectTo = () => siteUrl("/account");

export async function signInWithEmail(email) {
  const client = await connect();
  if (!client) return { error: { code: "not_configured" } };
  const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
  return { error };
}

export async function signInWithGoogle() {
  const client = await connect();
  if (!client) return { error: { code: "not_configured" } };
  const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
  return { error };
}

// ---------- Railway ----------
export async function signUpWithPassword(values) {
  const result = await signUp(values);
  if (result.data) setState({ status: "signedIn", user: result.data });
  return result;
}

export async function signInWithPassword(email, password) {
  const result = await signIn(email, password);
  if (result.data) setState({ status: "signedIn", user: result.data });
  return result;
}

// After the account page changes the personal data.
export function replaceUser(user) {
  if (state.status === "signedIn") setState({ user });
}

// ---------- both ----------
// Called once at start-up: looks for a session only if one may exist.
export function startAuth() {
  if (authProvider === "railway" && storedToken()) {
    fetchMe().then(({ data, error }) => {
      // Unreachable server: stay a guest for now, keep the token for the next visit.
      if (error || !data) setState({ status: "guest", user: null });
      else setState({ status: "signedIn", user: data });
    });
  } else if (authProvider === "supabase" && authPending()) {
    connect();
  }
}

export async function signOut() {
  if (authProvider === "railway") {
    await signOutAccount();
    setState({ status: "guest", user: null });
    return;
  }
  const client = await connect();
  if (client) await client.auth.signOut();
}

// The token of the current session, for calls to the server.
export async function accessToken() {
  if (!state.user) return null;
  if (authProvider === "railway") return storedToken();
  const client = await connect();
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}
