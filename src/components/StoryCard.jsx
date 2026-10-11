import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import StoryCover from "./StoryCover.jsx";
import "./StoryCard.css";

const TONES = new Set(["cream", "teal", "pink", "gold", "ink", "cloud", "orange", "brown"]);
const shortDate =(key, lang) => new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : lang, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`)).replace(".", "");

// A story in a grid: the cover, the category in gold, date and minutes, the title and the hook.
// `compact` is the small row used beside a piece or a designer; `feature` the big one that opens a
// block of the stories page, its words laid on the cover like a magazine's.
export default function StoryCard({ story, variant = "default", reveal = false }) {
  const { t, lang } = useLanguage();
  return (
    <Link
      to={`/stories/${story.id}`}
      className={`story-card story-card--${variant}${story.cover?.object ? "" : " is-type"}`}
      style={variant === "feature" && !story.cover?.object ? { "--feature-ink": `var(--tone-${TONES.has(story.cover?.tone) ? story.cover.tone : "ink"}-ink)` } : undefined}
      data-reveal={reveal || undefined}
    >
      <StoryCover story={story} className="story-card__cover" label={variant !== "compact"} pins={variant === "compact" ? 0 : 1} />
      <span className="story-card__body">
        <span className="story-card__meta">
          <span className="story-card__cat">{t(`stories.categories.${story.category}`)}</span>
          <span>
            {shortDate(story.date, lang)} · {t("stories.minutes", { n: story.readTime })}
          </span>
        </span>
        <strong className="story-card__title">{story.title}</strong>
        {variant !== "compact" && <span className="story-card__hook">{story.hook}</span>}
      </span>
    </Link>
  );
}
