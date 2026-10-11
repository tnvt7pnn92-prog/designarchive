import { lazy, Suspense } from "react";
import { useAuthDialog } from "../lib/authDialog.js";
import { useWelcome } from "../lib/welcome.js";

// The sign-in dialog and the welcome are rarely opened: their code loads the first time.
const AuthDialog = lazy(() => import("./AuthDialog.jsx"));
const WelcomeDialog = lazy(() => import("./WelcomeDialog.jsx"));

export default function Overlays() {
  const auth = useAuthDialog();
  const welcome = useWelcome();
  return (
    <Suspense fallback={null}>
      {auth.open && <AuthDialog />}
      {welcome && !auth.open && <WelcomeDialog />}
    </Suspense>
  );
}
