// Пиксельные знаки SouCampus — сетка символов → SVG из прямоугольников.
// Вектор, а не картинка: при любом масштабе края блоков чёткие
// (shape-rendering: crispEdges), и цвет каждой клетки можно менять на лету —
// так заливается веер в «How an order works».
//
// Сетки: цветок — public/brand/pixel/flower-stamps.json (рисовал владелец),
// веер по частям — src/lib/fan-pixels.json (scripts/flower-shape.mjs
// размечает пиксельный веер владельца на солнце и 12 лепестков).
import flowerStamps from "../../../public/brand/pixel/flower-stamps.json";
import fanPixels from "@/lib/fan-pixels.json";

type Props = {
  rows: string[];
  /** Цвет клетки по её символу; null — клетку не рисовать. */
  color: (cell: string, x: number, y: number) => string | null;
  className?: string;
  style?: React.CSSProperties;
};

/** Сетка → SVG. Соседние клетки одного цвета в строке сливаются в одну полосу. */
export function PixelGrid({ rows, color, className, style }: Props) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const rects: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const fill = color(row[x], x, y);
      let end = x + 1;
      while (end < row.length && color(row[end], end, y) === fill) end++;
      if (fill) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={end - x} height={1} fill={fill} />);
      x = end;
    }
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden="true" className={className} style={style}>
      {rects}
    </svg>
  );
}

type FlowerPalette = keyof typeof flowerStamps.palettes;

/** Пиксельный цветок-знак. */
export function PixelFlower({
  palette = "orange",
  stamp = "flower32",
  className,
  style,
}: {
  palette?: FlowerPalette;
  stamp?: keyof typeof flowerStamps.stamps;
  className?: string;
  style?: React.CSSProperties;
}) {
  const colors = flowerStamps.palettes[palette] as Record<string, string>;
  return (
    <PixelGrid
      rows={flowerStamps.stamps[stamp].rows}
      color={(c) => colors[c] ?? null}
      className={className}
      style={style}
    />
  );
}

export type FanColors = {
  /** Заливка залитой части и её окантовка. */
  fill: string;
  fillEdge: string;
  /** Заливка пустой части и её окантовка. */
  empty: string;
  emptyEdge: string;
  /** Солнце залитое (у знака оно светлее лепестков). */
  sun: string;
  sunEdge: string;
};

/** Какой части веера какой шаг: солнце — шаг 1, лепестки по три — шаги 2–5. */
export function fanPartStep(cell: string) {
  if (cell === "S") return 1;
  return 2 + Math.floor((cell.charCodeAt(0) - 97) / 3);
}

/**
 * Пиксельный веер, залитый до шага `step` (0 — пустой, 5 — целый).
 * Окантовка — клетки на краю своей части: так каждый лепесток читается
 * отдельно, даже пустой.
 */
export function PixelFan({
  step,
  colors,
  className,
}: {
  step: number;
  colors: FanColors;
  className?: string;
}) {
  const rows = fanPixels.rows;
  const edge = (x: number, y: number) => {
    const c = rows[y][x];
    return [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([dx, dy]) => rows[y + dy]?.[x + dx] !== c);
  };
  return (
    <PixelGrid
      rows={rows}
      className={className}
      color={(c, x, y) => {
        if (c === ".") return null;
        const on = fanPartStep(c) <= step;
        const isEdge = edge(x, y);
        if (c === "S") return on ? (isEdge ? colors.sunEdge : colors.sun) : isEdge ? colors.emptyEdge : colors.empty;
        return on ? (isEdge ? colors.fillEdge : colors.fill) : isEdge ? colors.emptyEdge : colors.empty;
      }}
    />
  );
}
