import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { replaceUser } from "../lib/auth.js";
import { changePassword, updateMe } from "../lib/account.js";
import { countryOptions } from "../lib/countries.js";
import { MAX_AGE, MIN_AGE, isoDateYearsAgo, passwordProblem, validateProfile } from "../lib/signup.js";
import { showToast } from "../lib/toast.js";

const PASSWORD_KEY = { short: "passwordShort", long: "passwordLong", weak: "passwordWeak" };

// The personal data of an account on Railway: name, surname, date of birth, country of residence. The email
// is shown, not edited (it is the sign-in).
export function PersonalDataCard({ user }) {
  const { t, lang } = useLanguage();
  const [values, setValues] = useState({ firstName: user.firstName ?? "", lastName: user.lastName ?? "", birthDate: user.birthDate ?? "", country: user.country ?? "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    const found = validateProfile(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    const { data, error } = await updateMe(values);
    setBusy(false);
    if (error) {
      if (error.errors && Object.keys(error.errors).length) setErrors(error.errors);
      else showToast({ message: t("auth.errors.generic") });
      return;
    }
    replaceUser(data);
    showToast({ message: t("account.detailsSaved") });
  }

  const field = (key, label, input) => (
    <label className={errors[key] ? "has-error" : ""}>
      <span>{label}</span>
      {input}
      {errors[key] && <small className="account-error">{t(`auth.errors.${errors[key]}`)}</small>}
    </label>
  );

  return (
    <section className="account-card">
      <h2>{t("account.detailsTitle")}</h2>
      <p className="account-muted">{t("account.detailsText", { email: user.email })}</p>
      <form className="account-form" onSubmit={save} noValidate>
        {field("firstName", t("auth.firstName"), <input type="text" autoComplete="given-name" maxLength={60} value={values.firstName} onChange={set("firstName")} />)}
        {field("lastName", t("auth.lastName"), <input type="text" autoComplete="family-name" maxLength={60} value={values.lastName} onChange={set("lastName")} />)}
        {field(
          "birthDate",
          t("auth.birthDate"),
          <input type="date" autoComplete="bday" min={isoDateYearsAgo(MAX_AGE)} max={isoDateYearsAgo(MIN_AGE)} value={values.birthDate} onChange={set("birthDate")} />
        )}
        {field(
          "country",
          t("auth.country"),
          <select autoComplete="country" value={values.country} onChange={set("country")}>
            <option value="">{t("auth.countryPlaceholder")}</option>
            {countryOptions(lang).map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <div className="account-actions">
          <button type="submit" className="btn" disabled={busy}>
            {t("account.detailsSave")}
          </button>
        </div>
      </form>
    </section>
  );
}

// Change the password (the current one is asked again). Other devices are signed out.
export function PasswordCard() {
  const { t } = useLanguage();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    const problem = passwordProblem(next);
    if (!current) return setError("required");
    if (problem) return setError(PASSWORD_KEY[problem]);
    setError(null);
    setBusy(true);
    const result = await changePassword(current, next);
    setBusy(false);
    if (result.error) {
      setError(result.error.code === "invalid_credentials" ? "currentPasswordWrong" : result.error.errors?.password ?? "generic");
      return;
    }
    setCurrent("");
    setNext("");
    showToast({ message: t("account.passwordChanged") });
  }

  return (
    <section className="account-card">
      <h2>{t("account.passwordTitle")}</h2>
      <p className="account-muted">{t("account.passwordText")}</p>
      <form className="account-form" onSubmit={save} noValidate>
        <label>
          <span>{t("account.currentPassword")}</span>
          <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label>
          <span>{t("account.newPassword")}</span>
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          <small>{t("auth.passwordHint")}</small>
        </label>
        {error && (
          <p className="account-error" role="alert">
            {t(`auth.errors.${error}`)}
          </p>
        )}
        <div className="account-actions">
          <button type="submit" className="btn" disabled={busy}>
            {t("account.passwordSave")}
          </button>
        </div>
      </form>
    </section>
  );
}
