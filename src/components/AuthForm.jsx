import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { authProvider, signInWithEmail, signInWithGoogle, signInWithPassword, signUpWithPassword } from "../lib/auth.js";
import { forgotPassword } from "../lib/account.js";
import { countryOptions } from "../lib/countries.js";
import { MAX_AGE, MIN_AGE, emailValid, isoDateYearsAgo, validateSignUp } from "../lib/signup.js";
import "./AuthDialog.css";

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

// Maps a server error to the words for it (auth.errors.*).
const SERVER_ERRORS = {
  invalid_credentials: "invalidCredentials",
  rate_limited: "rateLimited",
  network: "network",
  email_not_configured: "emailNotConfigured",
  not_configured: "notConfigured",
};

function Field({ id, label, error, t, children, hint }) {
  return (
    <div className={`auth-field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && (
        <small id={`${id}-hint`} className="auth-field__hint">
          {hint}
        </small>
      )}
      {error && (
        <small id={`${id}-error`} className="auth-field__error" role="alert">
          {t(`auth.errors.${error}`)}
        </small>
      )}
    </div>
  );
}

const EMPTY = { firstName: "", lastName: "", birthDate: "", country: "", email: "", password: "" };

// Railway accounts: sign up with name, surname, date of birth, country of residence, email and password;
// sign in with email and password; ask for a new password by email.
function PasswordForms({ mode, onModeChange, onNavigate, autoFocus }) {
  const { t, lang } = useLanguage();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState("form"); // form | forgot | forgotSent
  const firstRef = useRef(null);
  const ready = authProvider === "railway";

  useEffect(() => {
    if (autoFocus) firstRef.current?.focus();
  }, [autoFocus, mode, view]);

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key]) setErrors((errs) => ({ ...errs, [key]: undefined }));
  };
  const describe = (id, hint) => (errors[id] ? `auth-${id}-error` : hint ? `auth-${id}-hint` : undefined);

  async function submit(e) {
    e.preventDefault();
    setFormError(null);
    if (mode === "signup") {
      const found = validateSignUp(values);
      setErrors(found);
      if (Object.keys(found).length) return;
      setBusy(true);
      const { error } = await signUpWithPassword(values);
      setBusy(false);
      if (error) {
        if (error.errors && Object.keys(error.errors).length) setErrors(error.errors);
        else setFormError(SERVER_ERRORS[error.code] ?? "generic");
      }
      return;
    }
    const found = {};
    if (!emailValid(values.email)) found.email = values.email.trim() ? "invalidEmail" : "required";
    if (!values.password) found.password = "required";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    const { error } = await signInWithPassword(values.email, values.password);
    setBusy(false);
    if (error) setFormError(SERVER_ERRORS[error.code] ?? "generic");
  }

  async function sendReset(e) {
    e.preventDefault();
    setFormError(null);
    if (!emailValid(values.email)) {
      setErrors({ email: values.email.trim() ? "invalidEmail" : "required" });
      return;
    }
    setBusy(true);
    const { error } = await forgotPassword(values.email);
    setBusy(false);
    if (error) setFormError(SERVER_ERRORS[error.code] ?? "generic");
    else setView("forgotSent");
  }

  const notice = !ready && <p className="auth-dialog__notice">{t("auth.notConfigured")}</p>;
  const problem = formError && (
    <p className="auth-dialog__error" role="alert">
      {t(`auth.errors.${formError}`)}
    </p>
  );

  if (view === "forgotSent") {
    return (
      <div className="auth-form">
        <div className="auth-dialog__sent" role="status">
          <strong>{t("auth.sentTitle")}</strong>
          <p>{t("auth.forgotSent")}</p>
        </div>
        <button type="button" className="auth-form__switch" onClick={() => setView("form")}>
          {t("auth.backToSignin")}
        </button>
      </div>
    );
  }

  if (view === "forgot") {
    return (
      <form className="auth-form auth-dialog__form" onSubmit={sendReset} noValidate>
        {notice}
        <p className="auth-dialog__lede">{t("auth.forgotLede")}</p>
        <Field id="auth-email" label={t("auth.emailLabel")} error={errors.email} t={t}>
          <input ref={firstRef} id="auth-email" type="email" autoComplete="email" value={values.email} onChange={set("email")} aria-invalid={Boolean(errors.email)} aria-describedby={describe("email")} />
        </Field>
        <button type="submit" className="auth-dialog__google" disabled={busy || !ready}>
          {busy ? t("auth.sending") : t("auth.forgotSend")}
        </button>
        {problem}
        <button type="button" className="auth-form__switch" onClick={() => setView("form")}>
          {t("auth.backToSignin")}
        </button>
      </form>
    );
  }

  const signup = mode === "signup";
  return (
    <form className="auth-form auth-dialog__form" onSubmit={submit} noValidate>
      {notice}
      {signup && (
        <>
          <div className="auth-row">
            <Field id="auth-firstName" label={t("auth.firstName")} error={errors.firstName} t={t}>
              <input ref={firstRef} id="auth-firstName" type="text" autoComplete="given-name" maxLength={60} value={values.firstName} onChange={set("firstName")} aria-invalid={Boolean(errors.firstName)} aria-describedby={describe("firstName")} />
            </Field>
            <Field id="auth-lastName" label={t("auth.lastName")} error={errors.lastName} t={t}>
              <input id="auth-lastName" type="text" autoComplete="family-name" maxLength={60} value={values.lastName} onChange={set("lastName")} aria-invalid={Boolean(errors.lastName)} aria-describedby={describe("lastName")} />
            </Field>
          </div>
          <div className="auth-row">
            <Field id="auth-birthDate" label={t("auth.birthDate")} error={errors.birthDate} t={t}>
              <input
                id="auth-birthDate"
                type="date"
                autoComplete="bday"
                min={isoDateYearsAgo(MAX_AGE)}
                max={isoDateYearsAgo(MIN_AGE)}
                value={values.birthDate}
                onChange={set("birthDate")}
                aria-invalid={Boolean(errors.birthDate)}
                aria-describedby={describe("birthDate")}
              />
            </Field>
            <Field id="auth-country" label={t("auth.country")} error={errors.country} t={t}>
              <select id="auth-country" autoComplete="country" value={values.country} onChange={set("country")} aria-invalid={Boolean(errors.country)} aria-describedby={describe("country")}>
                <option value="">{t("auth.countryPlaceholder")}</option>
                {countryOptions(lang).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </>
      )}
      <Field id="auth-email" label={t("auth.emailLabel")} error={errors.email} t={t}>
        <input
          ref={signup ? undefined : firstRef}
          id="auth-email"
          type="email"
          autoComplete="email"
          placeholder={t("auth.emailPlaceholder")}
          value={values.email}
          onChange={set("email")}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describe("email")}
        />
      </Field>
      <Field id="auth-password" label={t("auth.password")} error={errors.password} t={t} hint={signup ? t("auth.passwordHint") : null}>
        <div className="auth-password">
          <input
            id="auth-password"
            type={showPassword ? "text" : "password"}
            autoComplete={signup ? "new-password" : "current-password"}
            value={values.password}
            onChange={set("password")}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={describe("password", signup)}
          />
          <button type="button" className="auth-password__toggle" aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}>
            {showPassword ? t("auth.hide") : t("auth.show")}
          </button>
        </div>
      </Field>
      {!signup && (
        <button type="button" className="auth-form__switch auth-form__forgot" onClick={() => setView("forgot")}>
          {t("auth.forgot")}
        </button>
      )}
      <button type="submit" className="auth-dialog__google" disabled={busy || !ready}>
        {busy ? (signup ? t("auth.creating") : t("auth.signingIn")) : signup ? t("auth.createAccount") : t("auth.signinButton")}
      </button>
      {problem}
      {onModeChange && (
        <p className="auth-form__toggle">
          {signup ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
          <button type="button" className="auth-form__switch" onClick={() => onModeChange(signup ? "signin" : "signup")}>
            {signup ? t("auth.signInInstead") : t("auth.signUpInstead")}
          </button>
        </p>
      )}
      {signup && (
        <p className="auth-dialog__fine">
          {t("auth.fineAccount")}{" "}
          <Link to="/privacy" onClick={onNavigate}>
            {t("nav.privacy")}
          </Link>
        </p>
      )}
    </form>
  );
}

// Supabase accounts: an email link or Google, no password.
function LinkForm({ mode, onModeChange, onNavigate, autoFocus }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState("form"); // form | sending | sent | error
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  async function submit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setPhase("sending");
    const { error } = await signInWithEmail(email.trim());
    setPhase(error ? "error" : "sent");
  }

  async function google() {
    const { error } = await signInWithGoogle();
    if (error) setPhase("error");
  }

  if (phase === "sent") {
    return (
      <div className="auth-form">
        <div className="auth-dialog__sent" role="status">
          <strong>{t("auth.sentTitle")}</strong>
          <p>{t("auth.sentText", { email })}</p>
        </div>
        <button type="button" className="auth-form__switch" onClick={() => setPhase("form")}>
          {t("auth.otherAddress")}
        </button>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <button type="button" className="auth-dialog__google" onClick={google}>
        <GoogleMark />
        {t("auth.google")}
      </button>
      <div className="auth-dialog__or">
        <span>{t("auth.or")}</span>
      </div>
      <form onSubmit={submit} className="auth-dialog__form">
        <label htmlFor={`auth-email-${mode}`}>{t("auth.emailLabel")}</label>
        <input ref={inputRef} id={`auth-email-${mode}`} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.emailPlaceholder")} />
        <button type="submit" className="auth-dialog__submit" disabled={phase === "sending"}>
          {phase === "sending" ? t("auth.sending") : mode === "signup" ? t("auth.createAccount") : t("auth.sendLink")}
        </button>
        {phase === "error" && (
          <p className="auth-dialog__error" role="alert">
            {t("auth.error")}
          </p>
        )}
      </form>
      {onModeChange && (
        <p className="auth-form__toggle">
          {mode === "signup" ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
          <button type="button" className="auth-form__switch" onClick={() => onModeChange(mode === "signup" ? "signin" : "signup")}>
            {mode === "signup" ? t("auth.signInInstead") : t("auth.signUpInstead")}
          </button>
        </p>
      )}
      <p className="auth-dialog__fine">
        {mode === "signup" ? t("auth.fineSignup") : t("auth.fine")}{" "}
        <Link to="/privacy" onClick={onNavigate}>
          {t("nav.privacy")}
        </Link>
      </p>
    </div>
  );
}

// The sign-in / sign-up form, used by the dialog and by the /registrati and /accedi pages. With
// no accounts service yet, the Railway form shows (so the section can be seen) with a notice and
// its button switched off.
export default function AuthForm(props) {
  return authProvider === "supabase" ? <LinkForm {...props} /> : <PasswordForms key={props.mode} {...props} />;
}
