import { StrictMode, startTransition } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import App from "./App.jsx";
import { initialLanguage, loadDictionary } from "./i18n/dictionaries.js";
import { prepareHandoff } from "./lib/handoff.js";

// Pages written by scripts/prerender.mjs arrive with their content already in place: the app
// renders beside it and takes over when its page is ready (lib/handoff.js).
const container = prepareHandoff(document.getElementById("root"));

// The first render already speaks the visitor's language (English if its file cannot load).
// A promise rather than a top-level await, which would split the bundle into many small files.
// The first render runs as a transition: React works in slices of a few milliseconds, so the
// browser can paint (the static page, its photo) and answer taps while the app starts.
loadDictionary(initialLanguage())
  .catch(() => null)
  .then(() => {
    const root = createRoot(container);
    startTransition(() => {
      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      );
    });
  });
