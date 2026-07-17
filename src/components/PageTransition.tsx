"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

const COLS_DESKTOP = 16;
// Fewer, bigger squares on narrow screens — at 16 columns a 375px-wide
// phone gets ~23px cells, which reads as fussy confetti rather than the
// bold blocky wave this effect is going for on desktop.
const COLS_MOBILE = 8;
const ROW_DELAY = 0.02;
const JITTER = 0.14;
const CELL_DURATION = 0.22;
const HOLD_MS = 100;
const EMPTY_RATIO = 0.3; // доля клеток, которые остаются "пустыми" (еле видны)

// Акцентные клетки — не один плоский orange-400, а вразнобой из нескольких
// оттенков (от светлого к праймери), чтобы волна выглядела живее. Цвета
// выбираются в JS (не через Tailwind `dark:`), поэтому под тёмную тему —
// отдельный набор, оттенки отражены вокруг 500 (см. DESIGN.md → "Тёмная
// тема"): 200<->800, 250<->750, 300<->700, 350<->650, 400<->600.
const ACCENT_SHADES_LIGHT = [
  "bg-orange-200",
  "bg-orange-250",
  "bg-orange-300",
  "bg-orange-350",
  "bg-orange-400",
];
const ACCENT_SHADES_DARK = [
  "bg-orange-800",
  "bg-orange-750",
  "bg-orange-700",
  "bg-orange-650",
  "bg-orange-600",
];

type Phase = "idle" | "appearing" | "revealing";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const ACCENT_SHADES = theme === "dark" ? ACCENT_SHADES_DARK : ACCENT_SHADES_LIGHT;
  const EMPTY_COLOR = theme === "dark" ? "bg-zinc-800" : "bg-zinc-200";
  const BASE_COLOR = theme === "dark" ? "bg-zinc-950" : "bg-[#fbfbff]";

  const prevPathname = useRef(pathname);
  const pendingHref = useRef<string | null>(null);
  const busy = useRef(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [cell, setCell] = useState({ size: 0, cols: COLS_DESKTOP, rows: COLS_DESKTOP });
  const [pattern, setPattern] = useState<number[]>([]);

  // Держим клетки квадратными под текущий размер окна
  useEffect(() => {
    function measure() {
      const cols = window.innerWidth < 640 ? COLS_MOBILE : COLS_DESKTOP;
      const size = window.innerWidth / cols;
      const rows = Math.ceil(window.innerHeight / size);
      setCell({ size, cols, rows });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const waveMs =
    (cell.rows - 1) * ROW_DELAY * 1000 + JITTER * 1000 + CELL_DURATION * 1000;

  // Перехватываем клик в фазе capture — раньше, чем сработает обработчик
  // самого <Link>, чтобы гарантированно успеть проиграть анимацию появления
  // блоков на текущей странице до того, как реально сменится маршрут.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        busy.current ||
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;

      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const isInternal =
        href &&
        href.startsWith("/") &&
        anchor.target !== "_blank" &&
        !anchor.hasAttribute("download") &&
        anchor.hasAttribute("data-page-transition");

      if (!isInternal || href === pathname) return;

      e.preventDefault();
      e.stopPropagation();

      busy.current = true;
      pendingHref.current = href;

      const total = cell.cols * cell.rows;
      setPattern(Array.from({ length: total }, () => Math.random()));
      setPhase("appearing");

      setTimeout(() => {
        // `scroll: false` opts out of Next's own scroll restoration — by
        // default it scrolls to the top of whichever DOM segment actually
        // changed, not to the true (0,0) top of the document. Since Navbar
        // lives in the root layout and never remounts between routes, Next
        // treats it as unchanged and scrolls only far enough to bring the
        // page-specific content to the top — which lands at scrollY equal
        // to the navbar's own reserved flow height (~82px), not 0. We do
        // the scroll ourselves instead, once the route has actually changed
        // (see the pathname effect below), so every navigation reliably
        // starts at the real top of the page.
        if (pendingHref.current) router.push(pendingHref.current, { scroll: false });
      }, waveMs + HOLD_MS);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () =>
      document.removeEventListener("click", onClick, { capture: true });
  }, [pathname, waveMs, router, cell]);

  // Маршрут реально сменился — экран уже полностью закрыт блоками, начинаем раскрытие
  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;
    pendingHref.current = null;
    window.scrollTo(0, 0);
    // Framer Motion's own "height: auto" measurement (used by the mobile
    // nav dropdown's open/close animation) saves the scroll position before
    // it measures layout and restores it afterwards, asynchronously, in its
    // own batched rAF work — which lands *after* the scrollTo(0, 0) above,
    // silently undoing it back to wherever the user was scrolled to on the
    // previous page. Confirmed by intercepting window.scrollTo: our call
    // fires, then ~30ms later Framer's own processBatch/measureAllKeyframes
    // calls scrollTo again with the old value. A second, delayed correction
    // reliably lands after that internal restore and wins the race.
    const rescroll = setTimeout(() => window.scrollTo(0, 0), 100);
    setPhase("revealing");

    const timer = setTimeout(() => {
      setPhase("idle");
      busy.current = false;
    }, waveMs);
    return () => {
      clearTimeout(timer);
      clearTimeout(rescroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const total = cell.cols * cell.rows;

  return (
    <>
      {children}

      {phase !== "idle" && (
        <div
          className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
          aria-hidden
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${cell.cols}, 1fr)`,
              gridAutoRows: `${cell.size}px`,
            }}
          >
            {Array.from({ length: total }).map((_, i) => {
              // Детерминированный fallback на случай, если pattern ещё не
              // подстроился под новый размер сетки (после resize) — без
              // Math.random, чтобы не нарушать чистоту рендера.
              const rand = pattern[i] ?? ((i * 9301 + 49297) % 233280) / 233280;
              const row = Math.floor(i / cell.cols);
              const rowFromBottom = cell.rows - 1 - row;
              // нижние ряды идут первыми — волна снизу вверх в обе стороны
              const delay = rowFromBottom * ROW_DELAY + rand * JITTER;

              const color =
                rand < EMPTY_RATIO
                  ? EMPTY_COLOR
                  : rand > 0.5
                    ? ACCENT_SHADES[
                        Math.floor(((rand - 0.5) / 0.5) * ACCENT_SHADES.length) %
                          ACCENT_SHADES.length
                      ]
                    : BASE_COLOR;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={
                    phase === "appearing"
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0.4 }
                  }
                  transition={{
                    duration: CELL_DURATION,
                    delay,
                    ease: phase === "appearing" ? "easeOut" : "easeIn",
                  }}
                  className={color}
                />
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
