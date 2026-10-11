// Writes a real HTML file for every page of the site, after `vite build`.
//
// The app is a single-page app: without this, every address is served the same empty shell and
// search engines and social networks see nothing but "Design Archive". Each file written here is
// that same shell with, for its own page:
//   - the title, description and canonical address;
//   - Open Graph and Twitter tags, with the piece's own photo, for link previews;
//   - JSON-LD (Product/CreativeWork for pieces, Person for designers, Article for stories);
//   - hreflang links to the five language versions (?lang=xx, read by LanguageContext);
//   - the page's content as plain HTML, readable without JavaScript. The app replaces it as soon
//     as it starts, so visitors only ever see it for a moment, laid out like the real page.
// It also writes sitemap.xml and robots.txt.
//
// Files are named /piece/<id>.html: GitHub Pages and `vite preview` both answer /piece/<id> with
// that file, so the addresses stay exactly the ones the app uses.
//
// The absolute address of the site comes from SITE_URL (set by the deploy workflow), e.g.
// https://<user>.github.io/design-archive — without it the files point at the local preview.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);

const { OBJECTS, CATEGORIES, decadeOf } = await load("src/data/objects.js");
const { BY_CATEGORY, BY_DESIGNER } = await load("src/data/indexes.js");
const { publishedStories, storyOfTheDay } = await load("src/data/stories.js");
const { OBJECT_PHOTOS, photoPage, photoSource } = await load("src/data/objectPhotos.js");
const { PROMO_IMAGES } = await load("src/data/promoImages.js");
const { PIECE_HERO_SIZES, responsiveSrcSet } = await load("src/lib/imageUrls.js");
const { STATS, TIME, RIBBON } = await load("src/data/homeData.js");
const { MARKET_COUNT } = await load("src/data/stats.js");
const { labelSvg, storySvg, renderPng } = await load("scripts/lib/og-label.mjs");
const { SITE_NAME, ROUTE_SEO, seoForDesigner, seoForPiece, seoForStory, seoForRoute, seoForMarketCity, seoForMarketPlace } = await load("src/lib/seo.js");
const { MARKET_CITIES, placesIn, marketPath, cityPath, cityNameOf, countryOf } = await load("src/lib/marketPlaces.js");
const { marketSchedule } = await load("src/lib/marketDates.js");
const { dateKey } = await load("src/lib/today.js");
const en = (await load("src/i18n/dictionaries/en.js")).default;

const LANGS = ["en", "it", "es", "fr", "zh"];
const OG_LOCALES = { en: "en_GB", it: "it_IT", es: "es_ES", fr: "fr_FR", zh: "zh_CN" };

const BASE = (process.env.VITE_BASE ?? "/").replace(/\/?$/, "/");
const SITE = (process.env.SITE_URL || `http://localhost:4173${BASE}`).replace(/\/+$/, "");
if (!process.env.SITE_URL) console.warn(`prerender: SITE_URL not set, absolute links point at ${SITE}`);

const today = dateKey();
const byId = new Map(OBJECTS.map((o) => [o.id, o]));
const designerSlug = (name) => [...BY_DESIGNER.values()].find((d) => d.name === name)?.slug;

// ---------- helpers ----------
const esc = (text) =>
  String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const link = (p) => `${BASE}${p.replace(/^\//, "")}`;
