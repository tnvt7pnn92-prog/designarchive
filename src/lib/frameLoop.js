// One requestAnimationFrame loop for everything that moves with the pointer or the scroll, so a
// page with several animated parts still asks the browser for a single callback per frame. The
// loop runs only while something is subscribed and stops when the tab is hidden (the browser
// pauses rAF there anyway).
const subscribers = new Set();
let frame = 0;

function tick(time) {
  frame = 0;
  for (const fn of subscribers) fn(time);
  if (subscribers.size) frame = requestAnimationFrame(tick);
}

// Calls fn(time) on every frame until the returned function is called.
export function onFrame(fn) {
  subscribers.add(fn);
  if (!frame) frame = requestAnimationFrame(tick);
  return () => {
    subscribers.delete(fn);
    if (!subscribers.size && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

// Where the pointer is, shared by every subscriber (starts in the middle of the window).
export const pointer = { x: 0, y: 0, seen: false };
if (typeof window !== "undefined") {
  pointer.x = window.innerWidth / 2;
  pointer.y = window.innerHeight / 2;
  window.addEventListener(
    "pointermove",
    (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.seen = true;
    },
    { passive: true }
  );
}

export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, t) => a + (b - a) * t;
