import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { OBJECT_PHOTOS, photoSource, photoPage } from "../data/objectPhotos.js";
import "./PhotoLightbox.css";

// Full-screen view of an archive photo, shown whole (no cropping). `objects` is the list the
// viewer can step through — the current archive results — and `index` the one on screen.
export default function PhotoLightbox({ objects, index, onClose, onNavigate }) {
  const { t } = useLanguage();
  const closeRef = useRef(null);
  const object = objects[index];
  const canStep = Boolean(onNavigate) && objects.length > 1;

  const step = (delta) => onNavigate((index + delta + objects.length) % objects.length);

  // Lock page scroll while open and hand focus back to the card that opened it.
  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      else if (canStep && e.key === "ArrowRight") step(1);
      else if (canStep && e.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!object) return null;
  const photo = OBJECT_PHOTOS[object.id];

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={object.name} onClick={onClose}>
      <button ref={closeRef} type="button" className="lightbox__close" onClick={onClose} aria-label={t("lightbox.close")}>
        ×
      </button>

      {canStep && (
        <>
          <span className="lightbox__count">
            {index + 1} / {objects.length}
          </span>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--prev"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            aria-label={t("lightbox.previous")}
          >
            ‹
          </button>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--next"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            aria-label={t("lightbox.next")}
          >
            ›
          </button>
        </>
      )}

      <figure className="lightbox__figure" onClick={(e) => e.stopPropagation()}>
        <img key={object.id} src={object.image} alt={object.name} />
        <figcaption className="lightbox__caption">
          <strong>
            <Link to={`/piece/${object.id}`} onClick={onClose}>
              {object.name}
            </Link>
          </strong>
          <span>
            {object.designer} · {object.year}
          </span>
          {photo && (
            <small>
              {/* Public-domain painting reproductions list the painter as author; don't credit
                  them as the photographer. */}
              {t("lightbox.photo")}:{" "}
              {photo.author && photo.author !== object.designer ? `${photo.author} · ` : ""}
              {photo.license} ·{" "}
              {photoPage(photo) ? (
                <a href={photoPage(photo)} target="_blank" rel="noreferrer">
                  {photoSource(photo)}
                </a>
              ) : (
                photoSource(photo)
              )}
            </small>
          )}
        </figcaption>
      </figure>
    </div>,
    document.body
  );
}
