"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import s from "./styles.module.css";

// fixing-motion-performance, применённый к живой странице. Каждая
// функция ниже — одно правило скилла, названное в комментарии.

// ── HUD: частота кадров ──
// requestAnimationFrame-цикл С УСЛОВИЕМ ОСТАНОВКИ (§1: «no rAF loops
// without a stop condition») — он крутится, только пока HUD включён.
export function FpsHud() {
  const [on, setOn] = useState(false);
  const [fps, setFps] = useState(0);
  const [longFrames, setLongFrames] = useState(0);

  useEffect(() => {
    if (!on) return;
    let frame = 0;
    let last = performance.now();
    let acc = 0;
    let frames = 0;
    let long = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      acc += dt;
      frames += 1;
      if (dt > 34) long += 1; // пропущено больше одного кадра при 60 Гц
      if (acc >= 500) {
        setFps(Math.round((frames * 1000) / acc));
        setLongFrames(long);
        acc = 0;
        frames = 0;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [on]);

  return (
    <div className={s.hud}>
      <button type="button" aria-pressed={on} onClick={() => setOn((v) => !v)} className={s.hudBtn}>
        {on ? "Hide FPS" : "Show FPS"}
      </button>
      {on && (
        <span className={s.hudNums} aria-live="off">
          <b data-bad={fps < 50}>{fps}</b> fps · {longFrames} long frames
        </span>
      )}
    </div>
  );
}

// ── Бегущая строка, которая ПАУЗИТСЯ вне экрана ──
// §4: «use IntersectionObserver for visibility and pausing», «pause or
// stop animations when off-screen». Сама анимация — CSS transform.
export function Marquee({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={s.marquee} data-paused={!visible}>
      <div className={s.marqueeTrack}>{children}</div>
    </div>
  );
}

// ── FLIP-раскрытие работы ──
// §3: «measure once, then animate via transform», «prefer FLIP-style
// transitions for layout-like effects». Замеряем ДО и ПОСЛЕ одним
// заходом, дальше браузер крутит только transform (WAAPI). will-change
// ставится на время анимации и снимается (§6: «use will-change
// temporarily and surgically»).
type Build = { slug: string; title: string; tag: string; image: string; summary: string; size: string };

export function FlipBuilds({ builds }: { builds: Build[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLElement>());
  const first = useRef<Map<string, DOMRect> | null>(null);

  function toggle(slug: string) {
    // FIRST: все прямоугольники разом, до изменения (batch reads).
    const rects = new Map<string, DOMRect>();
    refs.current.forEach((el, key) => rects.set(key, el.getBoundingClientRect()));
    first.current = rects;
    setOpen((cur) => (cur === slug ? null : slug));
  }

  useEffect(() => {
    const before = first.current;
    if (!before) return;
    first.current = null;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // LAST + INVERT + PLAY: сначала все чтения, потом все записи.
    const moves: [HTMLElement, DOMRect, DOMRect][] = [];
    refs.current.forEach((el, key) => {
      const a = before.get(key);
      if (a) moves.push([el, a, el.getBoundingClientRect()]);
    });
    for (const [el, a, b] of moves) {
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      const sx = a.width / b.width;
      const sy = a.height / b.height;
      if (!dx && !dy && sx === 1 && sy === 1) continue;
      el.style.willChange = "transform";
      const anim = el.animate(
        [{ transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transformOrigin: "0 0", transform: "none" }],
        { duration: 420, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }
      );
      anim.onfinish = () => {
        el.style.willChange = "";
      };
    }
  }, [open]);

  return (
    <div className={s.flipGrid}>
      {builds.map((b) => {
        const isOpen = open === b.slug;
        return (
          <article
            key={b.slug}
            ref={(el) => {
              if (el) refs.current.set(b.slug, el);
              else refs.current.delete(b.slug);
            }}
            className={s.flipCard}
            data-open={isOpen}
          >
            <button type="button" aria-expanded={isOpen} onClick={() => toggle(b.slug)} className={s.flipBtn}>
              <span className={s.flipImg}>
                <Image src={b.image} alt="" fill sizes={isOpen ? "(min-width: 900px) 66vw, 100vw" : "(min-width: 900px) 33vw, 100vw"} />
              </span>
              <span className={s.flipTitle}>{b.title}</span>
              <span className={s.muted}>{b.tag}, {b.size}</span>
            </button>
            {isOpen && (
              <div className={s.flipMore}>
                <p>{b.summary}</p>
                <Link href={`/portfolio/${b.slug}`} className={s.link}>Open the build</Link>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
