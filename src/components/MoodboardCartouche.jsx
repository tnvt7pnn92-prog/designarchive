import { Group, Rect, Line, Text, Image as KImage } from "react-konva";
import { FONTS } from "../lib/moodboard.js";
import { useKonvaImage } from "../lib/moodboardHooks.js";

const MONO = FONTS.mono.family;
const SERIF = FONTS.serif.family;

// The title block in the bottom-right corner of the sheet, as on an architect's presentation
// board: the room's name, then project, date, sheet number and author in a small ruled table.
// Clicking it edits it (the editor opens its fields); it is drawn on the sheet, so it is part of
// every export.
//   titleBlock { title, date, labels: { project, date, sheet, author } }
export default function MoodboardCartouche({ board, cartouche, titleBlock, theme, logo, onEdit }) {
  const logoImage = useKonvaImage(logo ?? null);
  const k = Math.min(board.w, board.h) / 860;
  const width = 330 * k;
  const pad = 10 * k;
  const titleH = 34 * k;
  const rowH = 30 * k;
  const height = titleH + rowH * 2;
  const x = board.w - width - 24 * k;
  const y = board.h - height - 24 * k;
  const col = width / 2;
  // The visitor's logo keeps its proportions, at the height of the title row.
  const logoH = titleH - pad * 1.2;
  const logoW = logoImage ? Math.min(90 * k, (logoH * logoImage.naturalWidth) / logoImage.naturalHeight) + pad : 0;
  const { labels = {} } = titleBlock ?? {};
  const cells = [
    [labels.project, cartouche.project || "—", 0, titleH],
    [labels.date, titleBlock?.date ?? "", col, titleH],
    [labels.sheet, cartouche.number || "01", 0, titleH + rowH],
    [labels.author, cartouche.author || "—", col, titleH + rowH],
  ];
  const editable = Boolean(onEdit);

  return (
    <Group
      x={x}
      y={y}
      name="cartouche"
      onClick={onEdit}
      onTap={onEdit}
      onMouseEnter={(e) => editable && (e.target.getStage().container().style.cursor = "pointer")}
      onMouseLeave={(e) => editable && (e.target.getStage().container().style.cursor = "")}
      listening={editable}
    >
      <Rect width={width} height={height} fill={theme.card} stroke={theme.ink} strokeWidth={1.2 * k} />
      {logoImage && (
        <KImage
          image={logoImage}
          x={pad}
          y={pad * 0.6}
          width={logoW - pad}
          height={logoH}
          listening={false}
        />
      )}
      <Text
        x={pad + logoW}
        y={0}
        width={width - pad * 2 - logoW}
        height={titleH}
        verticalAlign="middle"
        text={titleBlock?.title ?? ""}
        fontFamily={SERIF}
        fontSize={16 * k}
        fill={theme.ink}
        ellipsis
        wrap="none"
        listening={false}
      />
      <Line points={[0, titleH, width, titleH]} stroke={theme.ink} strokeWidth={0.8 * k} listening={false} />
      <Line points={[0, titleH + rowH, width, titleH + rowH]} stroke={theme.ink} strokeWidth={0.6 * k} listening={false} />
      <Line points={[col, titleH, col, height]} stroke={theme.ink} strokeWidth={0.6 * k} listening={false} />
      {cells.map(([label, value, cx, cy]) => (
        <Group key={`${cx}-${cy}`} x={cx + pad} y={cy + 4 * k} listening={false}>
          <Text text={String(label ?? "").toUpperCase()} fontFamily={MONO} fontSize={6.5 * k} letterSpacing={0.8 * k} fill={theme.muted} />
          <Text y={10 * k} width={col - pad * 2} text={value} fontFamily={MONO} fontSize={9.5 * k} fill={theme.ink} ellipsis wrap="none" />
        </Group>
      ))}
    </Group>
  );
}

// "Real proportions": a scale bar in the bottom-left corner, in metres, for the room width the
// pieces were scaled to. The longest of ½, 1, 2 or 5 m that stays a sensible length on the sheet.
export function ScaleBar({ board, roomWidth, theme }) {
  const perMetre = (board.w * 100) / roomWidth;
  const metres = [1, 0.5, 2, 5].find((m) => perMetre * m >= 70 && perMetre * m <= board.w * 0.3) ?? 1;
  const length = perMetre * metres;
  const k = Math.min(board.w, board.h) / 860;
  const x = 28 * k;
  const y = board.h - 40 * k;
  const h = 6 * k;
  return (
    <Group x={x} y={y} listening={false}>
      <Rect width={length / 2} height={h} fill={theme.ink} />
      <Rect x={length / 2} width={length / 2} height={h} stroke={theme.ink} strokeWidth={1 * k} />
      <Text y={h + 5 * k} text="0" fontFamily={MONO} fontSize={8 * k} fill={theme.ink} />
      <Text
        x={length - 40 * k}
        y={h + 5 * k}
        width={40 * k}
        align="right"
        text={metres < 1 ? `${metres * 100} cm` : `${metres} m`}
        fontFamily={MONO}
        fontSize={8 * k}
        fill={theme.ink}
      />
    </Group>
  );
}
