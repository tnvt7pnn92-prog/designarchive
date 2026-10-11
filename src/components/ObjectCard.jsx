import { lazy, Suspense, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { usePieceTransition } from "../lib/pieceTransition.js";
import SmartImage from "./SmartImage.jsx";
import MaterialField from "./MaterialField.jsx";
import Label from "./Label.jsx";
import CollectionMenu from "./CollectionMenu.jsx";
import "./ObjectCard.css";

// The lightbox reads the whole photo-credit catalogue; it only loads when someone opens one.
const PhotoLightbox = lazy(() => import("./PhotoLightbox.jsx"));

// One card for every grid on the site: the photo, and the piece's museum label pinned over its
// foot. The whole card opens the piece page (the title link is stretched over it, and its photo
// grows into the page's photo); the two small buttons on the photo put the piece in the collection (the heart) and
// open the photo on its own. `onOpen` lets a page (the Archive) show that photo in a lightbox that
// steps through its results.
export default function ObjectCard({ object, onOpen }) {
  const { t } = useLanguage();
  const pieceTransition = usePieceTransition();
  const mediaRef = useRef(null);
  const [open, setOpen] = useState(false);
  const href = `/piece/${object.id}`;

  return (
    <article className="object-card">
      <div className="object-card__media" ref={mediaRef}>
        <SmartImage
          src={object.image}
          alt=""
          card
          category={object.category}
          ratio="4 / 5"
          cutout={object.cutout}
          fallback={<MaterialField object={object} />}
        />
      </div>
      {object.image && (
        <button
          type="button"
          className="object-card__zoom"
          onClick={() => (onOpen ? onOpen(object) : setOpen(true))}
          aria-label={`${t("lightbox.enlarge")}: ${object.name}`}
          title={t("lightbox.enlarge")}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
          </svg>
        </button>
      )}
      <CollectionMenu object={object} className="object-card__add" />
      <Label
        className="object-card__label"
        status={object.country}
        name={
          <Link to={href} onClick={(event) => pieceTransition(event, href, mediaRef.current?.querySelector(".smart-image"))}>
            {object.name}
          </Link>
        }
        by={`${object.designer}, ${object.year}`}
        rows={[{ label: t("piece.brand"), value: object.brand }]}
      />
      {open && (
        <Suspense fallback={null}>
          <PhotoLightbox objects={[object]} index={0} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </article>
  );
}
