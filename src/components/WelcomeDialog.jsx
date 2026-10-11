import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { ROLES, updateProfile, useProfile } from "../lib/profile.js";
import { closeWelcome } from "../lib/welcome.js";
import { showToast } from "../lib/toast.js";
import { CITIES } from "../lib/geo.js";
import "./AuthDialog.css";

// After the first sign-in: three optional questions, all of which can be skipped or changed later
// on /account. The city picks the markets nearby; the role only shapes suggestions.
export default function WelcomeDialog() {
  const { t } = useLanguage();
  const profile = useProfile();
  const [name, setName] = useState(profile.name);
  const [city, setCity] = useState(profile.city);
  const [role, setRole] = useState(profile.role);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && closeWelcome();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function save(e) {
    e.preventDefault();
    updateProfile({ name: name.trim(), city: city.trim(), role });
    closeWelcome();
    showToast({ message: t("welcome.saved") });
  }

  return (
    <div className="auth-dialog" onMouseDown={(e) => e.target === e.currentTarget && closeWelcome()}>
      <div className="auth-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <button type="button" className="auth-dialog__close" onClick={closeWelcome} aria-label={t("lightbox.close")}>
          ×
        </button>
        <span className="eyebrow">{t("welcome.eyebrow")}</span>
        <h2 id="welcome-title">{t("welcome.title")}</h2>
        <p className="auth-dialog__lede">{t("welcome.lede")}</p>
        <form className="auth-dialog__form" onSubmit={save}>
          <label htmlFor="welcome-name">{t("account.name")}</label>
          <input ref={inputRef} id="welcome-name" type="text" value={name} maxLength={80} autoComplete="given-name" onChange={(e) => setName(e.target.value)} />
          <label htmlFor="welcome-city">{t("account.city")}</label>
          <input id="welcome-city" type="text" list="welcome-cities" value={city} maxLength={80} onChange={(e) => setCity(e.target.value)} />
          <datalist id="welcome-cities">
            {CITIES.map((c) => (
              <option key={c.key} value={c.label} />
            ))}
          </datalist>
          <fieldset className="welcome-roles">
            <legend>{t("welcome.roleQuestion")}</legend>
            {ROLES.map((r) => (
              <button key={r} type="button" className={`welcome-role${role === r ? " is-on" : ""}`} aria-pressed={role === r} onClick={() => setRole(role === r ? null : r)}>
                {t(`account.roles.${r}`)}
              </button>
            ))}
          </fieldset>
          <button type="submit" className="auth-dialog__google">
            {t("welcome.save")}
          </button>
          <button type="button" className="auth-form__switch" onClick={closeWelcome}>
            {t("welcome.later")}
          </button>
        </form>
        <p className="auth-dialog__fine">
          {t("welcome.next")}{" "}
          <Link to="/archive" onClick={closeWelcome}>
            {t("nav.archive")}
          </Link>
          {" · "}
          <Link to="/markets" onClick={closeWelcome}>
            {t("nav.markets")}
          </Link>
        </p>
      </div>
    </div>
  );
}
