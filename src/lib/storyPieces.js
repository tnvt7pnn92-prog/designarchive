import { STORY_COVERS } from "../data/storyCovers.js";

// The archive pieces a story names (its `related` list, chosen by hand), with their photo: what the
// stories page pins on a cover and lists under "In this story". Pieces without a photo are left out.
export function storyPieces(story) {
  return (story?.related ?? []).map((id) => (STORY_COVERS[id] ? { id, ...STORY_COVERS[id] } : null)).filter((piece) => piece?.image);
}
