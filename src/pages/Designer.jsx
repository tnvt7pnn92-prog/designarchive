import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { designerBySlug, storiesForObject } from "../data/indexes.js";
import { archiveHref } from "../lib/archiveParams.js";
import { seoForDesigner } from "../lib/seo.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import ObjectCard from "../components/ObjectCard.jsx";
import StoryCard from "../components/StoryCard.jsx";
import NotFound from "./NotFound.jsx";
import "./Designer.css";

export default function Designer() {
  const { slug } = useParams();
  const { t } = useLanguage();
  const entry = designerBySlug(slug);

  useDocumentMeta(entry ? seoForDesigner(entry) : undefined);

  const facts = useMemo(() => {
    if (!entry) return null;
    const years = entry.objects.map((o) => o.year);
    return {
      span: `${Math.min(...years)} – ${Math.max(...years)}`,
      brands: [...new Set(entry.objects.map((o) => o.brand))].filter(Boolean),
      countries: [...new Set(entry.objects.map((o) => o.country))],
      categories: [...new Set(entry.objects.map((o) => o.category))],
    };
  }, [entry]);

  // Any story that talks about one of their pieces is a story about them.
  const stories = useMemo(() => {
    if (!entry) return [];
    const seen = new Map();
    for (const object of entry.objects) for (const story of storiesForObject(object.id)) seen.set(story.id, story);
    return [...seen.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  }, [entry]);

  if (!entry) return <NotFound />;

  return (
    <div className="designer-page">
      <header className="container designer-hero">
        <p className="catalog-rule">
          <span>{t("designer.eyebrow")}</span>
        </p>
        <h1>{entry.name}</h1>
        <p className="designer-hero__count">
          {t(entry.objects.length === 1 ? "designer.piece" : "designer.pieces", { count: entry.objects.length })} · {facts.span}
        </p>
        <dl className="designer-facts">
          <div>
            <dt>{t("piece.brand")}</dt>
            <dd className="designer-facts__inline">
              {facts.brands.map((brand) => (
                <Link key={brand} to={archiveHref({ brand })}>
                  {brand}
                </Link>
              ))}
            </dd>
          </div>
          <div>
            <dt>{t("piece.country")}</dt>
            <dd className="designer-facts__inline">
              {facts.countries.map((country) => (
                <Link key={country} to={archiveHref({ country })}>
                  {country}
                </Link>
              ))}
            </dd>
          </div>
          <div>
            <dt>{t("filters.category")}</dt>
            <dd className="designer-facts__inline">
              {facts.categories.map((category) => (
                <Link key={category} to={archiveHref({ category })}>
                  {t(`categories.${category}`)}
                </Link>
              ))}
            </dd>
          </div>
        </dl>
      </header>

      <div className="container designer-grid">
        {entry.objects.map((object) => (
          <ObjectCard key={object.id} object={object} />
        ))}
      </div>

      {stories.length > 0 && (
        <section className="container designer-stories">
          <h2>{t("piece.inStories")}</h2>
          <div className="designer-stories__grid">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} variant="compact" />
            ))}
          </div>
        </section>
      )}

      <div className="container designer-page__links">
        <Link className="designer-page__more" to={archiveHref({ designer: entry.name })}>
          {t("designer.inArchive")} →
        </Link>
        <Link className="designer-page__more" to="/designers">
          {t("home.allDesigners")} →
        </Link>
      </div>
    </div>
  );
}
