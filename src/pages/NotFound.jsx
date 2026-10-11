import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import { siteTitle } from "../lib/seo.js";
import { ICONIC } from "../data/homeData.js";
import SmartImage from "../components/SmartImage.jsx";
import "./NotFound.css";

// The iconic pieces are well known and well photographed, and small enough to ship with the
// home: a good place to find something to show instead of nothing.
const PIECE_IDS = Object.keys(ICONIC);
const randomId = (except) => {
  let id;
  do id = PIECE_IDS[Math.floor(Math.random() * PIECE_IDS.length)];
  while (id === except && PIECE_IDS.length > 1);
  return id;
};

export default function NotFound() {
  const { t } = useLanguage();
  useDocumentMeta({ title: siteTitle(t("notFound.title")) });
  const [pieceId, setPieceId] = useState(() => randomId());
  const piece = ICONIC[pieceId];

  return (
    <div className="notfound container">
      <div className="notfound__text">
        <span className="notfound__code" aria-hidden="true">
          404
        </span>
        <h1>{t("notFound.title")}</h1>
        <p>{t("notFound.text")}</p>
        <div className="notfound__links">
          <Link to="/archive">{t("notFound.archive")}</Link>
          <Link to="/">{t("notFound.home")}</Link>
        </div>
      </div>

      <figure className="notfound__piece">
        <span className="eyebrow">{t("notFound.instead")}</span>
        <Link to={`/piece/${pieceId}`} className="notfound__photo">
          <SmartImage src={piece.image} cutout={piece.cutout} card alt={piece.name} ratio="4 / 5" />
        </Link>
        <figcaption>
          <Link to={`/piece/${pieceId}`}>
            <strong>{piece.name}</strong>
          </Link>
          <button type="button" onClick={() => setPieceId(randomId(pieceId))}>
            {t("notFound.another")} ↻
          </button>
        </figcaption>
      </figure>
    </div>
  );
}
