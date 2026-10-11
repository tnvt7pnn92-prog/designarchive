import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import "./StoriesList.css";

export default function StoriesList({ stories, expandable = true }) {
  const { t } = useLanguage();
  const [openId, setOpenId] = useState(null);

  return (
    <ul className="stories-list">
      {stories.map((story) => {
        const isOpen = openId === story.id;
        return (
          <li key={story.id} className="stories-list__item">
            <button
              type="button"
              className="stories-list__trigger"
              onClick={() => expandable && setOpenId(isOpen ? null : story.id)}
            >
              <span className="stories-list__meta">
                <span className="eyebrow">{story.category}</span>
                <span className="stories-list__time">{story.readTime} {t("stories.readTime")}</span>
              </span>
              <h4>{story.title}</h4>
              <p className="stories-list__excerpt">{story.excerpt}</p>
            </button>
            {expandable && isOpen && <p className="stories-list__body">{story.body}</p>}
          </li>
        );
      })}
    </ul>
  );
}
