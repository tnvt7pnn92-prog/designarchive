import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { stepsToOrigin } from "../lib/pieceOrigin.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useMoodboard } from "../context/MoodboardContext.jsx";
import { objectById, BY_CATEGORY, BY_DESIGNER, BY_COUNTRY, storiesForObject } from "../data/indexes.js";
import { fillRow, shownIn } from "../lib/related.js";
import RelatedRow from "../components/RelatedRow.jsx";
import { OBJECT_PHOTOS, photoSource, photoPage } from "../data/objectPhotos.js";
import { decadeOf, BEFORE_1900 } from "../data/objects.js";
import { archiveHref } from "../lib/archiveParams.js";
import { slugify } from "../lib/slug.js";
import { PIECE_HERO_SIZES } from "../lib/imageUrls.js";
import { seoForPiece } from "../lib/seo.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import { usePieceTransition } from "../lib/pieceTransition.js";
import { useRoomToggle, useCollectionAction } from "../lib/useRoomToggle.js";
import { useCollection } from "../lib/collection.js";
import { HeartIcon } from "../components/CollectionMenu.jsx";
import { showToast } from "../lib/toast.js";
import PhotoLightbox from "../components/PhotoLightbox.jsx";
import SmartImage from "../components/SmartImage.jsx";
import MaterialField from "../components/MaterialField.jsx";
import Label from "../components/Label.jsx";
import { useShareLabel } from "../lib/useShareLabel.js";
import StoryCard from "../components/StoryCard.jsx";
import WhereToFind from "../components/WhereToFind.jsx";
import NotFound from "./NotFound.jsx";
import "./Piece.css";

// The pieces either side of this one in its category, in archive order, wrapping at the ends.
function neighbours(object) {
  const list = BY_CATEGORY.get(object.category) ?? [];
  const i = list.findIndex((o) => o.id === object.id);
  if (list.length < 2 || i === -1) return [];
  return [list[(i - 1 + list.length) % list.length], list[(i + 1) % list.length]];
}

function PagerLink({ object, direction, label }) {
  const pieceTransition = usePieceTransition();
  const href = `/piece/${object.id}`;
  return (
    <Link className={`piece-pager__link is-${direction}`} to={href} onClick={(event) => pieceTransition(event, href)}>
      <SmartImage src={object.image} cutout={object.cutout} alt="" card category={object.category} ratio="1" className="piece-pager__thumb" />
      <span className="piece-pager__text">
        <span className="piece-pager__label">{label}</span>
        <strong>{object.name}</strong>
      </span>
    </Link>
  );
}

