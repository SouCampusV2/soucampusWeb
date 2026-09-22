"use client";

import { useEffect, useRef, useState } from "react";
import s from "./styles.module.css";

// Колода: свой прокручиваемый контейнер со scroll-snap, точки справа и
// счётчик «03 / 08». Текущий слайд определяет IntersectionObserver на
// половине высоты. Клавиши ↑/↓ и PageUp/PageDown работают сами — это
// обычная прокрутка, которая защёлкивается.
export function Deck({ slides, children }: { slides: { id: string; label: string }[]; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setCurrent(Number((e.target as HTMLElement).dataset.slide));
        }
      },
      { root, threshold: 0.5 }
    );
    root.querySelectorAll("[data-slide]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  function go(i: number) {
    ref.current?.querySelector(`[data-slide="${i}"]`)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      {/* tabIndex — чтобы клавиши прокрутки работали сразу, без клика. */}
      <div ref={ref} className={s.deck} tabIndex={-1}>
        {children}
      </div>
      <nav aria-label="Slides" className={s.dots}>
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => go(i)}
            aria-label={slide.label}
            aria-current={i === current ? "step" : undefined}
            className={s.dot}
          />
        ))}
      </nav>
      <p className={s.counter} aria-live="polite">
        {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
      </p>
    </>
  );
}
