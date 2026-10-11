// A prerendered page (scripts/prerender.mjs) is on screen before the app has started. The app
// renders beside it, hidden, and takes its place only once the page itself is ready — its code
// downloaded, its content drawn — so a first visit goes from the static page straight to the live
// one, without a blank or a skeleton in between.
let app = null;
let done = false;

export function prepareHandoff(container) {
  const prerendered = container.querySelector(":scope > .prerender");
  if (!prerendered) return container;
  app = document.createElement("div");
  app.className = "app-root";
  app.hidden = true;
  container.append(app);
  // Never stay on the static page: if the live one is slow or fails, show it anyway.
  setTimeout(revealApp, 12_000);
  return app;
}

export function revealApp() {
  if (done || !app) return;
  done = true;
  app.parentElement?.querySelector(":scope > .prerender")?.remove();
  app.hidden = false;
}
