import {
  Unbounded,
  Space_Grotesk,
  Syne,
  Bricolage_Grotesque,
  DM_Serif_Display,
} from "next/font/google";

// Дисплейные шрифты для лаборатории.
//
// ⚠️ ШРИФТ МЕНЯЕТ ХАРАКТЕР СИЛЬНЕЕ ЦВЕТА. Один и тот же макет с
// Unbounded читается как техно-бренд, с DM Serif — как студия
// архитектуры, с Syne — как галерея. Поэтому в лаборатории это
// отдельная ось сравнения, а не деталь.
//
// ⚠️ И ЭТО САМАЯ ДОРОГАЯ ОСЬ ПО ПОСЛЕДСТВИЯМ. Дисплейный шрифт — часть
// узнавания бренда: логотип, hero, заголовки страниц, письма, обложки
// соцсетей. Сменить его на сайте — значит сменить везде, иначе сайт и
// Discord начнут выглядеть как разные компании. Здесь их пять, чтобы
// посмотреть; в проде он один и меняется отдельным решением.
//
// Вес 600/700 у всех, где есть, — чтобы сравнивать шрифты, а не
// толщину: половина разницы между «строго» и «мягко» делается весом.

const unbounded = Unbounded({ subsets: ["latin"], weight: ["600", "700"] });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["600", "700"] });
const syne = Syne({ subsets: ["latin"], weight: ["600", "700", "800"] });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700"] });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: ["400"] });

export type FontId = "unbounded" | "grotesk" | "syne" | "bricolage" | "serif";

export const FONTS: Record<FontId, { className: string; label: string }> = {
  /** Наш нынешний — геометричный, техничный, с широкими овалами. */
  unbounded: { className: unbounded.className, label: "Unbounded (наш)" },
  /** Нейтральный гротеск: спокойнее, меньше характера, больше воздуха. */
  grotesk: { className: spaceGrotesk.className, label: "Space Grotesk" },
  /** Острый, выставочный — сильный характер, быстро приедается. */
  syne: { className: syne.className, label: "Syne" },
  /** Мягкий, чуть игрушечный — ближе к самой игре. */
  bricolage: { className: bricolage.className, label: "Bricolage Grotesque" },
  /** Антиква: делает студию «старше» и дороже, спорит с игровой темой. */
  serif: { className: dmSerif.className, label: "DM Serif Display" },
};
