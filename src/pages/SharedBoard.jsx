import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { objectById, objectsByIds } from "../data/indexes.js";
import { boardSize } from "../lib/moodboard.js";
import { loadSharedBoard } from "../lib/share.js";
import { formatDay } from "../lib/today.js";
import { siteTitle } from "../lib/seo.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import Label from "../components/Label.jsx";
import "./SharedBoard.css";

// A piece's card on the board is about 1.7 times as tall as it is wide (photo and label).
const CARD_RATIO = 1.7;

// A moodboard shared by link: read-only — the board on the dark table with its title block, every
// archive piece on it opening its page (from its place on the picture, and from the labels below).
export default function SharedBoard() {
  const { slug } = useParams();
  const { t, lang } = useLanguage();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let alive = true;
    loadSharedBoard(slug).then((result) => alive && setState({ loading: false, ...result }));
    return () => {
      alive = false;
    };
  }, [slug]);

  const board = state.board;
  useDocumentMeta({ title: siteTitle(board?.title || t("boards.sharedTitle")) });
  const pieces = board ? objectsByIds(board.pieces ?? []) : [];
  const size = boardSize(board?.format);
  const hotspots = (board?.labels ?? []).filter((label) => objectById(label.objectId) && Number.isFinite(label.x));

  if (state.loading) return <p className="shared-board__note container">{t("boards.loading")}</p>;

  if (!board) {
    return (
      <div className="shared-board__missing container">
        <h1>{t("boards.sharedMissing")}</h1>
        <p>{t("boards.sharedMissingText")}</p>
        <Link to="/moodboard" className="btn">
          {t("boards.makeYours")} <span className="btn-arrow">→</span>
        </Link>
      </div>
    );
  }

  const title = board.title || t("boards.untitled", { n: 1 });

  return (
    <div className="shared-board">
      <header className="container shared-board__head">
        <p className="shared-board__line">
          <span>{t("boards.sharedTitle")}</span>
          <span>{t("boards.sharedUpdated", { date: formatDay(board.updated_at.slice(0, 10), lang) })}</span>
        </p>
        <h1>{title}</h1>
      </header>

      <div className="shared-board__table">
        <div className="shared-board__sheet" style={{ aspectRatio: `${size.w} / ${size.h}`, "--sheet-ratio": size.w / size.h }}>
          <img src={board.previewUrl} alt={title} />
          {hotspots.map((label, i) => {
            const object = objectById(label.objectId);
            return (
              <Link
                key={`${label.objectId}-${i}`}
                to={`/piece/${object.id}`}
                className="shared-board__spot"
                style={{
                  left: `${(label.x / size.w) * 100}%`,
                  top: `${(label.y / size.h) * 100}%`,
                  width: `${(label.width / size.w) * 100}%`,
                  height: `${((label.width * CARD_RATIO) / size.h) * 100}%`,
                }}
                aria-label={`${object.name} — ${object.designer}, ${object.year}`}
              />
            );
          })}
        </div>
      </div>

      {pieces.length > 0 && (
        <section className="container shared-board__pieces" aria-labelledby="shared-pieces">
          <h2 id="shared-pieces">{t("boards.onThisBoard")}</h2>
          <ul>
            {pieces.map((object) => (
              <li key={object.id}>
                <Label
                  className="shared-board__label"
                  status={object.country}
                  name={<Link to={`/piece/${object.id}`}>{object.name}</Link>}
                  by={`${object.designer}, ${object.year}`}
                  rows={[{ label: t("piece.brand"), value: object.brand }]}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="container shared-board__cta">
        <Link to="/moodboard" className="btn btn--ghost">
          {t("boards.makeYours")} <span className="btn-arrow">→</span>
        </Link>
      </p>
    </div>
  );
}
