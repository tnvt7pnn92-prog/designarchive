// Where the markets guide's requests go (a shop asking to be listed, a place suggested, a
// correction). The site has no server of its own: the form writes the email and the visitor's mail
// app sends it. The address comes from the build (VITE_CONTACT_EMAIL, set from the repository
// variable CONTACT_EMAIL); without one the forms say they are coming soon and send nothing.
export const CONTACT_EMAIL = (import.meta.env?.VITE_CONTACT_EMAIL ?? "").trim();

export const mailto = ({ subject, body }) => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

// A web address (with or without https://) or an Instagram handle (with or without @).
export function validLink(value) {
  const v = value.trim();
  if (!v) return true;
  if (/^@?[A-Za-z0-9._]{2,30}$/.test(v) && !v.includes("..")) return true;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}
