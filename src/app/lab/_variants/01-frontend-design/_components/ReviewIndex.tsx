"use client";

import { useRef, useState } from "react";
import s from "../styles.module.css";

type Review = { slug: string; name: string; role: string; flag: string; text: string };

// Отзывы как указатель: слева список имён, справа один отзыв целиком.
//
// Почему не карусель со стрелками: у карусели содержимое спрятано за
// «следующим», и что там — не видно. Список имён сразу говорит «их
// семь, вот кто», а выбрать можно любого, а не листать по порядку.
//
// Это настоящие вкладки (role="tablist"): стрелки ↑/↓ двигают выбор,
// Tab уходит сразу в текст — так ведут себя вкладки в любой ОС.
export function ReviewIndex({ reviews }: { reviews: Review[] }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = reviews[active];
  if (!current) return null;

  function onKey(e: React.KeyboardEvent, i: number) {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + reviews.length) % reviews.length;
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className={s.reviews}>
      <div role="tablist" aria-label="Clients" aria-orientation="vertical" className={s.reviewNames}>
        {reviews.map((r, i) => (
          <button
            key={r.slug}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            role="tab"
            id={`review-tab-${r.slug}`}
            aria-selected={i === active}
            aria-controls="review-panel"
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKey(e, i)}
            className={s.reviewName}
          >
            {r.name}
          </button>
        ))}
      </div>

      <figure
        id="review-panel"
        role="tabpanel"
        aria-labelledby={`review-tab-${current.slug}`}
        className={s.reviewPanel}
      >
        {/* key заставляет React пересоздать узел — CSS-анимация проигрывается заново */}
        <blockquote key={current.slug} className={s.quote}>
          {current.text}
        </blockquote>
        <figcaption className={s.quoteBy}>
          <span className={s.quoteName}>
            {current.flag} {current.name}
          </span>
          <span className={s.muted}>{current.role}</span>
        </figcaption>
      </figure>
    </div>
  );
}
