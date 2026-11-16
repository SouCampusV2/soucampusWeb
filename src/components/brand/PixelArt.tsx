// Пиксельные знаки SouCampus — сетка символов → SVG.
// Вектор, а не картинка: при любом масштабе края блоков чёткие, и цвет
// каждой части можно менять на лету — так заливается веер в «How an
// order works».
//
// ⚠️ Клетки одной части рисуются ОДНИМ контуром (path), а не отдельными
// прямоугольниками. С прямоугольниками при увеличении (цветок на /about
// растёт в 2–3 раза) край каждого попадал между пикселями экрана, браузер
// сглаживал его отдельно, и на стыках соседей светились щели-линии
// (замечание владельца 16.11). Внутри одного контура общих краёв нет.
//
// Цвет идёт в style, а не в атрибут fill: так работают CSS-переменные —
// веер белый→чёрный в светлой теме и чёрный→белый в тёмной.
//
// Сетки: цветок — public/brand/pixel/flower-stamps.json (рисовал владелец),
// веер по частям — src/lib/fan-pixels.json (scripts/flower-shape.mjs
// размечает пиксельный веер владельца на солнце и 12 лепестков).
import flowerStamps from "../../../public/brand/pixel/flower-stamps.json";
import fanPixels from "@/lib/fan-pixels.json";

type Props = {
  rows: string[];
  /** Цвет части по её символу; null — не рисовать. */
  color: (cell: string) => string | null;
  /** Тень блока: копия силуэта этим цветом, сдвинутая на клетку вниз и вправо. */
  shadow?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Класс каждой части — например, переход заливки. */
  partClassName?: string;
};

/** Контур из полос по строкам: «M x y h w v 1 h -w z» на каждую полосу. */
function outline(rows: string[], keep: (cell: string) => boolean) {
  let d = "";
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!keep(row[x])) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < row.length && keep(row[end])) end++;
      d += `M${x} ${y}h${end - x}v1h${x - end}z`;
      x = end;
    }
  });
  return d;
}

export function PixelGrid({ rows, color, shadow, className, style, partClassName }: Props) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const cells = [...new Set(rows.join("").split(""))].filter((c) => c !== ".");
  const pad = shadow ? 1 : 0;
  return (
    <svg viewBox={`0 0 ${w + pad} ${h + pad}`} aria-hidden="true" className={className} style={style}>
      {shadow && (
        <path d={outline(rows, (c) => c !== ".")} transform="translate(1 1)" style={{ fill: shadow }} />
      )}
      {cells.map((cell) => {
        const fill = color(cell);
        if (!fill) return null;
        // Тонкая обводка тем же цветом закрывает стык с СОСЕДНЕЙ частью
        // другого цвета — внутри части стыков и так нет.
        return (
          <path
            key={cell}
            d={outline(rows, (c) => c === cell)}
            className={partClassName}
            style={{ fill, stroke: fill, strokeWidth: 0.04 }}
          />
        );
      })}
    </svg>
  );
}

type FlowerPalette = keyof typeof flowerStamps.palettes;
type FlowerColors = Partial<Record<"P" | "p" | "C" | "c", string>>;

/**
 * Пиксельный цветок-знак. `colors` перекрывает палитру поклеточно —
 * например, жёлтая серединка у оранжевого цветка.
 */
export function PixelFlower({
  palette = "orange",
  colors,
  shadow,
  stamp = "flower32",
  className,
  style,
}: {
  palette?: FlowerPalette;
  colors?: FlowerColors;
  shadow?: string;
  stamp?: keyof typeof flowerStamps.stamps;
  className?: string;
  style?: React.CSSProperties;
}) {
  const base = flowerStamps.palettes[palette] as Record<string, string>;
  const all = { ...base, ...colors } as Record<string, string>;
  return (
    <PixelGrid
      rows={flowerStamps.stamps[stamp].rows}
      color={(c) => all[c] ?? null}
      shadow={shadow}
      className={className}
      style={style}
    />
  );
}

/** Пиксельный веер-знак целиком, одним цветом лепестков и солнца. */
export function PixelFanMark({ petals, sun, shadow, className }: { petals: string; sun: string; shadow?: string; className?: string }) {
  return (
    <PixelGrid
      rows={fanPixels.rows}
      color={(c) => (c === "S" ? sun : petals)}
      shadow={shadow}
      className={className}
    />
  );
}

/** Какой части веера какой шаг: солнце — шаг 1, лепестки по три — шаги 2–5. */
export function fanPartStep(cell: string) {
  if (cell === "S") return 1;
  return 2 + Math.floor((cell.charCodeAt(0) - 97) / 3);
}

/**
 * Пиксельный веер, залитый до шага `step` (0 — пустой, 5 — целый).
 * `on`/`off` — цвет залитой и пустой части; годятся CSS-переменные.
 */
export function PixelFan({
  step,
  on,
  off,
  className,
}: {
  step: number;
  on: string;
  off: string;
  className?: string;
}) {
  return (
    <PixelGrid
      rows={fanPixels.rows}
      className={className}
      partClassName="transition-[fill,stroke] duration-500 motion-reduce:transition-none"
      color={(c) => (fanPartStep(c) <= step ? on : off)}
    />
  );
}
