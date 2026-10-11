import "./ErrorBoundary.css";

const CARDS = 8;

// Suspense fallback while a page's code downloads: the shape of a page, not a spinner.
export default function RouteSkeleton() {
  return (
    <div className="route-skeleton container" aria-hidden="true">
      <span className="route-skeleton__line" />
      <span className="route-skeleton__line is-title" />
      <div className="route-skeleton__grid">
        {Array.from({ length: CARDS }, (_, i) => (
          <span key={i} className="route-skeleton__card" />
        ))}
      </div>
    </div>
  );
}
