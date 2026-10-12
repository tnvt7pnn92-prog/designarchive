import { objectById } from "../data/indexes.js";
import { seoForRoute } from "../lib/seo.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import { OBJECT_PHOTOS, photoSource, photoPage } from "../data/objectPhotos.js";
import { PLACES } from "../data/places.js";
import { MATERIALS } from "../data/materials.js";
import { PROMO_IMAGES } from "../data/promoImages.js";
import { MARKETS } from "../data/markets.js";
import { MARKETS_HERO, MARKET_PHOTOS, commonsPage } from "../data/marketPhotos.js";
import "./Credits.css";

export default function Credits() {
  useDocumentMeta(seoForRoute("/credits"));
  const objectCredits = Object.entries(OBJECT_PHOTOS).map(([id, photo]) => ({
    id,
    label: objectById(id)?.name || id,
    source: photoSource(photo),
    page: photoPage(photo),
    ...photo,
  }));
  const placeCredits = PLACES.filter((p) => p.credit).map((p) => ({ label: p.city, credit: p.credit }));
  const promoCredits = Object.entries(PROMO_IMAGES).map(([key, v]) => ({ label: key, credit: v.credit, page: v.page }));

  return (
    <div className="credits-page container">
      <header className="credits-page__hero">
        <span className="eyebrow">Image Credits</span>
        <h1>Photo credits</h1>
        <p>
          Every object photo here is a real photograph of that specific piece, checked one by one against the
          object it illustrates. Part of the archive uses openly licensed images — Wikimedia Commons, museum
          open-access collections (the Met, Cooper Hewitt / Smithsonian, Brooklyn Museum, Nasjonalmuseet),
          Creative Commons photos on Flickr, and the free stock libraries Unsplash, Pexels and Pixabay — and a
          few official manufacturer images used with the written permission of the brand, marked "Courtesy of".
        </p>
        <p>
          The remaining photographs were found on the open web: manufacturers, museums, auction houses and
          specialist dealers. They are shown here for reference only, they remain the property of whoever holds
          their rights, and each one links back to the exact page it was taken from. If you hold the rights to a
          photograph and would like it credited differently or taken down, write to us and it will be changed.
        </p>
      </header>

      <section className="credits-section">
        <h2>Archive objects</h2>
        <ul className="credits-list">
          {objectCredits.map((c) => (
            <li key={c.id}>
              <span className="credits-list__label">{c.label}</span>
              <span className="credits-list__meta">
                {c.author ? `${c.author} · ` : ""}
                {c.license} · via{" "}
                {c.page ? (
                  <a href={c.page} target="_blank" rel="noreferrer">
                    {c.source}
                  </a>
                ) : (
                  c.source
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="credits-section">
        <h2>Places</h2>
        <ul className="credits-list">
          {placeCredits.map((c) => (
            <li key={c.label}>
              <span className="credits-list__label">{c.label}</span>
              <span className="credits-list__meta">{c.credit}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="credits-section">
        <h2>Moodboard material textures</h2>
        <ul className="credits-list">
          {MATERIALS.map((m) => (
            <li key={m.id}>
              <span className="credits-list__label">{m.name}</span>
              <span className="credits-list__meta">
                {m.credit.author} · {m.credit.license} · via Wikimedia Commons
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="credits-section">
        <h2>Markets guide</h2>
        <ul className="credits-list">
          {[["Markets guide cover", MARKETS_HERO], ...Object.entries(MARKET_PHOTOS).map(([id, photo]) => [MARKETS.find((m) => m.id === id)?.name ?? id, photo])].map(([label, photo]) => (
            <li key={label}>
              <span className="credits-list__label">{label}</span>
              <span className="credits-list__meta">
                {photo.author} · {photo.license} · via{" "}
                <a href={commonsPage(photo)} target="_blank" rel="noreferrer">
                  Wikimedia Commons
                </a>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="credits-section">
        <h2>Markets globe</h2>
        <ul className="credits-list">
          <li>
            <span className="credits-list__label">Earth at night texture</span>
            <span className="credits-list__meta">NASA Earth Observatory / Visible Earth · Public domain · via three-globe (MIT)</span>
          </li>
          <li>
            <span className="credits-list__label">Topography (relief) map</span>
            <span className="credits-list__meta">NASA Visible Earth · Public domain · via three-globe (MIT)</span>
          </li>
          <li>
            <span className="credits-list__label">Country borders</span>
            <span className="credits-list__meta">Natural Earth · Public domain · via world-atlas</span>
          </li>
        </ul>
      </section>

      <section className="credits-section">
        <h2>Homepage and sharing</h2>
        <ul className="credits-list">
          {promoCredits.map((c) => (
            <li key={c.label}>
              <span className="credits-list__label">{PROMO_IMAGES[c.label]?.label ?? c.label}</span>
              <span className="credits-list__meta">
                {/* As for the pieces: the credit, then the link on the name of the source. */}
                {c.page ? (
                  <>
                    {c.credit.replace(/, via .+$/, "")} · via{" "}
                    <a href={c.page} target="_blank" rel="noreferrer">
                      {c.credit.match(/, via (.+)$/)?.[1] ?? "source"}
                    </a>
                  </>
                ) : (
                  c.credit
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