export default function Piece() {
  const { id } = useParams();
  const { t } = useLanguage();
  const { isInMoodboard } = useMoodboard();
  const toggleRoom = useRoomToggle();
  const setCollection = useCollectionAction();
  const collection = useCollection();
  const [zoom, setZoom] = useState(false);
  const object = objectById(id);
  const { sharePiece } = useShareLabel();
  const navigate = useNavigate();

  useDocumentMeta(object ? seoForPiece(object) : undefined);

  // Close: back to the page the visitor opened the piece from (same filters, same scroll), or to
  // the archive when the piece was the first page of the visit.
  const close = useCallback(() => {
    const steps = stepsToOrigin();
    if (steps) navigate(steps);
    else navigate("/archive");
  }, [navigate]);

  // Escape closes too, unless it is meant for something open on the page (the photo, a menu, a
  // dialog) or for a field being typed in.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented || zoom) return;
      if (event.target.closest?.("input, textarea, select, [contenteditable]")) return;
      if (document.querySelector('[role="dialog"], [aria-modal="true"], [aria-expanded="true"]')) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, zoom]);

  if (!object) return <NotFound />;

  const photo = OBJECT_PHOTOS[object.id];
  const added = isInMoodboard(object.id);
  const status = collection.find((item) => item.id === object.id)?.status ?? null;

  const decade = String(decadeOf(object.year));
  const decadeLabel = decade === BEFORE_1900 ? t("filters.before1900") : decade;
  const designer = BY_DESIGNER.get(slugify(object.designer));
  const byDesigner = (designer?.objects ?? []).filter((o) => o.id !== object.id);
  const spirit = t("piece.sameSpirit");
  // "By the designer", completed with pieces in the same spirit; then "Also from the country",
  // without repeating anything the first row shows.
  const designerRow = fillRow({
    object,
    own: byDesigner,
    title: t("piece.byDesigner", { designer: object.designer }),
    more: byDesigner.length > 4 ? { to: `/designer/${slugify(object.designer)}`, label: t("piece.allBy", { count: byDesigner.length + 1 }) } : null,
    spiritTitle: spirit,
  });
  const countryRow = fillRow({
    object,
    own: (BY_COUNTRY.get(object.country) ?? []).filter((o) => o.id !== object.id && !shownIn(designerRow).has(o.id)),
    title: t("piece.alsoFrom", { country: object.country }),
    more: { to: archiveHref({ country: object.country }), label: t("piece.browse") },
    spiritTitle: spirit,
    exclude: shownIn(designerRow),
  });
  const stories = storiesForObject(object.id);
  const [previous, next] = neighbours(object);
  const categoryLabel = t(`categories.${object.category}`);

  // The phone's own share sheet where there is one; otherwise the link goes to the clipboard.
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: object.name, url });
      } catch {
        /* the visitor dismissed the share sheet */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast({ message: t("piece.shareCopied") });
    } catch {
      showToast({ message: url });
    }
  }

  return (
    <article className="piece-page">
      <div className="container piece-close">
        <button type="button" className="piece-close__button" onClick={close} aria-label={t("piece.close")} title={t("piece.close")}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <nav className="container piece-crumbs" aria-label={t("piece.breadcrumb")}>
        <ol>
          <li>
            <Link to="/archive">{t("nav.archive")}</Link>
          </li>
          <li>
            <Link to={archiveHref({ category: object.category })}>{categoryLabel}</Link>
          </li>
          <li aria-current="page">{object.name}</li>
        </ol>
      </nav>

      <div className="container piece-hero">
        <figure className="piece-hero__media">
          {/* The largest image on the page, so it loads first and at full size; until it arrives
              the frame keeps a 4:3 shape instead of collapsing. */}
          <button
            type="button"
            onClick={() => setZoom(true)}
            aria-label={`${t("lightbox.enlarge")}: ${object.name}`}
            disabled={!object.image}
            className={object.cutout ? "is-cutout" : undefined}
            style={object.cutout ? { "--cutout": object.cutout.ground } : undefined}
          >
            <SmartImage
              src={object.image}
              alt={object.name}
              category={object.category}
              natural
              fit="contain"
              priority
              sizes={PIECE_HERO_SIZES}
              fallback={<MaterialField object={object} />}
            />
          </button>
          {photo && (
            <figcaption className="piece-hero__credit">
              {t("piece.photo")}: {photo.author ? `${photo.author} · ` : ""}
              {photo.license} ·{" "}
              {photoPage(photo) ? (
                <a href={photoPage(photo)} target="_blank" rel="noreferrer">
                  {photoSource(photo)}
                </a>
              ) : (
                photoSource(photo)
              )}
            </figcaption>
          )}
        </figure>

        <div className="piece-hero__body">
          <Label
            variant="full"
            className="piece-label"
            status={categoryLabel}
            nameAs="h1"
            name={object.name}
            by={`${object.designer}, ${object.year}`}
            rows={[
              { label: t("piece.designer"), value: <Link to={`/designer/${slugify(object.designer)}`}>{object.designer}</Link> },
              { label: t("piece.brand"), value: <Link to={archiveHref({ brand: object.brand })}>{object.brand}</Link> },
              {
                label: t("piece.year"),
                value: (
                  <>
                    <Link to={archiveHref({ decade })}>{object.year}</Link> ({decadeLabel})
                  </>
                ),
              },
              { label: t("piece.country"), value: <Link to={archiveHref({ country: object.country })}>{object.country}</Link> },
              object.styles.length > 0 && {
                label: t("piece.style"),
                value: object.styles.map((style, i) => (
                  <span key={style}>
                    {i > 0 && ", "}
                    <Link to={archiveHref({ style })}>{t(`styles.${style}`)}</Link>
                  </span>
                )),
              },
              { label: t("piece.materials"), value: object.materials.join(", ") },
            ]}
          />
          <p className="piece-hero__lede">{object.description}</p>
          <div className="piece-actions">
            <button
              type="button"
              className={`piece-action piece-action--primary${added ? " is-added" : ""}`}
              onClick={() => toggleRoom(object)}
              aria-pressed={added}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <rect x="3.5" y="3.5" width="17" height="17" rx="1" />
                <path d={added ? "M8 12.5l3 3 5-6" : "M12 8v8M8 12h8"} />
              </svg>
              {added ? t("card.removeFromMoodboard") : t("card.addToMoodboard")}
            </button>
            {["saved", "own", "want", "seen"].map((state) => (
              <button
                key={state}
                type="button"
                className={`piece-action${state === "saved" ? " piece-action--icon" : ""}${status === state ? " is-added" : ""}`}
                onClick={() => setCollection(object, state)}
                aria-pressed={status === state}
                aria-label={state === "saved" ? t("collection.action.saved") : undefined}
                title={state === "saved" ? t("collection.action.saved") : undefined}
              >
                {state === "saved" ? <HeartIcon filled={status === "saved"} size={16} /> : t(`collection.action.${state}`)}
              </button>
            ))}
            <button type="button" className="piece-action" onClick={() => sharePiece(object, status)}>
              {t("label.share")}
            </button>
            <button type="button" className="piece-action" onClick={share}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
              </svg>
              {t("piece.shareAction")}
            </button>
          </div>
        </div>
      </div>

      {/* What the page is most useful for, right under the piece: how to buy it. */}
      <WhereToFind object={object} />

      {designerRow.length > 0 && (
        <div className="container piece-section" data-reveal>
          <RelatedRow groups={designerRow} />
        </div>
      )}

      {stories.length > 0 && (
        <section className="container piece-section" data-reveal>
          <h2>{t("piece.inStories")}</h2>
          <div className="piece-stories">
            {stories.slice(0, 3).map((story) => (
              <StoryCard key={story.id} story={story} variant="compact" />
            ))}
          </div>
        </section>
      )}

      {countryRow.length > 0 && (
        <div className="container piece-section" data-reveal>
          <RelatedRow groups={countryRow} />
        </div>
      )}

      {/* Walking through the category, at the end of the page. */}
      {previous && (
        <nav className="container piece-pager" aria-label={t("piece.moreIn", { category: categoryLabel })}>
          <PagerLink object={previous} direction="prev" label={t("piece.previous")} />
          <PagerLink object={next} direction="next" label={t("piece.next")} />
        </nav>
      )}

      {zoom && object.image && <PhotoLightbox objects={[object]} index={0} onClose={() => setZoom(false)} />}
    </article>
  );
}
