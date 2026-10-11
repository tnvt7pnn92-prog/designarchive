import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { rememberOrigin } from "../lib/pieceOrigin.js";

// Notes every page that is not a piece, so a piece page knows where "close" goes back to.
export default function PieceOrigin() {
  const { pathname, key } = useLocation();
  useEffect(() => rememberOrigin(pathname), [pathname, key]);
  return null;
}
