import { useLanguage } from "../i18n/LanguageContext.jsx";
import { showToast } from "./toast.js";

const material = (object) => object.materialTags?.[0] ?? "paper";

// "Share the label": a picture of a piece's label over its photo — or of the whole collection as
// a wall of labels — handed to the share sheet or saved as a file. The drawing code loads only
// when someone asks for a picture.
export function useShareLabel() {
  const { t } = useLanguage();

  async function run(make, filename, text) {
    showToast({ message: t("label.sharing") });
    try {
      const { shareImage, ...draw } = await import("./shareLabel.js");
      const outcome = await shareImage(await make(draw), filename, text);
      if (outcome === "saved") showToast({ message: t("label.shareSaved") });
    } catch {
      showToast({ message: t("label.shareFailed") });
    }
  }

  const labelOf = (object, status) => ({
    status: object.country,
    name: object.name,
    by: `${object.designer}, ${object.year}`,
    stamp: status && status !== "saved" ? { status, text: t(`collection.status.${status}`) } : null,
  });

  return {
    sharePiece(object, status = null) {
      const label = {
        ...labelOf(object, status),
        rows: [
          { label: t("piece.brand"), value: object.brand },
          { label: t("piece.materials"), value: (object.materials ?? []).slice(0, 3).join(", ") },
        ],
      };
      return run(
        ({ pieceLabelImage }) => pieceLabelImage({ label, image: object.image, material: material(object), tagline: t("home.title1") }),
        `${object.id}-design-archive.png`,
        `${object.name} — ${object.designer}, ${object.year}`
      );
    },
    // A story's cover and title; `piece` is the cover's piece (data/storyCovers.js), if it has one.
    shareStory(story, piece = null) {
      const cover = piece
        ? { piece: { label: { status: piece.country, name: piece.name, by: `${piece.designer}, ${piece.year}` }, image: piece.image, material: piece.materialTags?.[0] ?? "paper" } }
        : { mark: story.cover?.mark ?? "", tone: story.cover?.tone ?? "ink" };
      const kicker = `${t(`stories.categories.${story.category}`)} · ${t("stories.minutes", { n: story.readTime })}`;
      return run(
        ({ storyCoverImage }) => storyCoverImage({ cover, kicker, title: story.title, tagline: t("stories.oneADay") }),
        `${story.id}-design-archive.png`,
        story.title
      );
    },
    shareWall(rows, summary) {
      const labels = rows.map(({ item, object }) => labelOf(object, item.status));
      return run(
        ({ collectionWallImage }) => collectionWallImage({ labels, title: t("nav.collection"), summary, tagline: t("home.title1") }),
        "collection-design-archive.png",
        t("nav.collection")
      );
    },
  };
}
