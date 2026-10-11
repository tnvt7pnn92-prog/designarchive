import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useMoodboard } from "../context/MoodboardContext.jsx";
import { collectionStore, removeFromCollection, setStatus } from "./collection.js";
import { nudge } from "./nudges.js";
import { showToast } from "./toast.js";

// Adds a piece to the room or takes it out, and says so in a toast with a way to go and look.
export function useRoomToggle() {
  const { t } = useLanguage();
  const { isInMoodboard, toggleItem } = useMoodboard();
  return (object) => {
    const wasAdded = isInMoodboard(object.id);
    toggleItem(object);
    showToast(
      wasAdded
        ? { message: t("toast.removed", { name: object.name }) }
        : { message: t("toast.added", { name: object.name }), action: { label: t("toast.openRoom"), to: "/moodboard" } }
    );
  };
}

// The collection: gives a piece a state ("saved", "I own it", "Looking for", "Seen"), changes it,
// or — asked for the state it already has — takes the piece out, each time with a toast and a
// way to go and look. The third piece invites a guest to keep the collection in an account.
export function useCollectionAction() {
  const { t } = useLanguage();
  return (object, status) => {
    const current = collectionStore.get().find((item) => item.id === object.id)?.status ?? null;
    if (status === null || status === current) {
      if (current === null) return;
      removeFromCollection(object.id);
      showToast({ message: t("collection.toastRemoved", { name: object.name }) });
      return;
    }
    setStatus(object.id, status);
    showToast({
      message: t("collection.toastAdded", { name: object.name, status: t(`collection.status.${status}`) }),
      action: { label: t("collection.toastOpen"), to: `/collection?f=${status}` },
    });
    if (current === null && collectionStore.get().length === 3) setTimeout(() => nudge("favourites"), 1200);
  };
}
