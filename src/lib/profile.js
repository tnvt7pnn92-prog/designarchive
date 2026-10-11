// The visitor's profile: a name, the preferred language, a city (optional, for the markets
// nearby) and an optional role. Guests can set the city too; with an account it is kept in the
// `profiles` table.
import { createStore, useStore } from "./userData.js";

export const ROLES = ["enthusiast", "homeowner", "professional"];

const EMPTY = { name: "", lang: null, city: "", role: null, updatedAt: null };

function normalize(value) {
  if (!value || typeof value !== "object") return EMPTY;
  return {
    name: typeof value.name === "string" ? value.name.slice(0, 80) : "",
    lang: typeof value.lang === "string" ? value.lang : null,
    city: typeof value.city === "string" ? value.city.slice(0, 80) : "",
    role: ROLES.includes(value.role) ? value.role : null,
    updatedAt: value.updatedAt ?? null,
  };
}

// Field by field, the account's value wins unless this browser has one and the account does not.
export function mergeProfile(local, remote) {
  return normalize({
    name: remote.name || local.name,
    lang: remote.lang ?? local.lang,
    city: remote.city || local.city,
    role: remote.role ?? local.role,
    updatedAt: remote.updatedAt ?? local.updatedAt,
  });
}

export const profileStore = createStore("profile", {
  key: "design-archive:profile",
  empty: EMPTY,
  normalize,
  remote: {
    async pull(client, userId) {
      const { data, error } = await client.from("profiles").select("name, lang, city, role, updated_at").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data ? normalize({ ...data, updatedAt: data.updated_at }) : EMPTY;
    },
    merge: mergeProfile,
    added: () => 0,
    async push(client, userId, next) {
      const { error } = await client.from("profiles").upsert({
        id: userId,
        name: next.name,
        lang: next.lang,
        city: next.city,
        role: next.role,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    toImport: (value) => value,
  },
});

export function useProfile() {
  return useStore(profileStore);
}

export function updateProfile(patch) {
  profileStore.set((profile) => normalize({ ...profile, ...patch, updatedAt: new Date().toISOString() }));
}
