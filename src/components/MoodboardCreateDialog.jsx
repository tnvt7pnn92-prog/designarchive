import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { MATERIAL_FAMILIES } from "../data/materials.js";
import { hexToRgb, normalizeHex } from "../data/moodboardColors.js";
import { splitTags } from "../lib/moodboardPresets.js";
import { addCustomColor, addCustomMaterial, readImageFile } from "../lib/moodboardLibrary.js";
import "./MoodboardCreateDialog.css";

// "Create material" / "Create colour": saves a new entry to the user's personal library.
// The left side previews the result exactly as the library card will show it.
export default function MoodboardCreateDialog({ mode, onClose }) {
  const { t } = useLanguage();
  const isMaterial = mode === "material";
  const firstRef = useRef(null);
  const fileRef = useRef(null);
  const [name, setName] = useState("");
  const [family, setFamily] = useState(MATERIAL_FAMILIES[0]);
  const [tags, setTags] = useState("");
  const [image, setImage] = useState(null);
  const [hex, setHex] = useState("#641F2A");
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    firstRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function pickFile(file) {
    setError(null);
    try {
      setImage(await readImageFile(file, { maxSize: 640, square: true }));
    } catch {
      setError("imageError");
    }
  }

  const validHex = normalizeHex(hex);
  const tagList = splitTags(tags);
  const canSave = Boolean(name.trim()) && (isMaterial ? Boolean(image) : Boolean(validHex));
  const previewName =
    name.trim() || (isMaterial ? t("moodboard.dialog.namePlaceholder") : t("moodboard.dialog.colorNamePlaceholder"));
  const previewMeta = isMaterial
    ? [t(`moodboard.families.${family}`), ...tagList.slice(0, 2)].join(" · ")
    : validHex
      ? `${validHex} · RGB ${hexToRgb(validHex).join(" ")}`
      : "—";

  function save(e) {
    e.preventDefault();
    if (!canSave) return;
    const saved = isMaterial
      ? addCustomMaterial({ name: name.trim(), family, tags: tagList, src: image.src })
      : addCustomColor({ name: name.trim(), hex: validHex });
    if (saved) onClose();
    else setError("storageFull");
  }

  return createPortal(
    <div className="mb-dialog" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className={`mb-dialog__panel is-${mode}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mb-dialog-title"
        onSubmit={save}
      >
        <div className="mb-dialog__visual">
          {isMaterial ? (
            <div
              className={`mb-dialog__drop${dragOver ? " is-over" : ""}${image ? " has-image" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) pickFile(file);
              }}
            >
              {image && <img src={image.src} alt="" />}
              <button ref={firstRef} type="button" className="mb-dialog__upload" onClick={() => fileRef.current?.click()}>
                {image ? t("moodboard.dialog.replace") : t("moodboard.dialog.upload")}
              </button>
              {!image && <span className="mb-dialog__drop-hint">{t("moodboard.dialog.uploadHint")}</span>}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) pickFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          ) : (
            <label className="mb-dialog__swatch" style={{ background: validHex ?? "transparent" }}>
              <input
                type="color"
                value={(validHex ?? "#000000").toLowerCase()}
                onChange={(e) => setHex(e.target.value.toUpperCase())}
                aria-label={t("moodboard.customColor")}
              />
            </label>
          )}
          <div className="mb-dialog__caption">
            <strong>{previewName}</strong>
            <span>{previewMeta}</span>
          </div>
        </div>

        <div className="mb-dialog__form">
          <span className="eyebrow">{t("moodboard.dialog.library")}</span>
          <h2 id="mb-dialog-title">{isMaterial ? t("moodboard.dialog.materialTitle") : t("moodboard.dialog.colorTitle")}</h2>
          <p className="mb-dialog__intro">{isMaterial ? t("moodboard.dialog.materialIntro") : t("moodboard.dialog.colorIntro")}</p>

          <label className="mb-dialog__field">
            <span>{t("moodboard.name")}</span>
            <input
              ref={isMaterial ? undefined : firstRef}
              value={name}
              maxLength={40}
              placeholder={isMaterial ? t("moodboard.dialog.namePlaceholder") : t("moodboard.dialog.colorNamePlaceholder")}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          {isMaterial ? (
            <>
              <label className="mb-dialog__field">
                <span>{t("moodboard.dialog.category")}</span>
                <select value={family} onChange={(e) => setFamily(e.target.value)}>
                  {MATERIAL_FAMILIES.map((f) => (
                    <option key={f} value={f}>
                      {t(`moodboard.families.${f}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mb-dialog__field">
                <span>{t("moodboard.tags")}</span>
                <input value={tags} placeholder={t("moodboard.dialog.tagsPlaceholder")} onChange={(e) => setTags(e.target.value)} />
                <small>{t("moodboard.dialog.tagsHint")}</small>
              </label>
            </>
          ) : (
            <label className="mb-dialog__field">
              <span>{t("moodboard.hex")}</span>
              <input
                className="is-mono"
                value={hex}
                spellCheck={false}
                aria-invalid={!validHex}
                onChange={(e) => setHex(e.target.value)}
              />
              {!validHex && <small className="is-error">{t("moodboard.dialog.invalidHex")}</small>}
            </label>
          )}

          {error && (
            <p className="mb-dialog__error" role="alert">
              {t(`moodboard.dialog.${error}`)}
            </p>
          )}

          <div className="mb-dialog__actions">
            <button type="button" className="mb-dialog__cancel" onClick={onClose}>
              {t("moodboard.dialog.cancel")}
            </button>
            <button type="submit" className="btn" disabled={!canSave}>
              {t("moodboard.dialog.save")}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
}
