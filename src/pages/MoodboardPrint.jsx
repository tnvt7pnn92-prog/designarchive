import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { objectsByIds } from "../data/indexes.js";
import { OBJECT_PHOTOS, photoPage, photoSource } from "../data/objectPhotos.js";
import { activeBoard, useMoodboards } from "../lib/moodboards.js";
import { loadFullGuide } from "../lib/guide.js";
import { readImageFile } from "../lib/moodboardLibrary.js";
import { getPrintSheet, readLogo, writeLogo } from "../lib/printSheet.js";
import { formatDay, useToday } from "../lib/today.js";
import { siteTitle } from "../lib/seo.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import "./MoodboardPrint.css";

// The moodboard laid out on A4 landscape sheets, to print or save as PDF from the browser's print
// dialog. The first page is the board with its title block and scale (with the visitor's logo, if
// they add one), then a page listing the pieces as labels with their measurements, then the photo
// credits.
export default function MoodboardPrint() {
  const { t, lang } = useLanguage();
  const { today } = useToday();
  useDocumentMeta({ title: siteTitle(t("boards.printTitle")) });
  useMoodboards();
  const sheet = getPrintSheet();
  const board = activeBoard();
  const [logo, setLogo] = useState(() => readLogo());
  const [guides, setGuides] = useState({});

  const pieceIds = [...new Set(board.elements.filter((el) => el.type === "photo").map((el) => el.objectId))];
  const pieces = objectsByIds(pieceIds);

  const idsKey = pieceIds.join(",");
  useEffect(() => {
    let alive = true;
    if (!idsKey) return undefined;
    Promise.all(idsKey.split(",").map((id) => loadFullGuide(id).then((guide) => [id, guide]))).then((entries) => {
      if (alive) setGuides(Object.fromEntries(entries.filter(([, guide]) => guide)));
    });
    return () => {
      alive = false;
    };
  }, [idsKey]);

  if (!sheet || sheet.boardId !== board.id) return <Navigate to="/moodboard" replace />;

  async function uploadLogo(file) {
    try {
      const { src } = await readImageFile(file, { maxSize: 600 });
      if (writeLogo(src)) setLogo(src);
    } catch {
      /* not an image */
    }
  }

  const title = board.title || t("boards.untitled", { n: 1 });

  return (
    <div className="print-page">
      <div className="print-toolbar container">
        <Link to="/moodboard" className="print-back">
          ← {t("nav.moodboard")}
        </Link>
        <p>{t("boards.printHint")}</p>
        <label className="print-logo">
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
          {logo ? t("boards.changeLogo") : t("boards.addLogo")}
        </label>
        {logo && (
          <button
            type="button"
            className="print-back"
            onClick={() => {
              writeLogo(null);
              setLogo(null);
            }}
          >
            {t("boards.removeLogo")}
          </button>
        )}
        <button type="button" className="print-go" onClick={() => window.print()}>
          {t("boards.printNow")}
        </button>
      </div>

      {/* The board's own title block carries its name, date and logo. */}
      <section className="print-sheet">
        <img src={sheet.image} alt={title} className="print-sheet__board" />
        <footer className="print-sheet__foot">{t("boards.printFooter", { count: pieces.length })}</footer>
      </section>

      {pieces.length > 0 && (
        <section className="print-sheet print-sheet--list">
          <header className="print-sheet__head">
            {logo ? <img src={logo} alt="" className="print-sheet__logo" /> : <span className="print-sheet__brand">Design Archive</span>}
            <div>
              <h1>{t("boards.piecesList")}</h1>
              <p>
                {title} · {formatDay(today, lang)}
              </p>
            </div>
          </header>
          <ol className="print-labels">
            {pieces.map((object) => {
              const dims = guides[object.id]?.dimensions;
              return (
                <li key={object.id} className="print-label">
                  <p className="print-label__line">
                    <span>{object.country}</span>
                  </p>
                  <p className="print-label__name">{object.name}</p>
                  <p className="print-label__by">
                    {object.designer}, {object.year}
                  </p>
                  <dl>
                    <dt>{t("piece.brand")}</dt>
                    <dd>{object.brand}</dd>
                    {object.materials?.length > 0 && (
                      <>
                        <dt>{t("piece.materials")}</dt>
                        <dd>{object.materials.join(", ")}</dd>
                      </>
                    )}
                    {dims && (
                      <>
                        <dt>{t("guide.dimensions")}</dt>
                        <dd>
                          {["width", "depth", "height", "seatHeight"]
                            .filter((key) => dims[key])
                            .map((key) => `${t(`guide.dims.${key}`)} ${dims[key]} ${dims.unit ?? "cm"}`)
                            .join(" · ")}
                        </dd>
                      </>
                    )}
                  </dl>
                </li>
              );
            })}
          </ol>
        </section>
      )}
      <section className="print-sheet print-sheet--credits">
        <h2>{t("boards.credits")}</h2>
        <ol>
          {pieces.map((object) => {
            const photo = OBJECT_PHOTOS[object.id];
            if (!photo) return null;
            return (
              <li key={object.id}>
                <strong>{object.name}</strong> — {photo.author ? `${photo.author}, ` : ""}
                {photo.license}, {photoSource(photo)}
                {photoPage(photo) && <span className="print-url"> ({photoPage(photo)})</span>}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
