import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { LANGUAGES, LANGUAGE_NAMES } from "../i18n/dictionaries.js";
import { authProvider, useAuth, signOut } from "../lib/auth.js";
import { openAuth } from "../lib/authDialog.js";
import { callFunction, getClient } from "../lib/backend.js";
import { deleteMe } from "../lib/account.js";
import { PasswordCard, PersonalDataCard } from "../components/AccountDetails.jsx";
import { ROLES, updateProfile, useProfile } from "../lib/profile.js";
import { clearLocalData, localSnapshot } from "../lib/userData.js";
import { siteTitle } from "../lib/seo.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import { showToast } from "../lib/toast.js";
import { CITIES } from "../lib/geo.js";
import "./Account.css";

function download(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// The account page: profile, "download my data" and "delete". Works for guests too — then it is
// about what this browser holds.
export default function Account() {
  const { t, lang, setLang } = useLanguage();
  useDocumentMeta({ title: siteTitle(t("nav.account")) });
  const { status, user } = useAuth();
  const profile = useProfile();
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const signedIn = status === "signedIn";
  // Accounts on Railway: personal data and password here; deleting asks for the password.
  const railway = signedIn && authProvider === "railway";
  const deleteWord = t("account.deleteWord");
  const deleteConfirmed = railway ? confirm.length > 0 : confirm.trim().toUpperCase() === deleteWord.toUpperCase();

  async function exportData() {
    const local = localSnapshot();
    if (!signedIn) {
      download("design-archive-my-data.json", { exportedAt: new Date().toISOString(), browser: local });
      return;
    }
    if (railway) {
      const { id, email, firstName, lastName, birthDate, country } = user;
      download("design-archive-my-data.json", { exportedAt: new Date().toISOString(), account: { id, email, firstName, lastName, birthDate, country }, browser: local });
      return;
    }
    const client = await getClient();
    const { data, error } = await client.rpc("export_my_data");
    if (error) {
      showToast({ message: t("account.exportError") });
      return;
    }
    download("design-archive-my-data.json", { exportedAt: new Date().toISOString(), account: data, browser: local });
  }

  async function deleteEverything() {
    if (!deleteConfirmed) return;
    setDeleting(true);
    if (railway) {
      const { error } = await deleteMe(confirm);
      if (error) {
        setDeleting(false);
        showToast({ message: error.code === "invalid_credentials" ? t("auth.errors.currentPasswordWrong") : t("account.deleteError") });
        return;
      }
      await signOut();
    } else if (signedIn) {
      const { error } = await callFunction("delete-account", {});
      if (error) {
        setDeleting(false);
        showToast({ message: t("account.deleteError") });
        return;
      }
      await signOut();
    }
    clearLocalData();
    setDeleting(false);
    setConfirm("");
    showToast({ message: signedIn ? t("account.deletedAccount") : t("account.deletedLocal") });
  }

  return (
    <div className="account-page container">
      <header className="account-hero">
        <span className="eyebrow">{t("account.eyebrow")}</span>
        <h1>{signedIn ? t("account.title") : t("account.guestTitle")}</h1>
        <p>{signedIn ? t("account.signedInAs") + " " + user.email : t("account.guestText")}</p>
        {!signedIn && authProvider && (
          <div className="account-hero__actions">
            <button type="button" className="btn btn--solid" onClick={() => openAuth("menu", "signup")}>
              {t("header.signUpFree")}
            </button>
            <button type="button" className="btn" onClick={() => openAuth("menu", "signin")}>
              {t("header.signIn")}
            </button>
          </div>
        )}
        {!authProvider && <p className="account-note">{t("auth.notConfigured")}</p>}
      </header>

      <div className="account-grid">
        {railway && <PersonalDataCard key={user.id} user={user} />}
        {railway && <PasswordCard />}
        <section className="account-card">
          <h2>{t("account.profileTitle")}</h2>
          <p className="account-muted">{signedIn ? t("account.profileSynced") : t("account.profileLocal")}</p>
          <form className="account-form" onSubmit={(e) => e.preventDefault()}>
            <label>
              <span>{t("account.name")}</span>
              <input type="text" value={profile.name} maxLength={80} onChange={(e) => updateProfile({ name: e.target.value })} autoComplete="name" />
            </label>
            <label>
              <span>{t("account.city")}</span>
              <input type="text" list="account-cities" value={profile.city} maxLength={80} onChange={(e) => updateProfile({ city: e.target.value })} />
              <small>{t("account.cityHint")}</small>
            </label>
            <datalist id="account-cities">
              {CITIES.map((city) => (
                <option key={city.key} value={city.label} />
              ))}
            </datalist>
            <label>
              <span>{t("account.role")}</span>
              <select value={profile.role ?? ""} onChange={(e) => updateProfile({ role: e.target.value || null })}>
                <option value="">{t("account.roleNone")}</option>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {t(`account.roles.${role}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("header.language")}</span>
              <select
                value={lang}
                onChange={(e) => {
                  setLang(e.target.value);
                  updateProfile({ lang: e.target.value });
                }}
              >
                {LANGUAGES.map((code) => (
                  <option key={code} value={code}>
                    {LANGUAGE_NAMES[code]}
                  </option>
                ))}
              </select>
            </label>
          </form>
        </section>

        <section className="account-card">
          <h2>{t("account.dataTitle")}</h2>
          <p className="account-muted">{signedIn ? t("account.dataTextAccount") : t("account.dataTextLocal")}</p>
          <div className="account-actions">
            <button type="button" className="btn" onClick={exportData}>
              {t("account.export")}
            </button>
            <Link to="/privacy" className="account-link">
              {t("nav.privacy")} →
            </Link>
          </div>
        </section>

        <section className="account-card account-card--danger">
          <h2>{signedIn ? t("account.deleteTitle") : t("account.deleteLocalTitle")}</h2>
          <p className="account-muted">{signedIn ? t("account.deleteText") : t("account.deleteLocalText")}</p>
          <label className="account-confirm">
            <span>{railway ? t("account.deleteConfirmPassword") : t("account.deleteConfirm", { word: deleteWord })}</span>
            <input
              type={railway ? "password" : "text"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete={railway ? "current-password" : "off"}
            />
          </label>
          <button type="button" className="account-delete" disabled={deleting || !deleteConfirmed} onClick={deleteEverything}>
            {signedIn ? t("account.deleteButton") : t("account.deleteLocalButton")}
          </button>
        </section>
      </div>

      {signedIn && (
        <p className="account-signout">
          <button type="button" className="account-link" onClick={() => signOut()}>
            {t("account.signOut")}
          </button>
        </p>
      )}
    </div>
  );
}
