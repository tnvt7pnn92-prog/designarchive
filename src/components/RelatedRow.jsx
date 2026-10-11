import { Link } from "react-router-dom";
import ObjectCard from "./ObjectCard.jsx";
import "./RelatedRow.css";

// A full row of related pieces, in labelled groups (see lib/related.js). On wide screens the
// groups share one row of four columns; on phones the row slides sideways, card by card.
export default function RelatedRow({ groups, className = "" }) {
  if (!groups.length) return null;
  return (
    <div className={`related-row ${className}`}>
      {groups.map((group) => (
        <section key={group.key} className="related-group" style={{ "--n": group.items.length }} aria-label={group.title}>
          <h2 className="related-group__title">{group.title}</h2>
          <div className="related-group__cards">
            {group.items.map((object) => (
              <ObjectCard key={object.id} object={object} />
            ))}
          </div>
          {group.more && (
            <Link className="related-group__more" to={group.more.to}>
              {group.more.label} →
            </Link>
          )}
        </section>
      ))}
    </div>
  );
}
