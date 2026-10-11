import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { STORIES, publishedStories } from "../data/stories.js";
import { STORY_COVERS } from "../data/storyCovers.js";
import { objectById } from "../data/indexes.js";
import { useToday, formatDay } from "../lib/today.js";
import { seoForStory, seoForRoute } from "../lib/seo.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import { useCollection } from "../lib/collection.js";
import { useCollectionAction } from "../lib/useRoomToggle.js";
import { useShareLabel } from "../lib/useShareLabel.js";
import StoryCover from "../components/StoryCover.jsx";
import StoryCard from "../components/StoryCard.jsx";
import Label from "../components/Label.jsx";
import "./StoryPage.css";

// A thin gold line at the top of the window: how far into the article the reader is.
function ReadingProgress({ target }) {
  const { t } = useLanguage();
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = target.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      const total = box.height - window.innerHeight;
      setValue(total > 0 ? Math.min(100, Math.max(0, Math.round((-box.top / total) * 100))) : 100);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [target]);
  return (
    <div className="story-progress" role="progressbar" aria-label={t("stories.progress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <span style={{ transform: `scaleX(${value / 100})` }} />
    </div>
  );
}

// A piece the story talks about: its museum label, opening the piece page, with the two things a
// reader may want to do about it right away.
function PieceLabel({ object, items, act }) {
  const { t } = useLanguage();
  const status = items.find((item) => item.id === object.id)?.status ?? null;
  return (
    <Label
      className="story-piece"
      status={object.country}
      name={<Link to={`/piece/${object.id}`}>{object.name}</Link>}
      by={`${object.designer}, ${object.year}`}
      rows={[{ label: t("piece.brand"), value: object.brand }]}
      footer={
        <div className="story-piece__actions">
          <button type="button" aria-pressed={status === "want"} onClick={() => act(object, "want")}>
            {t("collection.action.want")}
          </button>
          <button type="button" aria-pressed={status !== null && status !== "want"} onClick={() => act(object, status && status !== "want" ? status : "saved")}>
            {status && status !== "want" ? t(`collection.status.${status}`) : t("collection.add")}
          </button>
        </div>
      }
    />
  );
}

// One story: the cover across the page, the title, an article set for reading (one column, a
// drop cap, numbered items, the pieces as labels), the sources, then the next story and three more
// of the same kind.
export default function StoryPage() {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const { today } = useToday();
  const items = useCollection();
  const act = useCollectionAction();
  const { shareStory } = useShareLabel();
  const articleRef = useRef(null);
  const story = STORIES.find((s) => s.id === id);

  useDocumentMeta(story && story.date <= today ? seoForStory(story) : seoForRoute("/stories"));

  // Scheduled stories exist in the bundle ahead of time, but stay hidden until their day.
  if (!story || story.date > today) {
    return (
      <div className="container story-missing">
        <h1>{story ? t("stories.notYetTitle") : t("stories.notFound")}</h1>
        {story && <p>{t("stories.notYet", { date: formatDay(story.date, lang) })}</p>}
        <Link to="/stories" className="btn">
          {t("stories.back")} <span className="btn-arrow">→</span>
        </Link>
      </div>
    );
  }

  const published = publishedStories(today);
  const at = published.findIndex((s) => s.id === story.id);
  const next = published.length > 1 ? published[(at + 1) % published.length] : null;
  const sameKind = published.filter((s) => s.id !== story.id && s.id !== next?.id && s.category === story.category).slice(0, 3);
  const itemPieces = new Set((story.items ?? []).map((item) => item.object).filter(Boolean));
  const related = (story.related ?? []).filter((pieceId) => !itemPieces.has(pieceId)).map(objectById).filter(Boolean);
  const coverPiece = story.cover?.object ? STORY_COVERS[story.cover.object] : null;
  const [lede, ...paragraphs] = [story.intro, ...(story.paragraphs ?? [])].filter(Boolean);

  return (
    <article className="story-page" ref={articleRef}>
      <ReadingProgress target={articleRef} />
      <div className="container story-page__top">
        <Link to="/stories" className="story-page__back">
          ← {t("stories.back")}
        </Link>
        <StoryCover story={story} className="story-page__cover" priority />
      </div>

      <header className="container story-page__header">
        <p className="story-page__kicker">
          <span>{t(`stories.categories.${story.category}`)}</span>
          <span>
            <time dateTime={story.date}>{formatDay(story.date, lang)}</time> · {t("stories.minutes", { n: story.readTime })}
          </span>
        </p>
        <h1>{story.title}</h1>
        <p className="story-page__hook">{story.hook}</p>
        <button type="button" className="btn btn--ghost story-page__share" onClick={() => shareStory(story, coverPiece)}>
          {t("stories.shareCover")}
        </button>
      </header>

      <div className="container story-page__body">
        {lede && <p className="story-page__lede">{lede}</p>}
        {paragraphs.map((text, i) => (
          <p key={i}>{text}</p>
        ))}

        {story.items && (
          <ol className="story-page__items">
            {story.items.map((item, i) => {
              const object = item.object ? objectById(item.object) : null;
              return (
                <li key={item.title}>
                  <span className="story-page__num" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2>{item.title}</h2>
                    <p>{item.text}</p>
                    {object && <PieceLabel object={object} items={items} act={act} />}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {story.outro && <p className="story-page__outro">{story.outro}</p>}

        {related.length > 0 && (
          <section className="story-page__pieces" aria-labelledby="story-pieces-title">
            <h2 id="story-pieces-title" className="story-page__label">
              {t("stories.piecesTitle")}
            </h2>
            <div className="story-page__labels">
              {related.map((object) => (
                <PieceLabel key={object.id} object={object} items={items} act={act} />
              ))}
            </div>
          </section>
        )}

        {story.sources?.length > 0 && (
          <footer className="story-page__sources">
            <h2 className="story-page__label">{t("stories.sources")}</h2>
            <ol>
              {story.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.label}
                  </a>
                </li>
              ))}
            </ol>
          </footer>
        )}
      </div>

      {next && (
        <section className="container story-page__next" aria-labelledby="story-next-title">
          <h2 className="story-page__label">{t("stories.nextStory")}</h2>
          <Link to={`/stories/${next.id}`} className="story-next">
            <StoryCover story={next} className="story-next__cover" />
            <span className="story-next__text">
              <span className="story-page__kicker">
                <span>{t(`stories.categories.${next.category}`)}</span>
                <span>{t("stories.minutes", { n: next.readTime })}</span>
              </span>
              <strong id="story-next-title">{next.title}</strong>
              <span className="story-next__hook">{next.hook}</span>
            </span>
          </Link>
        </section>
      )}

      {sameKind.length > 0 && (
        <section className="container story-page__more">
          <h2 className="story-page__label">{t("stories.sameCategory", { category: t(`stories.categories.${story.category}`) })}</h2>
          <div className="stories-grid">
            {sameKind.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
