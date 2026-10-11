// Where "near me" is: the device's position if the visitor asks for it (kept in memory for this
// visit only, never stored or sent), otherwise the city of the profile.
import { useSyncExternalStore } from "react";

let position = null; // { lat, lng, label: null }
let status = "idle"; // idle | asking | denied | unavailable
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());

export function askPosition() {
  if (!("geolocation" in navigator)) {
    status = "unavailable";
    emit();
    return;
  }
  status = "asking";
  emit();
  navigator.geolocation.getCurrentPosition(
    (result) => {
      position = { lat: result.coords.latitude, lng: result.coords.longitude };
      status = "idle";
      emit();
    },
    () => {
      status = "denied";
      emit();
    },
    { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 }
  );
}

export function forgetPosition() {
  position = null;
  emit();
}

let snapshot = { position, status };
export function useDevicePosition() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => {
      if (snapshot.position !== position || snapshot.status !== status) snapshot = { position, status };
      return snapshot;
    },
    () => snapshot
  );
}
