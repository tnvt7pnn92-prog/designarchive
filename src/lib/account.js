// Accounts on the Railway API (server/): email and password, with first name, last name, date of
// birth and country of residence. Active when VITE_API_URL is set (the address Railway gives the service).
//
// The session is a token kept in this browser; every call sends it as "Authorization: Bearer".
// The API lives on another domain than the site, where cookies would be third-party (blocked by
// several browsers), hence the token.

export const API_URL = (import.meta.env?.VITE_API_URL ?? "").replace(/\/$/, "");
export const accountsConfigured = Boolean(API_URL);

const TOKEN_KEY = "design-archive:session";

export function storedToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked: the session lasts as long as the page */
  }
}

// One call: { data } or { error: { code, status, errors } } — never throws.
async function api(method, path, body, token = storedToken()) {
  if (!accountsConfigured) return { error: { code: "not_configured" } };
  try {
    const response = await fetch(API_URL + path, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) return { error: { code: payload?.error ?? "server_error", status: response.status, errors: payload?.errors ?? {} } };
    return { data: payload };
  } catch {
    return { error: { code: "network" } };
  }
}

// The user as the rest of the site reads it (the same shape the Supabase user had where it
// matters: id, email, a display name).
export const toSiteUser = (u) =>
  u && {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    birthDate: u.birthDate,
    country: u.country,
    user_metadata: { full_name: [u.firstName, u.lastName].filter(Boolean).join(" ") },
  };

export async function fetchMe() {
  if (!storedToken()) return { data: null };
  const result = await api("GET", "/me");
  if (result.error?.status === 401) storeToken(null);
  return result.error ? result : { data: toSiteUser(result.data.user) };
}

export async function signUp(values) {
  const result = await api("POST", "/auth/signup", values, null);
  if (result.data) storeToken(result.data.token);
  return result.error ? result : { data: toSiteUser(result.data.user) };
}

export async function signIn(email, password) {
  const result = await api("POST", "/auth/login", { email, password }, null);
  if (result.data) storeToken(result.data.token);
  return result.error ? result : { data: toSiteUser(result.data.user) };
}

export async function signOutAccount() {
  await api("POST", "/auth/logout");
  storeToken(null);
}

export const forgotPassword = (email) => api("POST", "/auth/forgot", { email }, null);
export const resetPassword = (token, password) => api("POST", "/auth/reset", { token, password }, null);
export const changePassword = (current, password) => api("POST", "/me/password", { current, password });

export async function updateMe(patch) {
  const result = await api("PATCH", "/me", patch);
  return result.error ? result : { data: toSiteUser(result.data.user) };
}

export async function deleteMe(password) {
  const result = await api("DELETE", "/me", { password });
  if (!result.error) storeToken(null);
  return result;
}
