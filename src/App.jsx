import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { LanguageProvider, useLanguage } from "./i18n/LanguageContext.jsx";
import { MoodboardProvider } from "./context/MoodboardContext.jsx";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import PieceOrigin from "./components/PieceOrigin.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Reveals from "./components/Reveals.jsx";
import RouteSkeleton from "./components/RouteSkeleton.jsx";
import Toaster from "./components/Toaster.jsx";
import AccountEvents from "./components/AccountEvents.jsx";
import Overlays from "./components/Overlays.jsx";
import Home from "./pages/Home.jsx";
import { loadMoodboardFonts } from "./lib/fonts.js";
import { ROUTER_BASENAME } from "./lib/site.js";
import { revealApp } from "./lib/handoff.js";

// Every route but the landing page loads on demand: the archive, the markets globe and the Konva
// moodboard are the heavy ones and most visits never open them.
const Archive = lazy(() => import("./pages/Archive.jsx"));
const Markets = lazy(() => import("./pages/Markets.jsx"));
const MarketPlace = lazy(() => import("./pages/MarketPlace.jsx"));
// The moodboard's own fonts start downloading alongside its code, not before anyone asks for it.
const Moodboard = lazy(() => {
  loadMoodboardFonts();
  return import("./pages/Moodboard.jsx");
});
const Stories = lazy(() => import("./pages/Stories.jsx"));
const StoryPage = lazy(() => import("./pages/StoryPage.jsx"));
const Piece = lazy(() => import("./pages/Piece.jsx"));
const Designer = lazy(() => import("./pages/Designer.jsx"));
const Designers = lazy(() => import("./pages/Designers.jsx"));
const Credits = lazy(() => import("./pages/Credits.jsx"));
const Collection = lazy(() => import("./pages/Collection.jsx"));
const Account = lazy(() => import("./pages/Account.jsx"));
const Privacy = lazy(() => import("./pages/Privacy.jsx"));
const SignIn = lazy(() => import("./pages/SignIn.jsx"));
const NewPassword = lazy(() => import("./pages/NewPassword.jsx"));
const SharedBoard = lazy(() => import("./pages/SharedBoard.jsx"));
const MoodboardPrint = lazy(() => {
  loadMoodboardFonts();
  return import("./pages/MoodboardPrint.jsx");
});
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

function SkipLink() {
  const { t } = useLanguage();
  return (
    <a className="skip-link" href="#main">
      {t("a11y.skipToContent")}
    </a>
  );
}

// The room is a full-screen tool: the site's header and footer stay out of it.
function SiteChrome({ children }) {
  const { pathname } = useLocation();
  return pathname === "/moodboard" ? null : children;
}

// Committed together with the page inside the Suspense boundary, so it runs once the page's code
// has arrived and its content is drawn: the moment the prerendered page can step aside.
function PageReady() {
  useEffect(() => revealApp(), []);
  return null;
}

// A page that crashed is retried as soon as the visitor goes somewhere else.
function RouteBoundary({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundary key={pathname}>{children}</ErrorBoundary>;
}

export default function App() {
  return (
    <LanguageProvider>
      <MoodboardProvider>
        <BrowserRouter basename={ROUTER_BASENAME}>
          <ScrollToTop />
          <PieceOrigin />
          <SkipLink />
          <SiteChrome>
            <Header />
          </SiteChrome>
          <main id="main" tabIndex={-1}>
            <RouteBoundary>
            {/* No spinner: the page's outline, and only if the code takes a moment to arrive. */}
            <Suspense fallback={<RouteSkeleton />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/markets" element={<Markets />} />
                <Route path="/markets/:city" element={<Markets />} />
                <Route path="/markets/:city/:id" element={<MarketPlace />} />
                {/* The interactive globe used to live at /map; keep old links working. */}
                <Route path="/map" element={<Navigate to="/markets" replace />} />
                <Route path="/moodboard" element={<Moodboard />} />
                <Route path="/stories" element={<Stories />} />
                <Route path="/stories/:id" element={<StoryPage />} />
                {/* Features that are gone (the daily quiz, photo identification, the plans): old links
                    land on the home page. */}
                <Route path="/quiz/*" element={<Navigate to="/" replace />} />
                <Route path="/identify/*" element={<Navigate to="/" replace />} />
                <Route path="/pricing" element={<Navigate to="/" replace />} />
                <Route path="/piece/:id" element={<Piece />} />
                <Route path="/designers" element={<Designers />} />
                <Route path="/designer/:slug" element={<Designer />} />
                <Route path="/credits" element={<Credits />} />
                <Route path="/collection" element={<Collection />} />
                {/* The three lists the collection replaced: old links land on the right drawer. */}
                <Route path="/saved" element={<Navigate to="/collection?f=saved" replace />} />
                <Route path="/wishlist" element={<Navigate to="/collection?f=want" replace />} />
                <Route path="/account" element={<Account />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/registrati" element={<SignIn mode="signup" />} />
                <Route path="/accedi" element={<SignIn mode="signin" />} />
                <Route path="/nuova-password" element={<NewPassword />} />
                <Route path="/m/:slug" element={<SharedBoard />} />
                <Route path="/moodboard/print" element={<MoodboardPrint />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <PageReady />
            </Suspense>
            </RouteBoundary>
          </main>
          <SiteChrome>
            <Footer />
          </SiteChrome>
          <Toaster />
          <Overlays />
          <AccountEvents />
          <Reveals />
        </BrowserRouter>
      </MoodboardProvider>
    </LanguageProvider>
  );
}