const abs = (p) => (p === "/" ? `${SITE}/` : `${SITE}${p}`);
const label = (group, key) => en[group]?.[key] ?? key;
const a = (p, text, attrs = "") => `<a href="${esc(link(p))}"${attrs}>${esc(text)}</a>`;
const archiveLink = (key, value) => `/archive?${key}=${encodeURIComponent(value)}`;
const list = (items) => `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;

// ---------- the pages ----------
const pages = [];

// The same sections as the app's header (src/lib/nav.js), in English.
const { NAV_ITEMS } = await load("src/lib/nav.js");
const NAV = NAV_ITEMS.map((item) => [item.to, item.key.split(".").reduce((node, part) => node?.[part], en)]);

function pieceLinks(objects) {
  return list(objects.map((o) => `${a(`/piece/${o.id}`, o.name)} <span>${esc(o.designer)}, ${o.year}</span>`));
}

// Home
{
  const seo = seoForRoute("/");
  pages.push({
    path: "/",
    seo,
    image: PROMO_IMAGES.hero.image,
    // The hero with the app's own markup and classes (Home.css is in the main stylesheet), standing
    // still (is-settled): the title, the lede and a search that works before any JavaScript runs.
    // The live page takes its place without playing the entrance again.
    hero: `
      <div class="home-page is-settled">
        <section class="home-hero">
          <div class="home-wrap home-hero__grid">
            <div class="home-hero__text">
              <p class="home-eyebrow">${esc(en.home.eyebrow.replace("{pieces}", STATS.pieces.toLocaleString("en-GB")).replace("{designers}", STATS.designers.toLocaleString("en-GB")))}</p>
              <h1>${esc(en.home.titleLead)} <span class="home-rotator"><span aria-hidden="true" class="is-on"><em>${esc(en.home.titleWords.split("|")[0])}</em></span></span><br><em>${esc(en.home.title2)}</em></h1>
              <p class="home-hero__lede">${esc(en.home.lede)}</p>
              <div class="home-search"><form role="search" action="${esc(link("/archive"))}"><input type="search" name="q" aria-label="${esc(en.home.searchButton)}" placeholder="${esc(en.home.searchPlaceholder)}"><button type="submit" class="home-btn home-btn--gold">${esc(en.home.searchButton)}</button></form></div>
              <p class="home-hero__facts"><span><b>${STATS.pieces.toLocaleString("en-GB")}</b> ${esc(en.home.factPieces)}</span><span><b>${MARKET_COUNT.toLocaleString("en-GB")}</b> ${esc(en.home.factPlaces.replace("{countries}", STATS.marketCountries))}</span><span><b>${STATS.stories}</b> ${esc(en.home.factStories)}</span></p>
            </div>
            <div class="home-orbit" aria-hidden="true"></div>
          </div>
        </section>
      </div>`,
    jsonld: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: abs("/"),
        description: seo.description,
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${abs("/archive")}?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ],
    body: `
      <h2>${esc(en.nav.archive)}</h2>
      ${list(CATEGORIES.map((c) => `${a(archiveLink("category", c), label("categories", c))} <span>${(BY_CATEGORY.get(c) ?? []).length}</span>`))}
      <h2>${esc(`${en.home.roomsTitle} ${en.home.roomsTitleEm}`)}</h2>
      ${list(
        [
          ["/archive", en.nav.archive, en.home.rooms.archive.text],
          ["/designers", en.designers.title, en.home.rooms.designers.text],
          ["/markets", en.nav.markets, en.home.rooms.markets.text.replace("{countries}", STATS.marketCountries)],
          ["/stories", en.nav.stories, en.home.rooms.stories.text],
          ["/collection", en.nav.collection, en.home.rooms.collection.text],
          ["/moodboard", en.nav.moodboard, en.home.rooms.moodboard.text],
        ].map(([to, title, text]) => `${a(to, title)} — ${esc(text)}`)
      )}
      <h2>${esc(en.home.stepsEyebrow)}</h2>
      ${list(["search", "keep", "find"].map((s) => `<strong>${esc(en.home.steps[s].title)}</strong> — ${esc(en.home.steps[s].text)}`))}
      <h2>${esc(`${en.home.timeTitle.replace("{from}", TIME[0].year).replace("{to}", TIME.at(-1).year)} ${en.home.timeTitleEm}`)}</h2>
      ${pieceLinks(TIME)}
      <h2>${esc(en.home.ribbonLabel)}</h2>
      ${pieceLinks(RIBBON)}`,
  });
}

// Plain sections
const SECTION_BODIES = {
  "/archive": () => `
      <h1>${esc(en.archive.title)}</h1>
      <p class="prerender__feature prerender__feature--text">${esc(en.archive.subtitle)}</p>
      ${CATEGORIES.map((c) => `<h2>${a(archiveLink("category", c), label("categories", c))}</h2>${pieceLinks(BY_CATEGORY.get(c) ?? [])}`).join("")}`,
  "/designers": () => `
      <h1>${esc(en.designers.title)}</h1>
      <p class="prerender__lede">${esc(en.designers.subtitle.replace("{count}", STATS.designers))}</p>
      ${list([...BY_DESIGNER.values()].sort((x, y) => x.name.localeCompare(y.name)).map((d) => `${a(`/designer/${d.slug}`, d.name)} <span>${d.objects.length}</span>`))}`,
  "/stories": () => `
      <h1>${esc(`${en.stories.titleA} ${en.stories.titleB}`)}</h1>
      <p class="prerender__lede">${esc(ROUTE_SEO["/stories"].description)}</p>
      <span class="eyebrow">${esc(en.stories.storyOfDay)}</span>
      <p class="prerender__feature">${a(`/stories/${storyOfTheDay(today).id}`, storyOfTheDay(today).title)}</p>
      ${list(publishedStories(today).map((s) => `${a(`/stories/${s.id}`, s.title)} <span>${esc(s.hook)}</span>`))}`,
  "/markets": () => `
      <h1>${esc(`${en.markets.planner.title1} ${en.markets.planner.title2} ${en.markets.planner.title3}`)}</h1>
      <p class="prerender__feature prerender__feature--text">${esc(ROUTE_SEO["/markets"].description)}</p>
      <h2>${esc(en.markets.planner.citiesTitle)}</h2>
      ${list(MARKET_CITIES.map((city) => `${a(cityPath(city.slug), city.name)} <span>${city.count}</span>`))}`,
  "/moodboard": () => `<h1>${esc(en.nav.moodboard)}</h1><p class="prerender__lede">${esc(ROUTE_SEO["/moodboard"].description)}</p>`,
  "/credits": () => `<h1>${esc(ROUTE_SEO["/credits"].title.split(" · ")[0])}</h1><p class="prerender__lede">${esc(ROUTE_SEO["/credits"].description)}</p>`,
  "/collection": () => `<h1>${esc(en.nav.collection)}</h1><p class="prerender__lede">${esc(en.collection.intro)}</p>`,
  "/privacy": () => `
      <h1>${esc(en.privacy.title)}</h1>
      ${["summary", "local", "account", "why", "who", "retention", "rights", "cookies", "contact"]
        .map((s) => `<h2>${esc(en.privacy[`${s}Title`])}</h2><p>${esc(en.privacy[`${s}Text`])}</p>`)
        .join("")}`,
  "/account": () => `<h1>${esc(en.account.title)}</h1>`,
  "/registrati": () => `
      <h1>${esc(en.auth.signupTitle)}</h1>
      <p class="prerender__lede">${esc(en.auth.signupLede)}</p>
      <h2>${esc(en.signin.freeTitle)}</h2>
      <ul>${["sync", "merge"].map((k) => `<li>${esc(en.signin.benefits[k])}</li>`).join("")}</ul>`,
  "/accedi": () => `<h1>${esc(en.auth.signinTitle)}</h1><p class="prerender__lede">${esc(en.auth.lede)}</p>`,
};
// Personal pages exist for their visitors, not for search engines.
const NOINDEX = new Set(["/collection", "/account", "/accedi"]);
for (const [p, body] of Object.entries(SECTION_BODIES)) {
  pages.push({ path: p, seo: seoForRoute(p), image: PROMO_IMAGES.hero.image, body: body(), noindex: NOINDEX.has(p) });
}

// Markets: a page per city and per place. The dates are those of the day of the build.
const kindLabel = (kind) => en.markets.kindLabels[kind] ?? kind;
for (const city of MARKET_CITIES) {
  const places = placesIn(city.slug);
  const seo = seoForMarketCity(city);
  const title = en.markets.planner.cityTitle.replace("{place}", city.name);
  pages.push({
    path: cityPath(city.slug),
    seo,
    image: PROMO_IMAGES.hero.image,
    jsonld: [
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: title,
        itemListElement: places.map((m, i) => ({ "@type": "ListItem", position: i + 1, name: m.name, url: abs(marketPath(m)) })),
      },
    ],
    body: `
      <nav class="prerender__crumbs">${a("/markets", en.nav.markets)} / <span>${esc(city.name)}</span></nav>
      <h1>${esc(title)}</h1>
      <p class="prerender__lede">${esc(seo.description)}</p>
      ${list(places.map((m) => `${a(marketPath(m), m.name)} <span>${esc(kindLabel(m.kind))} · ${esc(m.frequency)}</span>`))}`,
  });

  for (const m of places) {
    const schedule = marketSchedule(m, today, 3);
    const place = {
      "@type": "Place",
      name: m.name,
      address: { "@type": "PostalAddress", addressLocality: cityNameOf(m), addressCountry: countryOf(m) },
      geo: { "@type": "GeoCoordinates", latitude: m.lat, longitude: m.lng },
    };
    // A market, fair or sample sale with a known next day is an Event; a shop or outlet open all
    // year a LocalBusiness; the rest a Place. A brand's own page goes in sameAs.
    const official = m.url ? { sameAs: m.url } : {};
    const data =
      schedule.type === "dates"
        ? { "@context": "https://schema.org", "@type": "Event", name: m.name, description: m.description, startDate: schedule.dates[0], eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", location: place, url: abs(marketPath(m)), ...official }
        : schedule.type === "open"
          ? { "@context": "https://schema.org", "@type": "LocalBusiness", name: m.name, description: m.description, address: place.address, geo: place.geo, url: abs(marketPath(m)), ...official }
          : { "@context": "https://schema.org", ...place, description: m.description, url: abs(marketPath(m)), ...official };
    const when =
      schedule.type === "dates"
        ? `${en.markets.place.nextDates}: ${schedule.dates.join(", ")}`
        : schedule.type === "open"
          ? en.markets.place.openAlways
          : m.frequency;
    pages.push({
      path: marketPath(m),
      seo: seoForMarketPlace(m, city.slug),
      image: PROMO_IMAGES.hero.image,
      jsonld: [data],
      body: `
      <nav class="prerender__crumbs">${a("/markets", en.nav.markets)} / ${a(cityPath(city.slug), city.name)} / <span>${esc(m.name)}</span></nav>
      <span class="eyebrow">${esc(kindLabel(m.kind))} · ${esc(m.city)}</span>
      <h1>${esc(m.name)}</h1>
      <p class="prerender__lede">${esc(m.description ?? "")}</p>
      <p>${esc(en.markets.place.frequency)}: ${esc(m.frequency)}</p>
      <p>${esc(when)}</p>`,
    });
  }
}

// Pieces
for (const o of OBJECTS) {
  const seo = seoForPiece(o);
  const photo = OBJECT_PHOTOS[o.id];
  const slug = designerSlug(o.designer);
  const decade = String(decadeOf(o.year));
  const more = (BY_DESIGNER.get(slug)?.objects ?? []).filter((x) => x.id !== o.id).slice(0, 8);
  const category = label("categories", o.category);
  pages.push({
    path: `/piece/${o.id}`,
    seo,
    // Shared, the piece is its museum label (the pictures are written to dist/og/ further down).
    image: abs(`/og/${o.id}.png`),
    imageAlt: `${o.name} — ${o.designer}, ${o.year}`,
    label: {
      country: o.country,
      name: o.name,
      by: `${o.designer}, ${o.year}`,
      rows: [
        [en.piece.brand, o.brand],
        [en.piece.materials, (o.materials ?? []).slice(0, 3).join(", ")],
      ],
      material: o.materialTags?.[0],
    },
    preload: o.image,
    preloadSrcSet: responsiveSrcSet(o.image),
    preloadSizes: PIECE_HERO_SIZES,
    jsonld: [
      {
        "@context": "https://schema.org",
        "@type": ["Product", "CreativeWork"],
        name: o.name,
        description: o.description,
        image: o.image,
        url: abs(`/piece/${o.id}`),
        category,
        brand: { "@type": "Brand", name: o.brand },
        manufacturer: { "@type": "Organization", name: o.brand },
        creator: { "@type": "Person", name: o.designer, ...(slug ? { url: abs(`/designer/${slug}`) } : {}) },
        dateCreated: String(o.year),
        countryOfOrigin: o.country,
        ...(o.materials?.length ? { material: o.materials.join(", ") } : {}),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: en.nav.archive, item: abs("/archive") },
          { "@type": "ListItem", position: 2, name: category, item: abs(archiveLink("category", o.category)) },
          { "@type": "ListItem", position: 3, name: o.name, item: abs(`/piece/${o.id}`) },
        ],
      },
    ],
    body: `
      <nav class="prerender__crumbs">${a("/archive", en.nav.archive)} / ${a(archiveLink("category", o.category), category)} / <span>${esc(o.name)}</span></nav>
      <div class="prerender__piece">
        ${o.image ? `<figure><img src="${esc(o.image)}"${responsiveSrcSet(o.image) ? ` srcset="${esc(responsiveSrcSet(o.image))}" sizes="${PIECE_HERO_SIZES}"` : ""} alt="${esc(o.name)}" fetchpriority="high" />${photo ? `<figcaption>${esc(en.piece.photo)}: ${esc(photo.author ? `${photo.author} · ` : "")}${esc(photo.license)} · ${photoPage(photo) ? `<a href="${esc(photoPage(photo))}" rel="noreferrer">${esc(photoSource(photo))}</a>` : esc(photoSource(photo))}</figcaption>` : ""}</figure>` : ""}
        <div>
          <span class="eyebrow">${esc(category)} · ${o.year}</span>
          <h1>${esc(o.name)}</h1>
          <p class="prerender__by">${esc(o.designer)} · ${esc(o.brand)}</p>
          <p class="prerender__lede">${esc(o.description)}</p>
          <dl>
            <dt>${esc(en.piece.designer)}</dt><dd>${slug ? a(`/designer/${slug}`, o.designer) : esc(o.designer)}</dd>
            <dt>${esc(en.piece.brand)}</dt><dd>${a(archiveLink("brand", o.brand), o.brand)}</dd>
            <dt>${esc(en.piece.year)}</dt><dd>${a(archiveLink("decade", decade), String(o.year))}</dd>
            <dt>${esc(en.piece.country)}</dt><dd>${a(archiveLink("country", o.country), o.country)}</dd>
            ${o.styles.length ? `<dt>${esc(en.piece.style)}</dt><dd>${o.styles.map((s) => a(archiveLink("style", s), label("styles", s))).join(", ")}</dd>` : ""}
            ${o.materials.length ? `<dt>${esc(en.piece.materials)}</dt><dd>${esc(o.materials.join(", "))}</dd>` : ""}
          </dl>
        </div>
      </div>
      ${more.length ? `<h2>${esc(en.piece.byDesigner.replace("{designer}", o.designer))}</h2>${pieceLinks(more)}` : ""}`,
  });
}

// Designers
for (const d of BY_DESIGNER.values()) {
  const seo = seoForDesigner(d);
  const cover = d.objects.find((o) => o.image);
  // The photo at the top of the static page: one the image server can send small, if there is one.
  const hero = d.objects.find((o) => o.image && responsiveSrcSet(o.image)) ?? cover;
  pages.push({
    path: `/designer/${d.slug}`,
    seo,
    image: cover?.image ?? PROMO_IMAGES.hero.image,
    jsonld: [
      {
        "@context": "https://schema.org",
        "@type": "Person",
        name: d.name,
        url: abs(`/designer/${d.slug}`),
        description: seo.description,
        subjectOf: d.objects.slice(0, 20).map((o) => ({ "@type": "CreativeWork", name: o.name, url: abs(`/piece/${o.id}`) })),
      },
    ],
    body: `
      <span class="eyebrow">${esc(en.designer.eyebrow)}</span>
      <h1>${esc(d.name)}</h1>
      <p class="prerender__lede">${esc(seo.description)}</p>
      ${hero ? `<img class="prerender__cover" src="${esc(hero.image)}"${responsiveSrcSet(hero.image) ? ` srcset="${esc(responsiveSrcSet(hero.image))}" sizes="(max-width: 700px) 100vw, 640px"` : ""} alt="${esc(hero.name)}" fetchpriority="high" />` : ""}
      ${pieceLinks(d.objects)}`,
  });
}

// Stories (only the ones already published: the rest appear with a later build)
for (const s of publishedStories(today)) {
  const seo = seoForStory(s);
  const coverPiece = byId.get(s.cover?.object) ?? (s.related ?? []).map((id) => byId.get(id)).find((o) => o?.image);
  const text = [s.intro, ...(s.paragraphs ?? [])].filter(Boolean);
  const items = (s.items ?? []).map((item) => {
    const title = item.title ?? item.name ?? item.heading ?? "";
    const body = item.text ?? item.body ?? item.description ?? "";
    return `${title ? `<h3>${esc(title)}</h3>` : ""}${body ? `<p>${esc(body)}</p>` : ""}`;
  });
  const related = (s.related ?? []).map((id) => byId.get(id)).filter(Boolean);
  // Shared, a story is its cover: the label of its piece, or its figure on its tint (written to
  // dist/og/ further down).
  const ogImage = byId.get(s.cover?.object)
    ? abs(`/og/${s.cover.object}.png`)
    : s.cover?.mark
      ? abs(`/og/story-${s.id}.png`)
      : (coverPiece?.image ?? PROMO_IMAGES.hero.image);
  pages.push({
    path: `/stories/${s.id}`,
    seo,
    image: ogImage,
    imageAlt: s.title,
    storyCover: !byId.get(s.cover?.object) && s.cover?.mark
      ? { mark: s.cover.mark, tone: s.cover.tone, kicker: `${en.stories.categories[s.category] ?? s.category} · ${s.readTime} min`, title: s.title }
      : null,
    lastmod: s.date,
    jsonld: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: s.title,
        description: s.hook,
        datePublished: s.date,
        image: coverPiece?.image ?? PROMO_IMAGES.hero.image,
        url: abs(`/stories/${s.id}`),
        author: { "@type": "Organization", name: SITE_NAME, url: abs("/") },
        publisher: { "@type": "Organization", name: SITE_NAME, url: abs("/") },
      },
    ],
    body: `
      <span class="eyebrow">${esc(en.nav.stories)} · ${esc(s.date)}</span>
      <h1>${esc(s.title)}</h1>
      <p class="prerender__lede">${esc(s.hook)}</p>
      ${text.map((p) => `<p>${esc(p)}</p>`).join("")}
      ${items.join("")}
      ${related.length ? pieceLinks(related) : ""}
      ${(s.sources ?? []).length ? list(s.sources.map((src) => `<a href="${esc(src.url)}" rel="noreferrer">${esc(src.label)}</a>`)) : ""}`,
  });
}

// ---------- the HTML ----------
const shell = readFileSync(path.join(dist, "index.html"), "utf8");

// Each page's own code. Every page but the landing page loads on demand (App.jsx), which on a
// first visit means: the app's code, then — only once it runs — the page's. A prerendered page
// asks for both at once. From Vite's manifest: the page's chunk, the chunks it imports and its
// styles (preloaded, not applied: the app applies them when the page mounts).
const manifestFile = path.join(dist, ".vite", "manifest.json");
const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : null;
const PAGE_MODULES = [
  [/^\/archive$/, "Archive"],
  [/^\/markets\/[^/]+\/[^/]+$/, "MarketPlace"],
  [/^\/markets(\/[^/]+)?$/, "Markets"],
  [/^\/stories$/, "Stories"],
  [/^\/stories\//, "StoryPage"],
  [/^\/piece\//, "Piece"],
  [/^\/designer\//, "Designer"],
  [/^\/designers$/, "Designers"],
  [/^\/credits$/, "Credits"],
  [/^\/collection$/, "Collection"],
  [/^\/account$/, "Account"],
  [/^\/privacy$/, "Privacy"],
  [/^\/(registrati|accedi)$/, "SignIn"],
];
const entryChunks = new Set();
if (manifest) {
  const walk = (key, into) => {
    const chunk = manifest[key];
    if (!chunk || into.has(chunk.file)) return;
    into.add(chunk.file);
    for (const next of chunk.imports ?? []) walk(next, into);
  };
  walk("index.html", entryChunks);
}
function pageAssets(pagePath) {
  const name = PAGE_MODULES.find(([pattern]) => pattern.test(pagePath))?.[1];
  const key = name && `src/pages/${name}.jsx`;
  if (!manifest || !manifest[key]) return "";
  const files = new Set();
  const css = new Set();
  const walk = (k) => {
    const chunk = manifest[k];
    if (!chunk || files.has(chunk.file) || entryChunks.has(chunk.file)) return;
    files.add(chunk.file);
    for (const file of chunk.css ?? []) css.add(file);
    for (const next of chunk.imports ?? []) walk(next);
  };
  walk(key);
  return [
    ...[...files].map((file) => `<link rel="modulepreload" crossorigin href="${esc(link(`/${file}`))}" />`),
    ...[...css].map((file) => `<link rel="preload" as="style" crossorigin href="${esc(link(`/${file}`))}" />`),
  ].join("\n    ");
}

// Laid out like the app's own header and page, so the swap to the live page barely shows.
const STYLE = `<style>
.prerender__bar{display:flex;align-items:center;justify-content:space-between;height:76px;border-bottom:1px solid var(--color-border-soft)}
.prerender__logo{font-family:var(--font-serif);font-weight:500;font-size:1.3rem}
.prerender__bar nav{display:flex;gap:2.5rem;font-size:.78rem;letter-spacing:.09em;text-transform:uppercase;color:var(--color-text-dim)}
.prerender__main{padding-top:2.5rem;padding-bottom:6rem;display:flex;flex-direction:column;gap:1rem}
.prerender__main h1{font-size:clamp(2.4rem,6vw,4.6rem);font-weight:350;line-height:1.03;letter-spacing:-.02em}
.prerender__main h2{font-size:var(--text-xl);margin-top:1.5rem}
.prerender__main a{text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--color-border)}
.prerender__main ul{padding-left:1.1rem;color:var(--color-text-dim)}
.prerender__lede,.prerender__by{color:var(--color-text-dim);max-width:60ch}
.prerender__lede{font-size:clamp(1.15rem,1rem + .6vw,1.4rem);line-height:1.5}
.prerender__feature{font-family:var(--font-serif);font-size:clamp(2.3rem,4vw,3.4rem);line-height:1.06;max-width:22ch}
.prerender__feature a{text-decoration:none}
.prerender__feature--text{max-width:30ch;color:var(--color-text-dim);font-size:clamp(1.9rem,3.4vw,2.8rem)}
.prerender__cover{display:block;width:100%;max-width:640px;height:auto;max-height:72vh;object-fit:cover}
.prerender__crumbs{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--color-text-faint)}
.prerender__piece{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:4rem;align-items:start}
.prerender__piece img{display:block;width:100%;height:auto;max-height:72vh;object-fit:contain}
.prerender__piece figure{margin:0}.prerender__piece figcaption{font-size:.72rem;color:var(--color-text-faint);margin-top:.5rem}
.prerender__piece dl{display:grid;grid-template-columns:8.5rem 1fr;gap:.5rem 1rem;border-top:1px solid var(--color-border-soft);padding-top:1rem}
.prerender__piece dt{font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:var(--color-text-faint)}.prerender__piece dd{margin:0}
@media (max-width:900px){.prerender__bar nav{display:none}.prerender__piece{grid-template-columns:1fr;gap:1.5rem}}
</style>`;

function head(page) {
  const { title, description, type = "website" } = page.seo;
  const url = abs(page.path);
  const image = page.image;
  const tags = [
    `<link rel="canonical" href="${esc(url)}" />`,
    page.noindex ? `<meta name="robots" content="noindex" />` : "",
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:type" content="${esc(type)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    image ? `<meta property="og:image" content="${esc(image)}" />` : "",
    image ? `<meta property="og:image:alt" content="${esc(page.imageAlt ?? title)}" />` : "",
    page.label ? `<meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />` : "",
    `<meta property="og:locale" content="${OG_LOCALES.en}" />`,
    ...LANGS.filter((l) => l !== "en").map((l) => `<meta property="og:locale:alternate" content="${OG_LOCALES[l]}" />`),
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    image ? `<meta name="twitter:image" content="${esc(image)}" />` : "",
    ...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${esc(l === "en" ? url : `${url}?lang=${l}`)}" />`),
    `<link rel="alternate" hreflang="x-default" href="${esc(url)}" />`,
    page.preload
      ? `<link rel="preload" as="image" href="${esc(page.preload)}"${page.preloadSrcSet ? ` imagesrcset="${esc(page.preloadSrcSet)}" imagesizes="${esc(page.preloadSizes ?? "100vw")}"` : ""} fetchpriority="high" />`
      : "",
    pageAssets(page.path),
    ...(page.jsonld ?? []).map((data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`),
    STYLE,
  ];
  return tags.filter(Boolean).join("\n    ");
}

function render(page) {
  const { title, description } = page.seo;
  const body = `<div class="prerender">
      <header class="container prerender__bar"><a class="prerender__logo" href="${esc(BASE)}">${esc(SITE_NAME)}</a><nav>${NAV.map(([p, text]) => a(p, text)).join("")}</nav></header>
      ${page.hero ?? ""}
      <main class="container prerender__main">${page.body}</main>
    </div>`;
  return shell
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}" />`)
    .replace("</head>", `  ${head(page)}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

function fileFor(p) {
  return p === "/" ? path.join(dist, "index.html") : path.join(dist, `${p.slice(1)}.html`);
}

let bytes = 0;
for (const page of pages) {
  const file = fileFor(page.path);
  mkdirSync(path.dirname(file), { recursive: true });
  const html = render(page);
  bytes += Buffer.byteLength(html);
  writeFileSync(file, html);
}

// ---------- the sharing image of every piece: its label ----------
const labelled = pages.filter((page) => page.label);
mkdirSync(path.join(dist, "og"), { recursive: true });
for (const page of labelled) {
  writeFileSync(path.join(dist, "og", `${page.path.split("/").pop()}.png`), await renderPng(labelSvg(page.label)));
}
for (const page of pages.filter((p) => p.storyCover)) {
  writeFileSync(path.join(dist, "og", `story-${page.path.split("/").pop()}.png`), await renderPng(storySvg(page.storyCover)));
}

// ---------- sitemap and robots ----------
const urls = pages
  .filter((page) => !page.noindex)
  .map((page) => `  <url><loc>${esc(abs(page.path))}</loc><lastmod>${page.lastmod ?? today}</lastmod></url>`);
writeFileSync(
  path.join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`
);
writeFileSync(
  path.join(dist, "robots.txt"),
  `User-agent: *\nAllow: /\nDisallow: ${BASE}collection\nDisallow: ${BASE}account\nDisallow: ${BASE}m/\nDisallow: ${BASE}moodboard/print\n\nSitemap: ${SITE}/sitemap.xml\n`
);

// The manifest has been read: it is not part of the site.
rmSync(path.join(dist, ".vite"), { recursive: true, force: true });

console.log(`prerender: ${pages.length} pages (${(bytes / 1048576).toFixed(1)} MB), ${labelled.length} label images, sitemap with ${urls.length} addresses → ${SITE}`);
