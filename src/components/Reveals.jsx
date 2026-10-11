import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Fades in every [data-reveal] element as it scrolls into view, on every page. Only elements that
// start below the fold are hidden, and only when IntersectionObserver exists to show them again;
// with less motion requested the CSS shows them straight away.
export default function Reveals() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const main = document.getElementById("main");
    if (!main) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.dataset.revealState = "shown";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    );

    let timer;
    const scan = () => {
      // All the measuring first, then all the writing: interleaving them would make the browser
      // lay the page out again for every element.
      const nodes = [...main.querySelectorAll("[data-reveal]:not([data-reveal-state])")];
      const fold = window.innerHeight;
      const below = nodes.map((node) => node.getBoundingClientRect().top > fold);
      nodes.forEach((node, i) => {
        node.dataset.revealState = below[i] ? "pending" : "shown";
        if (below[i]) observer.observe(node);
      });
    };
    // Lazy routes and data arrive after the first render: look again whenever the page changes.
    const mutations = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(scan, 60);
    });
    mutations.observe(main, { childList: true, subtree: true });
    scan();

    return () => {
      clearTimeout(timer);
      mutations.disconnect();
      observer.disconnect();
      // Anything still waiting is looked at afresh by the next scan (visible again meanwhile).
      for (const node of main.querySelectorAll('[data-reveal-state="pending"]')) delete node.dataset.revealState;
    };
  }, [pathname]);

  return null;
}
