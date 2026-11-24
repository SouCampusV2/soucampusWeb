// Пиксельный сундук, открытый и пустой: иллюстрация пустой корзины
// (лаборатория 24.11, вариант КП1 — выбор владельца вместо иконки
// тележки). Рисуется SVG-клетками с crispEdges, как знаки бренда.

/** Пиксельный сундук, открытый и пустой: крышка поднята, внутри темно. */
export function PixelChest({ className = "" }: { className?: string }) {
  // . пусто, D тёмное дерево, W дерево, L светлое дерево, G золото, K темнота внутри
  const rows = [
    "..DDDDDDDDDDDD..",
    ".DWWWWWWWWWWWWD.",
    ".DWLLLLLLLLLLWD.",
    ".DWWWWWWWWWWWWD.",
    ".DDDDDDDDDDDDDD.",
    "................",
    "DDDDDDDDDDDDDDDD",
    "DKKKKKKKKKKKKKKD",
    "DKKKKKKKKKKKKKKD",
    "DWWWWWWGGWWWWWWD",
    "DWLLLLLGGLLLLLWD",
    "DWWWWWWWWWWWWWWD",
    "DLLLLLLLLLLLLLLD",
    "DWWWWWWWWWWWWWWD",
    "DDDDDDDDDDDDDDDD",
  ];
  const color: Record<string, string> = { D: "#5b3716", W: "#9a5b26", L: "#c07a3a", G: "#facc15", K: "#1c1917" };
  return (
    <svg viewBox="0 0 16 15" shapeRendering="crispEdges" className={className} aria-hidden>
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color[c]} />)))}
    </svg>
  );
}
