import { useEffect, useRef, useState } from "react";

const DIGITS = [..."0123456789"];

// A figure on an odometer: each digit is a column that rolls from 0 to its value when the figure
// scrolls into view, the left-hand ones first. Screen readers get the plain number; with reduced
// motion the columns start in place.
export default function Odometer({ value, locale, still }) {
  const node = useRef(null);
  const [rolled, setRolled] = useState(still);
  const text = value.toLocaleString(locale);

  useEffect(() => {
    if (still || rolled) return undefined;
    const el = node.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setRolled(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setRolled(true);
        io.disconnect();
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [still, rolled]);

  let d = 0;
  return (
    <span ref={node} className="home-odo" role="img" aria-label={text}>
      {[...text].map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} className="home-odo__col" aria-hidden="true" style={{ "--d": d++, transform: `translateY(${rolled || still ? -Number(ch) : 0}em)` }}>
            {DIGITS.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </span>
        ) : (
          <span key={i} aria-hidden="true">
            {ch}
          </span>
        )
      )}
    </span>
  );
}
