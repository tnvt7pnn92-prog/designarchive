import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { dismissToast, useToasts } from "../lib/toast.js";
import "./Toaster.css";

// Where showToast() messages appear. The region is always in the page, so screen readers
// announce each message as it is added.
export default function Toaster() {
  const { t } = useLanguage();
  const toasts = useToasts();

  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          <span className="toast__message">{toast.message}</span>
          {toast.action?.to && (
            <Link className="toast__action" to={toast.action.to} onClick={() => dismissToast(toast.id)}>
              {toast.action.label}
            </Link>
          )}
          {toast.action?.onClick && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                dismissToast(toast.id);
                toast.action.onClick();
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" className="toast__close" onClick={() => dismissToast(toast.id)} aria-label={t("lightbox.close")}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
