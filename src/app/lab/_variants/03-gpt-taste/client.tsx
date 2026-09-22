"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef, useState } from "react";

// ── Текст, который проявляется от скролла (gpt-taste §5 Scrubbing) ──
//
// Каждое слово начинает с прозрачности 0.1 и доходит до 1, по очереди,
// пока абзац проезжает середину экрана. Прогресс один на весь абзац,
// слову достаётся свой отрезок [i/n, (i+1)/n].
export function ScrubText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.45"] });
  const words = text.split(" ");

  if (reduce) {
    return <p className="text-[clamp(1.75rem,3.4vw,3rem)] font-medium leading-[1.2] tracking-[-0.02em] text-white">{text}</p>;
  }

  return (
    <p ref={ref} className="text-[clamp(1.75rem,3.4vw,3rem)] font-medium leading-[1.2] tracking-[-0.02em] text-white">
      {words.map((word, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {word}
        </Word>
      ))}
    </p>
  );
}

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.1, 1]);
  return (
    <>
      <motion.span style={{ opacity }}>{children}</motion.span>{" "}
    </>
  );
}

// ── Закреплённая галерея (gpt-taste §5 Scroll Pinning + Image Scale) ──
//
// Слева заголовок стоит на месте (sticky), справа едут картинки: входят
// в кадр с 0.8 до 1, уходят — темнеют до 0.2.
type GalleryItem = { slug: string; title: string; image: string; tag: string; summary: string };

export function PinnedGallery({
  title,
  link,
  items,
}: {
  title: string;
  link: { href: string; label: string };
  items: GalleryItem[];
}) {
  return (
    <section aria-labelledby="g-work" className="mx-auto grid max-w-7xl gap-10 px-5 pb-32 md:grid-cols-[0.8fr_1.2fr] md:gap-16 md:pb-48">
      <div className="md:sticky md:top-32 md:h-fit">
        <h2 id="g-work" className="text-[clamp(2.5rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-white">
          {title}
        </h2>
        <Link href={link.href} className="mt-8 inline-flex rounded-full border border-white/25 px-6 py-3 text-white hover:bg-white/10">
          {link.label}
        </Link>
      </div>
      <div className="flex flex-col gap-24">
        {items.map((item) => (
          <GalleryCard key={item.slug} item={item} />
        ))}
      </div>
    </section>
  );
}

function GalleryCard({ item }: { item: GalleryItem }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 0.35, 1], [0.8, 1, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.75, 1], [0.4, 1, 1, 0.2]);

  return (
    <motion.article ref={ref} style={reduce ? undefined : { scale, opacity }} className="origin-center">
      <Link href={`/portfolio/${item.slug}`} className="group relative block aspect-[4/3] overflow-hidden rounded-3xl">
        <Image src={item.image} alt={item.title} fill sizes="(min-width: 768px) 55vw, 100vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
      </Link>
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-2xl font-semibold text-white">{item.title}</h3>
        <p className="text-white/50">{item.tag}</p>
      </div>
      <p className="mt-2 max-w-xl text-white/60">{item.summary}</p>
    </motion.article>
  );
}

// ── Карусель отзывов (§6 Feedback Carousel) ──
//
// Портретов у нас нет, выдумывать их нельзя — вместо фото круги с
// инициалами, внахлёст. Стрелки листают, кружок тоже кликается.
type Review = { slug: string; name: string; role: string; flag: string; text: string };

export function ReviewCarousel({ reviews }: { reviews: Review[] }) {
  const [index, setIndex] = useState(0);
  const current = reviews[index];
  if (!current) return null;
  const go = (step: number) => setIndex((i) => (i + step + reviews.length) % reviews.length);

  return (
    <div className="grid gap-12 md:grid-cols-[1fr_2fr] md:items-center">
      <div>
        <div className="flex -space-x-3">
          {reviews.map((r, i) => (
            <button
              key={r.slug}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Review from ${r.name}`}
              aria-pressed={i === index}
              className={`grid h-14 w-14 place-items-center rounded-full border-2 border-[#0b0c10] text-sm font-semibold transition-transform duration-500 ${
                i === index ? "z-10 scale-110 bg-[#e8ff5a] text-black" : "bg-[#23252d] text-white/70 hover:-translate-y-1"
              }`}
            >
              {r.name.slice(0, 2)}
            </button>
          ))}
        </div>
        <div className="mt-8 flex gap-2">
          <button type="button" onClick={() => go(-1)} aria-label="Previous review" className="grid h-12 w-12 place-items-center rounded-full border border-white/20 text-white hover:bg-white/10">←</button>
          <button type="button" onClick={() => go(1)} aria-label="Next review" className="grid h-12 w-12 place-items-center rounded-full border border-white/20 text-white hover:bg-white/10">→</button>
        </div>
      </div>
      <div aria-live="polite" className="min-h-[14rem]">
        <AnimatePresence mode="wait">
          <motion.figure
            key={current.slug}
            initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <blockquote className="text-[clamp(1.5rem,2.6vw,2.25rem)] font-medium leading-[1.3] tracking-[-0.01em] text-white">
              {current.text}
            </blockquote>
            <figcaption className="mt-8 text-white/60">
              <span className="text-white">{current.flag} {current.name}</span>, {current.role}
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>
    </div>
  );
}
