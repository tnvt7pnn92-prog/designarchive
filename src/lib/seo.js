// One description of what each page is called and says about itself. The app sets it on the
// document while navigating; from stage 3 the prerender script writes the very same values into
// the static HTML, so the tab title and the social preview cannot drift apart.
import { STATS } from "../data/homeData.js";
import { MARKET_COUNT } from "../data/stats.js";

export const SITE_NAME = "Design Archive";

const clamp = (text, max = 160) => {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
};

export const siteTitle = (title) => (title ? `${title} · ${SITE_NAME}` : SITE_NAME);

export function seoForPiece(object) {
  return {
    title: siteTitle(`${object.name} — ${object.designer}`),
    description: clamp(`${object.name}, ${object.designer}, ${object.year}${object.brand ? ` for ${object.brand}` : ""}. ${object.description}`),
    path: `/piece/${object.id}`,
    type: "article",
  };
}

export function seoForDesigner(entry) {
  const years = entry.objects.map((o) => o.year);
  const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "";
  return {
    title: siteTitle(entry.name),
    description: clamp(`${entry.objects.length} pieces by ${entry.name} in the Design Archive${span ? `, ${span}` : ""}: ${entry.objects.slice(0, 5).map((o) => o.name).join(", ")}.`),
    path: `/designer/${entry.slug}`,
    type: "profile",
  };
}

export function seoForStory(story) {
  return {
    title: siteTitle(story.title),
    description: clamp(story.hook),
    path: `/stories/${story.id}`,
    type: "article",
  };
}

// A city of the markets section: "Vintage and antique markets in Milan".
export function seoForMarketCity(city) {
  return {
    title: siteTitle(`Vintage and antique markets in ${city.name}`),
    description: clamp(`${city.count} flea markets, antique fairs, design galleries and vintage shops in and around ${city.name}${city.country ? `, ${city.country}` : ""}, with their next dates and a map.`),
    path: `/markets/${city.slug}`,
  };
}

// One place: what it is, where, and how often.
export function seoForMarketPlace(market, citySlug) {
  const city = market.city.split(",")[0].trim();
  return {
    title: siteTitle(`${market.name}, ${city}`),
    description: clamp(`${market.name} in ${city}: ${market.frequency}. ${market.description ?? ""}`),
    path: `/markets/${citySlug}/${market.id}`,
  };
}

// Plain pages. The copy is intentionally short and factual: it is what shows up under a link.
export const ROUTE_SEO = {
  "/": {
    title: siteTitle(),
    description: `An archive of ${STATS.pieces} design pieces — chairs, lamps, tables and objects — each one photographed, dated and credited, with the markets where you can still find them.`,
  },
  "/archive": {
    title: siteTitle("Archive"),
    description: `Browse ${STATS.pieces} design pieces by category, style, decade, designer, brand, country and material.`,
  },
  "/markets": {
    title: siteTitle("Design markets, galleries and vintage shops: an international guide"),
    description: `A curated guide to ${MARKET_COUNT} flea markets, design galleries, vintage shops, antiques markets and fairs around the world, to search by city, country and kind.`,
  },

  "/designers": {
    title: siteTitle("Designers"),
    description: `${STATS.designers} designers in the archive, from a single piece to a lifetime of them.`,
  },
  "/moodboard": {
    title: siteTitle("Your room"),
    description: "Drag archive pieces, materials and colours onto a board and export it as an image.",
  },
  "/stories": {
    title: siteTitle("Stories"),
    description: "A new design story every day: icons, auction records, trends and practical guides.",
  },
  "/collection": {
    title: siteTitle("My collection"),
    description: "The design pieces you own, are looking for, have seen or saved: one museum label each.",
  },
  "/registrati": {
    title: siteTitle("Sign up"),
    description: "Create a free Design Archive account: your collection and moodboards on every device. No password needed.",
  },
  "/accedi": {
    title: siteTitle("Sign in"),
    description: "Sign in to Design Archive with an email link or Google.",
  },
  "/privacy": {
    title: siteTitle("Privacy"),
    description: "What Design Archive keeps, why, where and for how long — and how to download or delete it.",
  },

  "/account": {
    title: siteTitle("Account"),
    description: "Your profile and your data.",
  },
  "/credits": {
    title: siteTitle("Photo credits"),
    description: "Every photograph in the archive, with its author, licence and the page it came from.",
  },
};

export function seoForRoute(path) {
  return ROUTE_SEO[path] ?? ROUTE_SEO["/"];
}
