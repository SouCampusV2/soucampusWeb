// Пиксельный сундук, приоткрытый и пустой: иллюстрация пустой корзины
// (лаборатория 24.11, вариант КП1 — выбор владельца вместо иконки
// тележки). Перерисован тем же днём под сундук из Minecraft: тёмный
// контур, доски со светлой кромкой, металлическая защёлка, крышка поднята
// и под ней темно. Рисуется SVG-клетками с crispEdges, как знаки бренда.

// O контур, H кромка, L светлая доска, W доска, D шов, K темнота внутри,
// G металл защёлки, g тень металла
const ROWS = [
  ".OOOOOOOOOOOOOO.",
  "OHHHHHHHHHHHHHHO",
  "OLLLLLLLLLLLLLLO",
  "OWWWWWWWWWWWWWWO",
  "OOOOOOOOOOOOOOOO",
  "OKKKKKKKKKKKKKKO",
  "OKKKKKKKKKKKKKKO",
  "OOOOOOOGGOOOOOOO",
  "OHHHHHGggGHHHHHO",
  "OLLLLLGggGLLLLLO",
  "OWWWWWWGGWWWWWWO",
  "ODDDDDDDDDDDDDDO",
  "OWWWWDWWWWDWWWWO",
  "OLLLLDLLLLDLLLLO",
  "OOOOOOOOOOOOOOOO",
];

const COLOR: Record<string, string> = {
  O: "#3b2410",
  H: "#d39a55",
  L: "#b97a3c",
  W: "#9a6230",
  D: "#6b4220",
  K: "#140c06",
  G: "#d4d4d8",
  g: "#71717a",
};

export function PixelChest({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 15" shapeRendering="crispEdges" className={className} aria-hidden>
      {ROWS.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={COLOR[c]} />
        )
      )}
    </svg>
  );
}
