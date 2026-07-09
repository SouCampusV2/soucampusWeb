"use client";

import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const COLS = 8;
const ROW_DELAY = 0.045;
const CELL_DURATION = 0.25;
const HOLD_MS = 120;

const shade = (i: number, cols: number) =>
  (Math.floor(i / cols) + (i % cols)) % 2 === 0
    ? "bg-zinc-950 dark:bg-zinc-900"
    : "bg-emerald-600 dark:bg-emerald-700";

type Phase = "idle" | "covering" | "revealing";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const isFirstRender = useRef(true);

  const [phase, setPhase] = useState<Phase>("idle");
  const [displayed, setDisplayed] = useState(children);
  const [contentVisible, setContentVisible] = useState(true);
  const [cell, setCell] = useState({ size: 0, cols: COLS, rows: COLS });

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

  // Вне фазы "covering" (старая страница закрыта блоками) — контент всегда актуален
  useEffect(() => {
    if (phase !== "covering") setDisplayed(children);
  }, [children, phase]);

  // Старт перехода при смене маршрута
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevPathname.current = pathname;
      return;
    }
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    setPhase("covering");
    const coverMs =
      (cell.rows - 1) * ROW_DELAY * 1000 + 60 + CELL_DURATION * 1000;

    const timer = setTimeout(() => {
      // экран полностью закрыт блоками — теперь можно незаметно подменить контент
      setDisplayed(children);
      setContentVisible(false);
      setPhase("revealing");
    }, coverMs + HOLD_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Раскрытие: блоки исчезают, новая страница плавно проявляется под ними
  useEffect(() => {
    if (phase !== "revealing") return;
    const raf = requestAnimationFrame(() => setContentVisible(true));

    const revealMs =
      (cell.rows - 1) * ROW_DELAY * 1000 + 60 + CELL_DURATION * 1000;
    const timer = setTimeout(() => setPhase("idle"), revealMs);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [phase, cell.rows]);

  const total = cell.cols * cell.rows;

  return (
    <>
      <motion.div
        animate={{
          opacity: contentVisible ? 1 : 0,
          y: contentVisible ? 0 : 12,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-1 flex-col"
      >
        {displayed}
      </motion.div>

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
              const row = Math.floor(i / cell.cols);
              const delay =
                phase === "covering"
                  ? (cell.rows - 1 - row) * ROW_DELAY + Math.random() * 0.06
                  : row * ROW_DELAY + Math.random() * 0.06;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={
                    phase === "covering"
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0.4 }
                  }
                  transition={{
                    duration: CELL_DURATION,
                    delay,
                    ease: phase === "covering" ? "easeOut" : "easeIn",
                  }}
                  className={shade(i, cell.cols)}
                />
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
