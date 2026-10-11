import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { seoForRoute } from "../lib/seo.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { STORY_CATEGORIES, publishedStories, storyOfTheDay } from "../data/stories.js";
import { storyPieces } from "../lib/storyPieces.js";
import { useToday } from "../lib/today.js";
import StoryCover from "../components/StoryCover.jsx";
import StoryCard from "../components/StoryCard.jsx";
import CountUp from "../components/CountUp.jsx";
import SmartImage from "../components/SmartImage.jsx";
import MaterialField from "../components/MaterialField.jsx";
import "./Stories.css";

const PAGE = 12;
const NUMBERS = 8;
const TONES = new Set(["cream", "teal", "pink", "gold", "ink", "cloud", "orange", "brown"]);

// Where a story sits in the magazine grid. The grid runs in blocks of six: one big story with its
// words on the cover, two middle ones beside it, three small ones below; every other block puts
// the big one on the right. A block cut short by the end of the list closes up instead of leaving
// holes (a middle one alone grows tall, two or one small ones share the row between them).
function slot(index, total) {
  const block = Math.floor(index / 6);
  const pos = index % 6;
  const size = Math.min(6, total - block * 6);
  const flip = block % 2 === 1 ? " is-flip" : "";
  if (pos === 0) return { variant: "feature", className: `is-big${size === 1 ? " is-alone" : flip}` };
  if (pos <= 2) return { variant: "default", className: `is-mid${size === 2 ? " is-tall" : ""}` };
  return { variant: "default", className: `is-small of-${size - 3}` };
}

// Within each block of six, the big slot goes to the story with the most to show: a photo cover,
// else pieces to pin, else the first. The others keep their order (newest first).
function magazineOrder(stories) {
  const out = [];
  for (let i = 0; i < stories.length; i += 6) {
    const block = stories.slice(i, i + 6);
    let lead = block.findIndex((s) => s.cover?.object);
    if (lead < 0) lead = block.findIndex((s) => storyPieces(s).length > 0);
    if (lead > 0) block.unshift(...block.splice(lead, 1));
    out.push(...block);
  }
  return out;
}

