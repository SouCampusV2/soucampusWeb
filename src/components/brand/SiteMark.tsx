import { PixelFlower } from "@/components/brand/PixelArt";

// Знак сайта — тот же, что фавиконка (F2, 16.11): кремовый пиксельный
// цветок с жёлтой серединкой на оранжевом квадрате. Один компонент для
// навбара и футера (17.11, владелец: «в футере тоже должен быть логотип,
// как на баре»), чтобы знак не разошёлся в двух копиях.

/**
 * Оранжевый знака — #ff6900, точно как фавиконка. Ник «SouCampus» рядом со
 * знаком красится им же, а не text-orange-500: оранжевый Tailwind v4 задан
 * в oklch и на экранах с широким цветом (P3, Mac) выходит ярче sRGB-квадрата,
 * и рядом это было заметно (владелец 17.11). Ник: text-[#ff6900] в
 * Navbar.tsx и ContactFooter.tsx — меняешь цвет знака, меняй и там.
 */
// Жёлтая серединка цветка (владелец 16.11) — краситель yellow из игры.
const YELLOW_CENTER = { C: "#fed83d", c: "#c6a830" };

export function SiteMark({ className = "size-10" }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-[22%] bg-[#ff6900] ${className}`} aria-hidden>
      <PixelFlower palette="cream" colors={YELLOW_CENTER} className="size-4/5" />
    </span>
  );
}
