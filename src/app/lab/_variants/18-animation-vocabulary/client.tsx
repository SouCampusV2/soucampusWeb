"use client";

import Image from "next/image";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import s from "./styles.module.css";

// Словарь из animation-vocabulary: каждый приём страницы подписан своим
// термином. Определения — дословно из глоссария скилла.
const DEFS: Record<string, string> = {
  Stagger: "Animate several items one after another with a small delay between each, creating a cascade.",
  Parallax: "Background and foreground move at different speeds while scrolling, creating depth.",
  "Number ticker": "Digits rolling or counting up to a value.",
  Marquee: "Text or content that scrolls continuously in a loop.",
  "3D tilt": "Rotate in 3D space (rotateX / rotateY) to add depth.",
  "Line drawing": "An SVG path that draws itself in, like an invisible pen tracing it.",
  "Direction-aware transition": "Content slides one way going forward and the opposite way going back.",
  "Layout animation": "When an element's size or position changes, it animates to the new spot instead of snapping.",
  Ripple: "A circle expanding from the point of a tap, confirming the press.",
  Float: "A gentle, continuous up-and-down drift that makes a static element feel alive and weightless.",
  "Press feedback": "A subtle scale-down when an element is clicked, so it feels physical.",
};

const Names = createContext(true);

/** Корень: хранит переключатель «называть приёмы» и reduced-motion. */
export function GlossaryRoot({ children }: { children: React.ReactNode }) {
  const [on, setOn] = useState(true);
  return (
    <MotionConfig reducedMotion="user">
      <Names.Provider value={on}>
        <button type="button" aria-pressed={on} onClick={() => setOn((v) => !v)} className={s.toggle}>
          <span className={s.toggleDot} data-on={on} />
          {on ? "Hide motion names" : "Name the motion"}
        </button>
        {children}
      </Names.Provider>
    </MotionConfig>
  );
}

/** Плашка-термин. Прячется переключателем. */
export function Term({ name, align = "left" }: { name: keyof typeof DEFS | string; align?: "left" | "right" }) {
  const on = useContext(Names);
  return (
    <AnimatePresence>
      {on && (
        <motion.span
          initial={{ opacity: 0, y: -4, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className={s.term}
          data-align={align}
        >
          <b>{name}</b>
          <span>{DEFS[name]}</span>
        </motion.span>
      )}
    </AnimatePresence>
  );
}

// Stagger: слова заголовка входят по очереди, 60ms между словами.
export function StaggerTitle({ text }: { text: string }) {
  return (
    <motion.h1 className={s.h1} initial="hidden" animate="shown" transition={{ staggerChildren: 0.06 }}>
      {text.split(" ").map((w, i) => (
        <motion.span
          key={i}
          className={s.word}
          variants={{ hidden: { opacity: 0, y: "0.4em" }, shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] } } }}
        >
          {w}&nbsp;
        </motion.span>
      ))}
    </motion.h1>
  );
}

// Parallax + Float: картинка плывёт медленнее скролла и слегка «дышит».
export function ParallaxImage({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  return (
    <div ref={ref} className={s.parallax}>
      <motion.div style={{ y }} className={s.parallaxInner}>
        <motion.div
          className="absolute inset-0"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image src={src} alt={alt} fill priority sizes="(min-width: 900px) 45vw, 100vw" className="object-cover" />
        </motion.div>
      </motion.div>
    </div>
  );
}

// Number ticker: цифры докручиваются до значения, когда блок в кадре.
export function Ticker({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const mv = useMotionValue(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration: 1.4, ease: [0.23, 1, 0.32, 1], onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [inView, mv, value]);

  return (
    <span ref={ref} className={s.ticker}>
      {shown}
      {suffix}
    </span>
  );
}

// 3D tilt: карточка наклоняется за курсором, через пружину (без неё
// наклон «прилипает» к мыши и выглядит механически).
export function TiltCard({ children }: { children: React.ReactNode }) {
  const rx = useSpring(0, { stiffness: 200, damping: 18 });
  const ry = useSpring(0, { stiffness: 200, damping: 18 });
  return (
    <motion.div
      className={s.tilt}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 800 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 12);
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 12);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

// Line drawing (scroll-driven): линия, соединяющая шаги, прорисовывается
// по мере прокрутки секции.
export function DrawnLine() {
  // useScroll следит за HTML-элементом, поэтому SVG обёрнут в div.
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.4"] });
  return (
    <div ref={ref}>
    <svg className={s.line} viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true">
      <motion.path
        d="M5 30 C 150 -10, 250 70, 400 30 S 650 -10, 800 30 S 950 60, 995 30"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        style={{ pathLength: scrollYProgress }}
      />
    </svg>
    </div>
  );
}

// Direction-aware transition: «дальше» — отзыв уезжает влево, «назад» — вправо.
type Review = { slug: string; name: string; role: string; text: string };
export function DirectionalReviews({ reviews }: { reviews: Review[] }) {
  const [[i, dir], set] = useState<[number, number]>([0, 0]);
  const go = (d: number) => set(([x]) => [(x + d + reviews.length) % reviews.length, d]);
  const r = reviews[i];
  return (
    <div>
      <div className={s.reviewStage}>
        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          <motion.figure
            key={r.slug}
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d * 60, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -60, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className={s.review}
          >
            <blockquote>{r.text}</blockquote>
            <figcaption>{r.name}, {r.role}</figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>
      <div className={s.reviewNav}>
        <PressButton onClick={() => go(-1)} label="Previous review">←</PressButton>
        <span className={s.count}>{i + 1} / {reviews.length}</span>
        <PressButton onClick={() => go(1)} label="Next review">→</PressButton>
      </div>
    </div>
  );
}

function PressButton({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={onClick} aria-label={label} className={s.round}>
      {children}
    </motion.button>
  );
}

// Layout animation: карточка тарифа раскрывается, соседи съезжают сами.
type Plan = { name: string; price: string; text: string };
export function LayoutPlans({ plans }: { plans: Plan[] }) {
  const [open, setOpen] = useState<string | null>("Lifetime");
  return (
    <motion.ul layout className={s.plans}>
      {plans.map((p) => {
        const isOpen = open === p.name;
        return (
          <motion.li layout key={p.name} className={s.plan} data-open={isOpen} transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}>
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : p.name)} className={s.planHead}>
              <motion.span layout="position">{p.name}</motion.span>
              <motion.span layout="position" className={s.planPrice}>{p.price}</motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={s.planText}>
                  {p.text}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

// Ripple: круг расходится из точки нажатия.
export function RippleLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  return (
    <motion.a
      href={href}
      whileTap={{ scale: 0.97 }}
      className={s.ripple}
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const id = Date.now();
        setRipples((list) => [...list, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
        window.setTimeout(() => setRipples((list) => list.filter((x) => x.id !== id)), 600);
      }}
    >
      {ripples.map((r) => (
        <span key={r.id} className={s.rippleDot} style={{ left: r.x, top: r.y }} />
      ))}
      <span className="relative">{children}</span>
    </motion.a>
  );
}
