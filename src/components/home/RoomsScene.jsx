import { useRef } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import SmartImage from "../SmartImage.jsx";
import Slider from "./Slider.jsx";

// The six rooms of the site, in a row the visitor slides sideways: the photos shift inside their
// frames as they move, a line of outlined names drifts behind at a third of the speed and a gold
// bar shows how far along the row is.
export default function RoomsScene({ rooms, still }) {
  const { t } = useLanguage();
  const section = useRef(null);

  function follow(track) {
    const el = section.current;
    if (!el) return;
    const max = track.scrollWidth - track.clientWidth;
    const p = max > 0 ? track.scrollLeft / max : 0;
    el.querySelector(".home-progress").style.setProperty("--p", p.toFixed(4));
    if (still) return;
    el.querySelector(".home-rooms__ghost").style.transform = `translate3d(${-track.scrollLeft * 0.35}px, 0, 0)`;
    const box = track.getBoundingClientRect();
    for (const room of track.children) {
      const r = room.getBoundingClientRect();
      room.style.setProperty("--px", `${((r.left + r.width / 2 - box.left) / box.width - 0.5) * -40}px`);
    }
  }

  return (
    <section ref={section} className="home-rooms" aria-labelledby="home-rooms-title">
      <div className="home-rooms__ghost" aria-hidden="true">
        {rooms.map((room) => room.title).join(" · ")}
      </div>
      <Slider
        label={t("home.roomsEyebrow")}
        onMove={follow}
        trackClassName="home-rooms__track"
        head={
          <>
            <p className="home-eyebrow">{t("home.roomsEyebrow")}</p>
            <h2 id="home-rooms-title">
              {t("home.roomsTitle")} <em>{t("home.roomsTitleEm")}</em>
            </h2>
          </>
        }
      >
        {rooms.map((room, i) => (
          <Link key={room.to} to={room.to} className="home-room" draggable={false}>
            <SmartImage src={room.photo.image} sizes="(max-width: 560px) 78vw, 400px" className="home-room__photo" draggable={false} />
            <span className="home-room__n" aria-hidden="true">
              {String(i + 1).padStart(2, "0")} / {String(rooms.length).padStart(2, "0")}
            </span>
            <span className="home-room__glass">
              <span className="home-room__figure">{room.figure}</span>
              <span className="home-room__title">
                {room.title}
                <span className="home-arrow" aria-hidden="true">
                  →
                </span>
              </span>
              <span className="home-room__text">{room.text}</span>
            </span>
          </Link>
        ))}
      </Slider>
      <div className="home-progress" aria-hidden="true">
        <i />
      </div>
    </section>
  );
}
