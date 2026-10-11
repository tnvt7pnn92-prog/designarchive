import { useEffect } from "react";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { openAuth } from "../lib/authDialog.js";
import { startAuth } from "../lib/auth.js";
import { showToast } from "../lib/toast.js";
import { maybeWelcome } from "../lib/welcome.js";

// Turns the account layer's events into words on screen: the invitations to sign up, the notice
// after the first merge ("12 pieces of your collection and 1 moodboard added to your account"). Also
// starts the session check once, on arrival.
export default function AccountEvents() {
  const { t } = useLanguage();

  useEffect(() => {
    startAuth();
  }, []);

  useEffect(() => {
    const onNudge = (e) => {
      const { reason } = e.detail;
      showToast({
        message: t(`nudge.${reason}`),
        action: { label: t("nudge.cta"), onClick: () => openAuth(reason) },
        duration: 9000,
      });
    };
    const onMerged = (e) => {
      const { collection = 0, moodboards = 0 } = e.detail ?? {};
      const parts = [
        collection ? t(collection === 1 ? "merge.piece" : "merge.pieces", { count: collection }) : null,
        moodboards ? t(moodboards === 1 ? "merge.moodboard" : "merge.moodboards", { count: moodboards }) : null,
      ].filter(Boolean);
      const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} ${t("merge.and")} ${parts.at(-1)}` : parts[0];
      showToast({ message: t("merge.notice", { list }), duration: 9000 });
    };
    // The profile module is already loaded by then (the sync engine imports it).
    const onFirstSync = (e) => import("../lib/profile.js").then(({ profileStore }) => maybeWelcome(e.detail.userId, profileStore.get()));

    window.addEventListener("design-archive:nudge", onNudge);
    window.addEventListener("design-archive:merged", onMerged);
    window.addEventListener("design-archive:first-sync", onFirstSync);
    return () => {
      window.removeEventListener("design-archive:first-sync", onFirstSync);
      window.removeEventListener("design-archive:nudge", onNudge);
      window.removeEventListener("design-archive:merged", onMerged);
    };
  }, [t]);

  return null;
}
