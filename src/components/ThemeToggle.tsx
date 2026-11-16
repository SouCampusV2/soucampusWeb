"use client";

import { Pixelify_Sans } from "next/font/google";
import { useTheme } from "@/components/ThemeProvider";

// Пиксельный шрифт подписи — в духе надписей Minecraft (сам шрифт игры
// не свободный, Pixelify Sans — открытый, с Google Fonts). Только здесь.
const pixelFont = Pixelify_Sans({ weight: "600", subsets: ["latin"] });

// Подпись — цветом иконки и с тенью со сдвигом, как текст в игре: жёлтый
// на светлом фоне без тени не читался бы (владелец 17.11: «подпиши Light
// mode таким же жёлтым, Dark mode — таким же голубым»).
const LABEL = {
  light: { text: "Light mode", color: "#facc15", shadow: "1px 1px 0 #854d0e" },
  dark: { text: "Dark mode", color: "#cbd5e1", shadow: "1px 1px 0 #334155" },
};

// Кнопка «солнце/луна». Жила внутри ContactFooter — и это значило, что
// тему можно переключить только там, где есть футер. В админке футера нет
// намеренно (она вне группы (site)), поэтому тёмная тема там включалась
// разве что заходом на сайт и возвратом назад.
//
// Провайдер темы общий для всего приложения (корневой layout), так что
// кнопке достаточно переехать в свой файл — состояние уже глобальное.
//
// Иконки — пиксельные, в духе неба Minecraft (17.11, владелец): квадратное
// жёлтое солнце со светлой серединой и ореолом, квадратная серо-голубая луна
// с белыми бликами и кратерами. Свои, а не текстуры игры — сетка 10×10.
// Цвета свои, не currentColor (владелец: солнце жёлтое, луна серо-голубая);
// кружка-рамки вокруг кнопки нет — второй заход 17.11, «не нравится кружок».

/** Клетка сетки: x, y, цвет. */
type Px = [number, number, string];

function square(x0: number, y0: number, size: number): [number, number][] {
  const out: [number, number][] = [];
  for (let y = y0; y < y0 + size; y++) for (let x = x0; x < x0 + size; x++) out.push([x, y]);
  return out;
}

// Солнце: ореол по краю 10×10, солнце 6×6 жёлтое, середина 2×2 светлее.
const SUN: Px[] = [
  ...square(0, 0, 10)
    .filter(([x, y]) => x < 2 || x > 7 || y < 2 || y > 7)
    .filter(([x, y]) => (x + y) % 2 === 0)
    .map(([x, y]): Px => [x, y, "#fde04780"]),
  ...square(2, 2, 6).map(([x, y]): Px => [x, y, x >= 4 && x <= 5 && y >= 4 && y <= 5 ? "#fef9c3" : "#facc15"]),
];

// Луна 8×8: тело серо-голубое, правый край в тени, кратеры темнее, блики белые.
const CRATERS = new Set(["2,3", "3,3", "2,4", "4,6", "5,2"]);
const SHINE = new Set(["1,1", "2,1", "1,2"]);
const MOON: Px[] = square(1, 1, 8).map(([x, y]): Px => {
  if (x >= 7) return [x, y, "#64748b"];
  if (CRATERS.has(`${x},${y}`)) return [x, y, "#94a3b8"];
  if (SHINE.has(`${x},${y}`)) return [x, y, "#f8fafc"];
  return [x, y, "#cbd5e1"];
});

function PixelIcon({ cells, size }: { cells: Px[]; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden="true">
      {cells.map(([x, y, color]) => (
        <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={color} />
      ))}
    </svg>
  );
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      /* Крупнее там, где нажимают пальцем: 32px — граница, за которой
         начинаются промахи. Меряется указатель, а не ширина экрана.
         Без рамки и фона — иконка и подпись, при наведении иконка чуть
         крупнее. */
      className={`group flex h-8 cursor-pointer items-center gap-2 pointer-coarse:h-11 ${className}`}
    >
      <span className="transition-transform group-hover:scale-110">
        <PixelIcon cells={theme === "dark" ? MOON : SUN} size={20} />
      </span>
      <span
        className={`${pixelFont.className} text-sm`}
        style={{ color: LABEL[theme === "dark" ? "dark" : "light"].color, textShadow: LABEL[theme === "dark" ? "dark" : "light"].shadow }}
      >
        {LABEL[theme === "dark" ? "dark" : "light"].text}
      </span>
    </button>
  );
}