// The archive's daily paper: a masthead with today's issue, the story of the day as a magazine
// cover with the pieces it names pinned on it, a gold ribbon of every story, "The stories in one
// number" counting up, the back issues laid out like a magazine, the practical guides on the cream
// band, and the morning email (not active yet: it says so).
export default function Stories() {
  useDocumentMeta(seoForRoute("/stories"));
  const { t, lang } = useLanguage();
  const { today } = useToday();
  const [params, setParams] = useSearchParams();
  const [shown, setShown] = useState(PAGE);

  const published = useMemo(() => publishedStories(today), [today]);
  const featured = storyOfTheDay(today);
  const featuredPieces = storyPieces(featured).slice(0, 3);
  const categories = STORY_CATEGORIES.filter((c) => published.some((s) => s.category === c));
  const category = categories.includes(params.get("c")) ? params.get("c") : "all";
  const rest = published.filter((s) => s.id !== featured.id);
  const grid = magazineOrder(rest.filter((s) => category === "all" || s.category === category));
  const visible = grid.slice(0, shown);
  const numbers = published.filter((s) => s.cover?.mark && s.markCaption).slice(0, NUMBERS);
  // A full wall only: 8, 4 or nothing, never a hole in the grid.
  const wall = numbers.slice(0, numbers.length >= 8 ? 8 : numbers.length >= 4 ? 4 : 0);
  const guides = published.filter((s) => s.category === "guides");
  const fan = published.slice(0, 3);
  const locale = lang === "zh" ? "zh-CN" : lang;
  const longDate = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${today}T00:00:00Z`));
  const shortDate = (key) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`)).replace(".", "");
  const caption = (story) => {
    const key = `stories.markCaptions.${story.id}`;
    const text = t(key);
    return text === key ? story.markCaption : text;
  };
  const tint = (story) => (TONES.has(story.cover?.tone) ? story.cover.tone : "ink");

  function pick(c) {
    setShown(PAGE);
    setParams(c === "all" ? {} : { c }, { replace: true });
  }

  return (
    <div className="stories-page">
      <header className="container stories-mast">
        <p className="catalog-rule">
          <span>{longDate}</span>
          <span>{t("stories.issue", { n: published.length })}</span>
          <span>{t("stories.oneADay")}</span>
        </p>
        <div className="stories-mast__row">
          <h1>
            {t("stories.titleA")} <em>{t("stories.titleB")}</em>
          </h1>
          <p className="stories-mast__sub">{t("stories.subtitle")}</p>
        </div>
      </header>

      <section className="container stories-today" aria-labelledby="stories-today-title">
        <Link to={`/stories/${featured.id}`} className="stories-today__cover" tabIndex={-1} aria-hidden="true">
          <StoryCover story={featured} priority pins={2} pinLabel />
        </Link>
        <div>
          <p className="stories-kicker">
            <span>{t("stories.storyOfDay")}</span>
            <span>
              {t(`stories.categories.${featured.category}`)} · {t("stories.minutes", { n: featured.readTime })}
            </span>
          </p>
          <h2 id="stories-today-title">
            <Link to={`/stories/${featured.id}`}>{featured.title}</Link>
          </h2>
          <p className="stories-today__hook">{featured.hook}</p>
          <Link to={`/stories/${featured.id}`} className="btn btn--gold">
            {t("stories.read")} <span className="btn-arrow">→</span>
          </Link>
          {featuredPieces.length > 0 && (
            <div className="stories-today__pieces">
              <p className="stories-note">{t("stories.inThisStory")}</p>
              <ul>
                {featuredPieces.map((p) => (
                  <li key={p.id}>
                    <Link to={`/piece/${p.id}`}>
                      <SmartImage src={p.image} cutout={p.cutout} alt="" card category={p.category} fallback={<MaterialField object={p} />} />
                      <span>
                        {p.name.replace(/\s*\(.*\)$/, "")} <i>{p.year}</i>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Every story, figure and title, sliding by in gold; twice over, so the loop has no seam. */}
      <section className="stories-ribbon" aria-label={t("stories.ribbonLabel")}>
        <div className="stories-ribbon__track">
          {[0, 1].map((copy) => (
            <p key={copy} aria-hidden={copy === 1 || undefined}>
              {published.map((story) => (
                <Link key={story.id} to={`/stories/${story.id}`} tabIndex={copy === 1 ? -1 : undefined}>
                  {story.cover?.mark && <b>{story.cover.mark}</b>}
                  {story.title}
                </Link>
              ))}
            </p>
          ))}
        </div>
      </section>

      {wall.length > 0 && (
        <section className="stories-numbers" aria-labelledby="stories-numbers-title" data-reveal>
          <div className="container">
            <div className="stories-head">
              <h2 id="stories-numbers-title">{t("stories.numbersTitle")}</h2>
              <p className="stories-note">{t("stories.numbersNote")}</p>
            </div>
            <ul className={`stories-numbers__wall is-${wall.length}`}>
              {wall.map((story) => {
                const piece = storyPieces(story)[0];
                return (
                  <li key={story.id} style={{ "--tile-bg": `var(--tone-${tint(story)})`, "--tile-ink": `var(--tone-${tint(story)}-ink)` }}>
                    <Link to={`/stories/${story.id}`}>
                      {/* The piece behind the figure, shown on hover. */}
                      {piece && (
                        <span className="stories-numbers__photo" aria-hidden="true">
                          <SmartImage src={piece.image} cutout={piece.cutout} alt="" card category={piece.category} />
                        </span>
                      )}
                      <CountUp text={story.cover.mark} className="stories-numbers__figure" />
                      <span className="stories-numbers__caption">{caption(story)}</span>
                      <span className="stories-numbers__meta">
                        {t(`stories.categories.${story.category}`)} · {shortDate(story.date)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <section className="container stories-archive" aria-label={t("stories.archiveLabel")}>
        <div className="stories-tabs" role="group" aria-label={t("filters.category")}>
          {["all", ...categories].map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => pick(c)}>
              {c === "all" ? t("stories.all") : t(`stories.categories.${c}`)}
              <i>{c === "all" ? rest.length : rest.filter((s) => s.category === c).length}</i>
            </button>
          ))}
        </div>
        {grid.length ? (
          <div className="stories-mag">
            {visible.map((story, i) => {
              const { variant, className } = slot(i, visible.length);
              return (
                <div key={story.id} className={`stories-mag__slot ${className}`}>
                  <StoryCard story={story} variant={variant} reveal />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="stories-note stories-archive__empty">{t("stories.noneInCategory")}</p>
        )}
        {grid.length > shown && (
          <button type="button" className="btn btn--ghost stories-more" onClick={() => setShown((n) => n + PAGE)}>
            {t("stories.loadMore", { n: grid.length - shown })}
          </button>
        )}
      </section>

      {guides.length > 0 && (
        <section className="section-light stories-guides" aria-labelledby="stories-guides-title">
          <div className="container">
            <div className="stories-head stories-head--ruled">
              <h2 id="stories-guides-title">{t("stories.guidesTitle")}</h2>
              <p className="stories-note">{t("stories.guidesNote")}</p>
            </div>
            <ul className="stories-guides__shelf">
              {guides.map((story, i) => (
                <li key={story.id} data-reveal>
                  <article className="stories-guide">
                    <p className="stories-guide__line">
                      <span>{t("stories.guideNumber", { n: String(i + 1).padStart(2, "0") })}</span>
                      <span>{t("stories.minutes", { n: story.readTime })}</span>
                    </p>
                    <h3>
                      <Link to={`/stories/${story.id}`}>{story.title}</Link>
                    </h3>
                    <p>{story.hook}</p>
                    <Link to={`/stories/${story.id}`} className="stories-guide__use">
                      {t("stories.readGuide")} →
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="stories-letter" aria-labelledby="stories-letter-title" data-reveal>
        <div className="container stories-letter__inner">
          <div>
            <h2 id="stories-letter-title">{t("stories.letterTitle")}</h2>
            <p>{t("stories.letterText")}</p>
            {/* No email service is connected: the page says so rather than pretend to sign anyone up. */}
            <p className="stories-letter__soon">{t("stories.letterSoon")}</p>
          </div>
          <div className="stories-letter__fan" aria-hidden="true">
            {fan.map((story) => (
              <StoryCover key={story.id} story={story} label={false} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
