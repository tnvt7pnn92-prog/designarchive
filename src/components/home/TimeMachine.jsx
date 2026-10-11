import { useRef } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { lerp } from "../../lib/frameLoop.js";
import SmartImage from "../SmartImage.jsx";
import MaterialField from "../MaterialField.jsx";
import Label from "../Label.jsx";
import Slider from "./Slider.jsx";

// The time machine: a film of pieces in the order of their year, slid sideways by the visitor.
// The piece in the middle comes forward with its label, a huge outlined year follows behind it and
// a gold needle moves along a ruler of decades; a decade on the ruler jumps straight to it.
export default function TimeMachine({ pieces, still }) {
  const { t } = useLanguage();
  const section = useRef(null);
  const near = useRef(-1);
  const years = pieces.map((p) => p.year);
  const from = Math.floor(years[0] / 10) * 10;
  const to = Math.ceil(years.at(-1) / 10) * 10;
  const ticks = [];
  for (let y = from; y <= to; y += 2) ticks.push(y);
  const at = (y) => `${((y - from) / (to - from)) * 100}%`;

  function follow(track) {
    const el = section.current;
    if (!el) return;
    const frames = [...track.children];
    const middle = track.scrollLeft + track.clientWidth / 2;
    const centres = frames.map((f) => f.offsetLeft + f.offsetWidth / 2);
    // Where the middle of the row falls between two pieces, as a fraction.
    let i0 = 0;
    while (i0 < frames.length - 2 && centres[i0 + 1] <= middle) i0++;
    const i1 = Math.min(frames.length - 1, i0 + 1);
    const f = i1 === i0 ? 0 : Math.min(1, Math.max(0, (middle - centres[i0]) / (centres[i1] - centres[i0])));
    const year = Math.round(lerp(years[i0], years[i1], f));
    el.querySelector(".home-time__year").textContent = year;
    el.querySelector(".home-time__needle").style.left = at(year);
    const nearest = f < 0.5 ? i0 : i1;
    if (nearest !== near.current) {
      near.current = nearest;
      frames.forEach((frame, i) => frame.classList.toggle("is-near", i === nearest));
    }
  }

  // The first piece of a decade, brought to the middle.
  function jump(decade) {
    const track = section.current?.querySelector(".home-slider__track");
    const i = years.findIndex((y) => y >= decade);
    const frame = track?.children[i < 0 ? years.length - 1 : i];
    if (!frame) return;
    track.scrollTo({ left: frame.offsetLeft + frame.offsetWidth / 2 - track.clientWidth / 2, behavior: still ? "auto" : "smooth" });
  }

  return (
    <section ref={section} className="home-time" aria-labelledby="home-time-title">
      <div className="home-time__year" aria-hidden="true">
        {years[0]}
      </div>
      <Slider
        label={t("home.timeEyebrow")}
        onMove={follow}
        trackClassName="home-time__film"
        head={
          <>
            <p className="home-eyebrow">{t("home.timeEyebrow")}</p>
            <h2 id="home-time-title">
              {t("home.timeTitle", { from: years[0], to: years.at(-1) })} <em>{t("home.timeTitleEm")}</em>
            </h2>
          </>
        }
      >
        {pieces.map((piece, i) => (
          <Link key={piece.id} to={`/piece/${piece.id}`} className={`home-frame${i === 0 ? " is-near" : ""}`} draggable={false}>
            <SmartImage src={piece.image} card cutout={piece.cutout} category={piece.category} className="home-frame__photo" draggable={false} fallback={<MaterialField object={piece} />} />
            <Label className="home-frame__label" status={piece.country} nameAs="p" name={piece.name} by={`${piece.designer}, ${piece.year}`} />
          </Link>
        ))}
      </Slider>
      <div className="home-time__ruler">
        {ticks.map((y) => (
          <i key={y} aria-hidden="true" style={{ left: at(y), height: y % 10 ? 10 : 22 }} />
        ))}
        {ticks
          .filter((y) => y % 10 === 0 && y < to)
          .map((y) => (
            <button key={y} type="button" style={{ left: at(y) }} onClick={() => jump(y)}>
              {y}
            </button>
          ))}
        <span className="home-time__needle" aria-hidden="true" />
      </div>
    </section>
  );
}
