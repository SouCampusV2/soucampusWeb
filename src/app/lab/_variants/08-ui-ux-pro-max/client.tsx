"use client";

import { Pause, Play, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import s from "./styles.module.css";

type Review = { slug: string; name: string; role: string; text: string };

// Карусель отзывов — ровно по требованиям паттерна из ui-ux-pro-max:
//   • кнопки «назад/вперёд» открывают каждый слайд без перетаскивания;
//   • есть пауза;
//   • автопрокрутка останавливается при наведении, фокусе внутри и
//     при prefers-reduced-motion;
//   • позиция объявляется («3 of 7») через aria-live.
const INTERVAL = 6000;

export function Carousel({ reviews }: { reviews: Review[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [reduce] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const running = !paused && !hover && !focus && !reduce;

  useEffect(() => {
    if (!running || reviews.length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % reviews.length), INTERVAL);
    return () => window.clearInterval(id);
  }, [running, reviews.length]);

  const go = (step: number) => setIndex((i) => (i + step + reviews.length) % reviews.length);
  const r = reviews[index];
  if (!r) return null;

  return (
    <div
      className="mt-12"
      role="region"
      aria-roledescription="carousel"
      aria-label="Client reviews"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocus(false)}
    >
      <div className={`${s.block} ${s.card} bg-white p-8 md:p-12`}>
        <p className="sr-only" aria-live="polite">
          Review {index + 1} of {reviews.length}
        </p>
        <figure key={r.slug} className={s.slideIn} aria-roledescription="slide">
          <blockquote className="text-[clamp(1.35rem,2.4vw,2rem)] font-semibold leading-snug">{r.text}</blockquote>
          <figcaption className="mt-6 text-lg">
            <span className="font-[family-name:var(--u-head)]">{r.name}</span>
            <span className="text-[#475569]">, {r.role}</span>
          </figcaption>
        </figure>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => go(-1)} aria-label="Previous review" className={`${s.iconBtn} bg-white`}>
          <CaretLeft size={22} weight="bold" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Next review" className={`${s.iconBtn} bg-white`}>
          <CaretRight size={22} weight="bold" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Resume rotation" : "Pause rotation"}
          aria-pressed={paused}
          className={`${s.iconBtn} bg-[#2563EB] text-white`}
        >
          {paused ? <Play size={20} weight="fill" aria-hidden="true" /> : <Pause size={20} weight="fill" aria-hidden="true" />}
        </button>
        <span className="ml-2 font-semibold tabular-nums text-[#475569]" aria-hidden="true">
          {index + 1} / {reviews.length}
        </span>
      </div>
    </div>
  );
}
