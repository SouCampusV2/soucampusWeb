"use client";
/// <reference types="react/canary" />

import Image from "next/image";
import Link from "next/link";
import { ViewTransition, addTransitionType, startTransition, useEffect, useState } from "react";

// Галерея на View Transitions (react-view-transitions, Vercel).
//
// Три паттерна из таблицы скилла, в его порядке приоритета:
//   1. Shared element — картинка постройки в сетке и в карточке деталей
//      носит ОДНО имя (`build-<slug>`), и браузер переливает одну в
//      другую: «то же самое, только ближе».
//   3. List identity — фильтр по типу: оставшиеся плитки переезжают на
//      новые места, потому что у каждой свой key и своя <ViewTransition>.
//   4. Enter/exit — карточка деталей появляется и исчезает.
// Внутри карточки «следующая/предыдущая» — упорядоченная
// последовательность, поэтому слайд НАПРАВЛЕННЫЙ (addTransitionType
// nav-forward / nav-back), как скилл и требует для ordered sequences.
//
// Всё — только внутри startTransition: обычный setState не анимирует.
// В браузерах без View Transitions всё работает, просто без анимации.

type Build = { slug: string; title: string; tag: string; image: string; summary: string; size: string; deadline: string; price: string };

export function MorphGallery({ builds }: { builds: Build[] }) {
  const tags = ["All", ...Array.from(new Set(builds.map((b) => b.tag)))];
  const [tag, setTag] = useState("All");
  const [open, setOpen] = useState<string | null>(null);
  // «open» — карточку открывают/закрывают: сетка отдаёт картинке общее
  // имя, и она перетекает. «step» — листают внутри карточки: общих имён
  // нет, иначе вместо направленного слайда картинка улетала бы в сетку.
  const [mode, setMode] = useState<"open" | "step">("open");
  const shown = tag === "All" ? builds : builds.filter((b) => b.tag === tag);
  const index = shown.findIndex((b) => b.slug === open);
  const current = index >= 0 ? shown[index] : null;

  function pickTag(next: string) {
    startTransition(() => setTag(next));
  }

  function show(slug: string | null) {
    startTransition(() => {
      setMode("open");
      setOpen(slug);
    });
  }

  function step(dir: 1 | -1) {
    if (index < 0) return;
    const next = shown[(index + dir + shown.length) % shown.length];
    startTransition(() => {
      addTransitionType(dir === 1 ? "nav-forward" : "nav-back");
      setMode("step");
      setOpen(next.slug);
    });
  }

  useEffect(() => {
    if (!current) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")
        startTransition(() => {
          setMode("open");
          setOpen(null);
        });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current]);

  return (
    <div>
      <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => pickTag(t)}
            aria-pressed={tag === t}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              tag === t ? "bg-[#0e1116] text-white" : "bg-white text-[#0e1116] ring-1 ring-black/10 hover:bg-black/5"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((b) => (
          <ViewTransition key={b.slug}>
            <li>
              <button
                type="button"
                onClick={() => show(b.slug)}
                className="group block w-full text-left"
                aria-label={`Open ${b.title}`}
              >
                {b.slug === open ? (
                  <div className="aspect-[4/5] rounded-2xl bg-black/5" />
                ) : mode === "open" ? (
                  <ViewTransition name={`build-${b.slug}`} share="morph">
                    <Thumb image={b.image} />
                  </ViewTransition>
                ) : (
                  <Thumb image={b.image} />
                )}
                <span className="mt-3 block font-semibold">{b.title}</span>
                <span className="block text-sm text-[#0e1116]/55">{b.tag}</span>
              </button>
            </li>
          </ViewTransition>
        ))}
      </ul>

      {current && (
        <ViewTransition enter="sheet-in" exit="sheet-out">
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#0e1116]/40 p-3 md:items-center md:p-8" onClick={() => show(null)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="morph-title"
              className="grid max-h-[92dvh] w-full max-w-5xl overflow-auto rounded-3xl bg-white md:grid-cols-[1.3fr_1fr]"
              onClick={(e) => e.stopPropagation()}
            >
              <ViewTransition
                key={current.slug}
                name={`build-${current.slug}`}
                share="morph"
                enter={{ "nav-forward": "slide-from-right", "nav-back": "slide-from-left", default: "auto" }}
                exit={{ "nav-forward": "slide-to-left", "nav-back": "slide-to-right", default: "auto" }}
              >
                <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[520px]">
                  <Image src={current.image} alt={current.title} fill sizes="(min-width: 768px) 60vw, 100vw" className="object-cover" />
                </div>
              </ViewTransition>
              <div className="flex flex-col gap-4 p-6 md:p-8">
                <p className="text-sm text-[#0e1116]/55">{current.tag}</p>
                <h3 id="morph-title" className="text-3xl font-semibold tracking-[-0.03em]">{current.title}</h3>
                <p className="text-[#0e1116]/70">{current.summary}</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                  <dt className="text-[#0e1116]/55">Size</dt><dd className="tabular-nums">{current.size}</dd>
                  <dt className="text-[#0e1116]/55">Built in</dt><dd>{current.deadline}</dd>
                  <dt className="text-[#0e1116]/55">Price</dt><dd>{current.price}</dd>
                </dl>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                  <button type="button" onClick={() => step(-1)} aria-label="Previous build" className="h-11 w-11 rounded-full ring-1 ring-black/15 hover:bg-black/5">←</button>
                  <button type="button" onClick={() => step(1)} aria-label="Next build" className="h-11 w-11 rounded-full ring-1 ring-black/15 hover:bg-black/5">→</button>
                  <Link href={`/portfolio/${current.slug}`} className="ml-auto rounded-full bg-[#0e1116] px-5 py-3 text-sm font-semibold text-white">Open the build</Link>
                  <button type="button" onClick={() => show(null)} className="rounded-full px-4 py-3 text-sm ring-1 ring-black/15 hover:bg-black/5">Close</button>
                </div>
              </div>
            </div>
          </div>
        </ViewTransition>
      )}
    </div>
  );
}

function Thumb({ image }: { image: string }) {
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-black/5">
      <Image src={image} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
    </div>
  );
}

// Отзывы: переключение — тоже переход (enter/exit), без направления:
// между отзывами нет «глубины», это соседние вкладки.
export function ReviewSwap({ reviews }: { reviews: { slug: string; name: string; role: string; text: string }[] }) {
  const [i, setI] = useState(0);
  const r = reviews[i];
  if (!r) return null;
  return (
    <div className="grid gap-8 md:grid-cols-[240px_1fr]">
      <ul className="flex flex-wrap gap-2 md:flex-col md:gap-1">
        {reviews.map((x, j) => (
          <li key={x.slug}>
            <button
              type="button"
              onClick={() => startTransition(() => setI(j))}
              aria-pressed={j === i}
              className={`rounded-full px-4 py-2 text-left text-sm md:w-full ${j === i ? "bg-[#0e1116] text-white" : "hover:bg-black/5"}`}
            >
              {x.name}
            </button>
          </li>
        ))}
      </ul>
      <ViewTransition key={r.slug} enter="fade-up" exit="fade-out">
        <figure>
          <blockquote className="text-[clamp(1.35rem,2.4vw,2rem)] font-medium leading-snug tracking-[-0.01em]">{r.text}</blockquote>
          <figcaption className="mt-5 text-[#0e1116]/60">{r.name}, {r.role}</figcaption>
        </figure>
      </ViewTransition>
    </div>
  );
}
