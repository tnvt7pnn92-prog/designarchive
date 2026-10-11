import { useEffect } from "react";

// Keeps the tab title and the description in step while navigating inside the app. The static
// tags written at build time cover crawlers, which never run this.
function setMeta(selector, create, content) {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = create();
    document.head.appendChild(tag);
  }
  tag.setAttribute(selector.startsWith("link") ? "href" : "content", content);
}

export function useDocumentMeta({ title, description } = {}) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      setMeta('meta[name="description"]', () => {
        const el = document.createElement("meta");
        el.setAttribute("name", "description");
        return el;
      }, description);
    }
  }, [title, description]);
}
