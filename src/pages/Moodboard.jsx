import { seoForRoute } from "../lib/seo.js";
import { useDocumentMeta } from "../lib/useDocumentMeta.js";
import MoodboardEditor from "../components/MoodboardEditor.jsx";
import "./Moodboard.css";

// The room is a full-screen tool: no site header or footer (App leaves them out on this route),
// only the editor's own thin bar with the way back.
export default function Moodboard() {
  useDocumentMeta(seoForRoute("/moodboard"));
  return (
    <div className="moodboard-page">
      <MoodboardEditor />
    </div>
  );
}
