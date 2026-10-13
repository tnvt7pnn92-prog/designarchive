import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { CATEGORIES } from "../lib/marketGuide.js";
import { CONTACT_EMAIL, mailto, validEmail, validLink } from "../lib/contact.js";
import "./MarketContactDialog.css";

// The guide's requests, in one dialog: "listing" (a shop asks to be in the guide), "products" (a brand
// or designer proposes pieces for the archive) and "suggest" (a visitor tells us about a place, or
// corrects one: `place` fills the name and city).
// Checked here, then written as an email for the visitor's own mail app — there is no server.
export default function MarketContactDialog({ mode, place = null, onClose }) {
  const { t } = useLanguage();
  const id = useId();
  const panel = useRef(null);
  const listing = mode === "listing";
  const products = mode === "products";
  const [values, setValues] = useState({
    name: place?.name ?? "",
    city: place?.city ?? "",
    kind: "",
    link: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const ready = Boolean(CONTACT_EMAIL);

  // Esc closes; focus starts in the form and comes back where it was.
  useEffect(() => {
    const before = document.activeElement;
    panel.current?.querySelector("input, select, textarea, button")?.focus();
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, [onClose]);

  const set = (key) => (event) => {
    setValues((v) => ({ ...v, [key]: event.target.value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function check() {
    const next = {};
    if (!values.name.trim()) next.name = t("markets.contact.required");
    if (!values.city.trim()) next.city = t("markets.contact.required");
    if (!validLink(values.link)) next.link = t("markets.contact.invalidLink");
    // A shop or a brand must leave a way to answer; a suggestion may come without one.
    if ((listing || products) && !values.email.trim()) next.email = t("markets.contact.required");
    else if (values.email.trim() && !validEmail(values.email)) next.email = t("markets.contact.invalidEmail");
    return next;
  }

  function submit(event) {
    event.preventDefault();
    if (!ready) return;
    const next = check();
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      panel.current?.querySelector(`[name="${first}"]`)?.focus();
      return;
    }
    const kindName = values.kind ? t(`markets.categories.${values.kind}.name`) : "";
    const lines = [
      [t(products ? "markets.contact.fieldBrand" : "markets.contact.fieldName"), values.name],
      [t("markets.contact.fieldCity"), values.city],
      [t("markets.contact.fieldKind"), kindName],
      [t("markets.contact.fieldLink"), values.link],
      [t("markets.contact.fieldEmail"), values.email],
    ]
      .filter(([, v]) => v.trim())
      .map(([label, v]) => `${label}: ${v.trim()}`);
    const body = `${lines.join("\n")}${values.message.trim() ? `\n\n${values.message.trim()}` : ""}${place ? `\n\n${window.location.href}` : ""}`;
    const subject = t(listing ? "markets.contact.subjectListing" : products ? "markets.contact.subjectProducts" : "markets.contact.subjectSuggest", { name: values.name.trim() });
    window.location.href = mailto({ subject, body });
    setSent(true);
  }

  const field = (key, label, { type = "text", optional = false, as = "input", autoComplete } = {}) => {
    const Tag = as;
    const errorId = `${id}-${key}-error`;
    return (
      <label className="mc-field">
        <span className="mc-field__label">
          {label}
          {optional && <span className="mc-field__optional"> · {t("markets.contact.optional")}</span>}
        </span>
        <Tag
          name={key}
          type={as === "input" ? type : undefined}
          value={values[key]}
          onChange={set(key)}
          autoComplete={autoComplete}
          rows={as === "textarea" ? 4 : undefined}
          aria-invalid={errors[key] ? true : undefined}
          aria-describedby={errors[key] ? errorId : undefined}
          disabled={!ready}
        />
        {errors[key] && (
          <span className="mc-field__error" id={errorId}>
            {errors[key]}
          </span>
        )}
      </label>
    );
  };

  return createPortal(
    <div className="mc-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} className="mc-panel" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
        <button type="button" className="mc-close" onClick={onClose} aria-label={t("markets.contact.close")}>
          ×
        </button>
        <h2 id={`${id}-title`}>{t(listing ? "markets.contact.ownerTitle" : products ? "markets.contact.productsTitle" : place ? "markets.contact.fixLink" : "markets.contact.suggestTitle")}</h2>
        <p className="mc-lede">{t(listing ? "markets.contact.ownerText" : products ? "markets.contact.productsText" : "markets.contact.suggestText")}</p>

        {sent ? (
          <p className="mc-sent" role="status">
            {t("markets.contact.sent", { email: CONTACT_EMAIL })}
          </p>
        ) : (
          <form className="mc-form" onSubmit={submit} noValidate>
            {field("name", t(products ? "markets.contact.fieldBrand" : "markets.contact.fieldName"))}
            {field("city", t("markets.contact.fieldCity"))}
            {!products && (
              <label className="mc-field">
                <span className="mc-field__label">
                  {t("markets.contact.fieldKind")}
                  <span className="mc-field__optional"> · {t("markets.contact.optional")}</span>
                </span>
                <select name="kind" value={values.kind} onChange={set("kind")} disabled={!ready}>
                  <option value="">—</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {t(`markets.categories.${c.key}.name`)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {field("link", t("markets.contact.fieldLink"), { optional: true, autoComplete: "url" })}
            {field("email", t("markets.contact.fieldEmail"), { type: "email", optional: !listing && !products, autoComplete: "email" })}
            {field("message", t("markets.contact.fieldMessage"), { as: "textarea", optional: true })}
            {listing && <p className="mc-note">{t("markets.contact.listingNote")}</p>}
            {products && <p className="mc-note">{t("markets.contact.productsNote")}</p>}
            {!ready && (
              <p className="mc-soon" role="note">
                {t("markets.contact.soon")}
              </p>
            )}
            <button type="submit" className="mc-submit" disabled={!ready}>
              {t("markets.contact.send")}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
