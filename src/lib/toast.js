import { useSyncExternalStore } from "react";

// A tiny message queue for the <Toaster/> at the bottom of the screen. Anything can call
// showToast(); only the newest few stay on screen and each one leaves by itself.
//   showToast({ message: "Added", action: { label: "Open", to: "/moodboard" } })
const LIFETIME = 3600;
const MAX_VISIBLE = 3;

let toasts = [];
let nextId = 1;
const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

export function dismissToast(id) {
  const before = toasts.length;
  toasts = toasts.filter((toast) => toast.id !== id);
  if (toasts.length !== before) emit();
}

export function showToast({ message, action, duration = LIFETIME }) {
  const id = nextId++;
  toasts = [...toasts, { id, message, action }].slice(-MAX_VISIBLE);
  emit();
  setTimeout(() => dismissToast(id), duration);
  return id;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useToasts() {
  return useSyncExternalStore(subscribe, () => toasts, () => toasts);
}
