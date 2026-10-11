import { Link } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

const STEPS = ["search", "keep", "find"];
const STAMPS = ["own", "want", "seen"];

// How it works, on the cream band: three steps side by side (stacked on a phone), each with a big
// numeral, rising in turn as the band scrolls into view; the stamps of the second land with a thud.
export default function StepsScene({ marketCount }) {
  const { t } = useLanguage();

  const demo = {
    search: (
      <Link to="/archive?q=superleggera" className="home-mini-search">
        <span aria-hidden="true">⌕</span> <b>supergl</b> → Superleggera, 1957
      </Link>
    ),
    keep: (
      <span className="home-stamps">
        {STAMPS.map((s, i) => (
          <span key={s} className={`home-stamp is-${s}`} style={{ "--s": i }}>
            {t(`collection.status.${s}`)}
          </span>
        ))}
      </span>
    ),
    find: (
      <Link to="/markets" className="home-pin-chip">
        <i aria-hidden="true" />
        {t("home.steps.find.chip", { count: marketCount })}
      </Link>
    ),
  };

  return (
    <section className="home-steps" aria-labelledby="home-steps-title">
      <div className="home-wrap">
        <p className="home-eyebrow" id="home-steps-title">
          {t("home.stepsEyebrow")}
        </p>
        <ol className="home-steplist">
          {STEPS.map((step, i) => (
            <li key={step} className="home-step" data-reveal style={{ transitionDelay: `${i * 0.15}s` }}>
              <span className="home-step__n" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{t(`home.steps.${step}.title`)}</h3>
              <p>{t(`home.steps.${step}.text`)}</p>
              {demo[step]}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
