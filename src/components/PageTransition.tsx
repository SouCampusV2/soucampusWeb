"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const COLS = 16;
const ROW_DELAY = 0.02;
const JITTER = 0.14;
const CELL_DURATION = 0.22;
const HOLD_MS = 100;
const EMPTY_RATIO = 0.3; // доля клеток, которые остаются "пустыми" (еле видны)

// Акцентные клетки — не один плоский orange-400, а вразнобой из нескольких
// оттенков (от светлого к праймери), чтобы волна выглядела живее.
const ACCENT_SHADES = [
  "bg-orange-200",
  "bg-orange-250",
  "bg-orange-300",
  "bg-orange-350",
  "bg-orange-400",
];

type Phase = "idle" | "appearing" | "revealing";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const prevPathname = useRef(pathname);
  const pendingHref = useRef<string | null>(null);
  const busy = useRef(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [cell, setCell] = useState({ size: 0, cols: COLS, rows: COLS });
  const [pattern, setPattern] = useState<number[]>([]);

  // Держим клетки квадратными под текущий размер окна
  useEffect(() => {
    function measure() {
      const size = window.innerWidth / COLS;
      const rows = Math.ceil(window.innerHeight / size);
      setCell({ size, cols: COLS, rows });
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
        if (pendingHref.current) router.push(pendingHref.current);
      }, waveMs + HOLD_MS);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () =>
      document.removeEventListener("click", onClick, { capture: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, waveMs, router, cell]);

  // Маршрут реально сменился — экран уже полностью закрыт блоками, начинаем раскрытие
  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;
    pendingHref.current = null;
    setPhase("revealing");

    const timer = setTimeout(() => {
      setPhase("idle");
      busy.current = false;
    }, waveMs);
    return () => clearTimeout(timer);
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
              const rand = pattern[i] ?? Math.random();
              const row = Math.floor(i / cell.cols);
              const rowFromBottom = cell.rows - 1 - row;
              // нижние ряды идут первыми — волна снизу вверх в обе стороны
              const delay = rowFromBottom * ROW_DELAY + rand * JITTER;

              const color =
                rand < EMPTY_RATIO
                  ? "bg-zinc-200"
                  : rand > 0.5
                    ? ACCENT_SHADES[
                        Math.floor(((rand - 0.5) / 0.5) * ACCENT_SHADES.length) %
                          ACCENT_SHADES.length
                      ]
                    : "bg-[#fbfbff]";

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
