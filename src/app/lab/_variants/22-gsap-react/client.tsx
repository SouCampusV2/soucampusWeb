"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { Flip } from "gsap/Flip";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import s from "./styles.module.css";

gsap.registerPlugin(useGSAP, SplitText, Flip, Draggable, InertiaPlugin);

// Официальный скилл gsap-react: всё GSAP — внутри useGSAP со scope;
// всё, что создаётся ПОЗЖЕ (обработчики событий), завёрнуто в contextSafe,
// иначе оно не откатится при размонтировании. Никаких useEffect + ручной
// очистки: хук делает её сам.

// ── Hero: одна оркестрованная временная шкала ──
export function HeroIntro({ title, lede, children, side }: { title: string; lede: string; children: React.ReactNode; side: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create(".t-title", { type: "words,chars", mask: "words" });
        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
        tl.from(split.chars, { yPercent: 110, duration: 0.9, stagger: 0.018 })
          .from(".t-lede", { opacity: 0, y: 16, duration: 0.6 }, "-=0.5")
          .from(".t-cta > *", { opacity: 0, y: 12, scale: 0.96, stagger: 0.08, duration: 0.5 }, "-=0.35")
          .from(".t-fan > *", { opacity: 0, y: 60, rotate: 0, stagger: 0.1, duration: 1, ease: "expo.out" }, "-=0.8");
        return () => split.revert();
      });
    },
    { scope: root }
  );

  return (
    <div ref={root} className={s.hero}>
      <div>
        <h1 className={`t-title ${s.h1}`}>{title}</h1>
        <p className={`t-lede ${s.lede}`}>{lede}</p>
        <div className={`t-cta ${s.actions}`}>{children}</div>
      </div>
      {side}
    </div>
  );
}

// Веер картинок в hero. Передаётся в HeroIntro слотом `side`, чтобы
// лежать ВНУТРИ его scope: иначе шкала не нашла бы .t-fan.
export function Fan({ images }: { images: string[] }) {
  return (
    <div className={`t-fan ${s.fan}`} aria-hidden="true">
      {images.map((src, i) => (
        <span key={src} className={s.fanCard} style={{ ["--r" as string]: `${(i - 1) * 8}deg`, ["--x" as string]: `${(i - 1) * 28}%` }}>
          <Image src={src} alt="" fill sizes="280px" />
        </span>
      ))}
    </div>
  );
}

// ── Магнитная кнопка: тянется к курсору, отпускается пружиной ──
// Обработчики создаются ВНУТРИ useGSAP через contextSafe (второй аргумент
// колбэка) и вешаются addEventListener'ом — так скилл велит делать с
// событиями, которые наступают после запуска хука: они попадают в
// контекст и откатываются при размонтировании.
export function Magnetic({ children, href, variant }: { children: React.ReactNode; href: string; variant: "solid" | "ghost" }) {
  const ref = useRef<HTMLAnchorElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const el = ref.current;
      if (!el || !contextSafe) return;
      const move = contextSafe((e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: 0.4, ease: "power3.out" });
      });
      const leave = contextSafe(() => {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
      });
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      };
    },
    { scope: ref }
  );

  return (
    <Link ref={ref} href={href} className={variant === "solid" ? s.btn : s.btnGhost}>
      {children}
    </Link>
  );
}

// ── Фильтр работ на Flip ──
// Все карточки остаются в DOM; отфильтрованные получают display:none.
// Flip запоминает положения ДО смены, React перерисовывает, и Flip
// переносит карточки на новые места, а появившиеся/ушедшие плавно
// растворяет (onEnter / onLeave).
type Build = { slug: string; title: string; tag: string; image: string; size: string };

export function FlipGrid({ builds }: { builds: Build[] }) {
  const root = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const tags = ["All", ...Array.from(new Set(builds.map((b) => b.tag)))];
  const [tag, setTag] = useState("All");

  useGSAP(
    () => {
      const state = flipState.current;
      if (!state) return;
      flipState.current = null;
      Flip.from(state, {
        duration: 0.6,
        ease: "power3.inOut",
        scale: true,
        absolute: true,
        nested: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.85, duration: 0.35 }),
      });
    },
    { dependencies: [tag], scope: root }
  );

  function pick(next: string) {
    if (!root.current || next === tag) return;
    flipState.current = Flip.getState(root.current.querySelectorAll(".t-item"));
    setTag(next);
  }

  return (
    <div ref={root}>
      <div role="group" aria-label="Filter by type" className={s.chips}>
        {tags.map((t) => (
          <button key={t} type="button" aria-pressed={tag === t} onClick={() => pick(t)} className={s.chip}>
            {t}
          </button>
        ))}
      </div>
      <div className={s.grid}>
        {builds.map((b) => (
          <Link
            key={b.slug}
            href={`/portfolio/${b.slug}`}
            className={`t-item ${s.item}`}
            style={{ display: tag === "All" || b.tag === tag ? undefined : "none" }}
          >
            <span className={s.itemImg}>
              <Image src={b.image} alt="" fill sizes="(min-width: 900px) 30vw, 50vw" />
            </span>
            <span className={s.itemTitle}>{b.title}</span>
            <span className={s.muted}>{b.tag}, {b.size}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Лента отзывов: Draggable + инерция, прилипание к карточке ──
type Review = { slug: string; name: string; role: string; text: string };

export function DragReviews({ reviews }: { reviews: Review[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const t = track.current;
      const v = viewport.current;
      if (!t || !v) return;
      const card = t.firstElementChild as HTMLElement | null;
      const step = (card?.offsetWidth ?? 360) + 16;
      Draggable.create(t, {
        type: "x",
        bounds: v,
        inertia: true,
        edgeResistance: 0.8,
        snap: (x) => Math.round(x / step) * step,
        cursor: "grab",
        activeCursor: "grabbing",
      });
    },
    { scope: viewport }
  );

  return (
    <div ref={viewport} className={s.dragViewport}>
      <div ref={track} className={s.dragTrack}>
        {reviews.map((r) => (
          <figure key={r.slug} className={s.review}>
            <blockquote>{r.text}</blockquote>
            <figcaption className={s.muted}>{r.name}, {r.role}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

// ── Цифры: шкала, которая запускается, когда блок в кадре ──
export function Numbers({ stats }: { stats: { id: string; value: number; suffix: string; label: string }[] }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const els = gsap.utils.toArray<HTMLElement>(".t-num");
      const io = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting) return;
          io.disconnect();
          els.forEach((el, i) => {
            const c = { v: 0 };
            gsap.to(c, { v: Number(el.dataset.value), duration: 1.4, delay: i * 0.12, ease: "power3.out", onUpdate: () => (el.textContent = String(Math.round(c.v))) });
          });
        },
        { threshold: 0.5 }
      );
      if (root.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) io.observe(root.current);
      return () => io.disconnect();
    },
    { scope: root }
  );
  return (
    <div ref={root} className={s.stats}>
      {stats.map((st) => (
        <div key={st.id}>
          <p className={s.statValue}>
            <span className="t-num" data-value={st.value}>{st.value}</span>
            {st.suffix}
          </p>
          <p className={s.muted}>{st.label}</p>
        </div>
      ))}
    </div>
  );
}
