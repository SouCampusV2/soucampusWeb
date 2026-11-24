"use client";

// Варианты Recent projects на главной (лаборатория 24.11). Владелец:
// «слишком скучно, слишком ИИшно», увеличение при наведении не нравится.
// У каждого варианта свой эффект наведения — без scale картинки.

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Project } from "@/lib/projects";
import { ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { SparkleStar } from "@/components/Sparkles";

const href = (p: Project) => `/portfolio/${p.slug}?from=home`;

function BentoTile({ p, big }: { p: Project; big?: boolean }) {
  return (
    <Link
      href={href(p)}
      className={`group relative block overflow-hidden rounded-3xl ring-orange-500 transition-[box-shadow] duration-300 hover:ring-4 ${big ? "aspect-[4/3] lg:row-span-2 lg:aspect-auto" : "aspect-[16/10]"}`}
    >
      <Image src={p.image} alt={p.title} fill quality={90} sizes={big ? "(min-width:1024px) 60vw, 100vw" : "(min-width:1024px) 35vw, 100vw"} className="object-cover brightness-[0.85] transition-[filter] duration-300 group-hover:brightness-100" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 pt-16 sm:p-6 sm:pt-20">
        <span className="text-xs font-semibold uppercase tracking-wide text-lime-300">{p.tag}</span>
        <h3 className={`mt-1 font-bold text-white ${big ? "text-2xl sm:text-3xl" : "text-lg"}`}>{p.title}</h3>
        <p className="grid grid-rows-[0fr] text-sm text-white/80 transition-[grid-template-rows] duration-300 group-hover:grid-rows-[1fr]">
          <span className="overflow-hidden"><span className="block pt-2">{p.summary}</span></span>
        </p>
      </div>
    </Link>
  );
}

/** Р2. Бенто: одна большая слева, две справа. Подпись всегда на фото;
 *  при наведении — оранжевая рамка, картинка светлеет, подпись поднимается
 *  и показывает описание. */
export function RecentBento({ projects }: { projects: Project[] }) {
  const [a, b, c] = projects;
  if (!a) return null;
  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-6 lg:grid-cols-[3fr_2fr] lg:grid-rows-2">
      <BentoTile p={a} big />
      {b && <BentoTile p={b} />}
      {c && <BentoTile p={c} />}
    </div>
  );
}

/** Р3. Витрина: большой кадр и лента миниатюр. Листается сама раз в 5 с,
 *  останавливается, пока курсор над витриной. Наведение на миниатюру
 *  сразу показывает её крупно. */
export function RecentShowcase({ projects }: { projects: Project[] }) {
  const list = projects.slice(0, 5);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || list.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % list.length), 5000);
    return () => clearInterval(t);
  }, [paused, list.length]);
  const p = list[i];
  if (!p) return null;
  return (
    <div className="mx-auto max-w-6xl px-6" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <Link href={href(p)} className="group relative block aspect-[16/8] overflow-hidden rounded-3xl">
        {list.map((q, n) => (
          <Image key={q.slug} src={q.image} alt={q.title} fill quality={90} sizes="(min-width:1152px) 1100px, 100vw" className={`object-cover transition-opacity duration-700 ${n === i ? "opacity-100" : "opacity-0"}`} />
        ))}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 bg-gradient-to-t from-black/80 to-transparent p-6 pt-24 sm:p-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-lime-300">{p.tag}</span>
            <h3 className="mt-1 text-2xl font-bold text-white sm:text-4xl">{p.title}</h3>
            <p className="mt-2 max-w-xl text-sm text-white/80">{p.summary}</p>
          </div>
          <span className="hidden shrink-0 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-transform group-hover:-translate-y-1 sm:inline-block">Open the work</span>
        </div>
      </Link>
      <div className="mt-3 grid grid-cols-5 gap-3">
        {list.map((q, n) => (
          <button key={q.slug} type="button" onMouseEnter={() => setI(n)} onClick={() => setI(n)} className={`relative aspect-[16/10] overflow-hidden rounded-xl transition-[opacity,box-shadow] ${n === i ? "opacity-100 ring-2 ring-orange-500" : "opacity-50 hover:opacity-90"}`} aria-label={q.title}>
            <Image src={q.image} alt="" fill sizes="220px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Р4. Карточки «поднимаются»: при наведении карточка подпрыгивает вверх
 *  с тенью, снизу выезжает панель с описанием поверх фото. Картинка стоит. */
export function RecentLift({ projects }: { projects: Project[] }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
      {projects.slice(0, 3).map((p) => (
        <Link key={p.slug} href={href(p)} className="group relative block aspect-[4/5] overflow-hidden rounded-3xl shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-orange-500/20">
          <Image src={p.image} alt={p.title} fill quality={90} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
          <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-[#fbfbff]/90 p-4 backdrop-blur-md dark:bg-zinc-950/85">
            <span className="text-xs font-semibold uppercase tracking-wide text-lime-600 dark:text-lime-400">{p.tag}</span>
            <h3 className="mt-0.5 text-lg font-bold text-zinc-950 dark:text-zinc-50">{p.title}</h3>
            <p className="grid grid-rows-[0fr] text-sm text-zinc-600 transition-[grid-template-rows] duration-300 group-hover:grid-rows-[1fr] dark:text-zinc-400">
              <span className="overflow-hidden"><span className="block pt-1.5">{p.summary}</span></span>
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

/** Р5. Фотографии на столе: карточки-полароиды лежат под разными углами
 *  внахлёст. Наведение выпрямляет карточку и кладёт её сверху. */
export function RecentPolaroids({ projects }: { projects: Project[] }) {
  const tilt = ["-rotate-3", "rotate-2", "-rotate-1"];
  const shift = ["lg:translate-y-4", "lg:-translate-y-2", "lg:translate-y-6"];
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 lg:flex-row lg:justify-center lg:gap-0">
      {projects.slice(0, 3).map((p, n) => (
        <Link key={p.slug} href={href(p)} className={`group relative z-0 block w-full max-w-sm rounded-md bg-white p-3 pb-5 shadow-xl transition-[transform,box-shadow] duration-300 hover:z-10 hover:rotate-0 hover:scale-[1.03] hover:shadow-2xl dark:bg-zinc-100 lg:-mx-4 ${tilt[n]} ${shift[n]}`}>
          <div className="relative aspect-square overflow-hidden rounded-sm">
            <Image src={p.image} alt={p.title} fill quality={90} sizes="(min-width:1024px) 24rem, 90vw" className="object-cover" />
          </div>
          <h3 className="mt-4 text-center font-[cursive] text-xl font-semibold text-zinc-900">{p.title}</h3>
          <p className="mt-1 text-center text-xs uppercase tracking-wide text-zinc-500">{p.tag}</p>
        </Link>
      ))}
    </div>
  );
}

/** Р2+. Бенто, выбранное владельцем, плюс приём со скрина legko: внизу
 *  карточки — плашки (тип, размер, срок) и кружок со стрелкой; при
 *  наведении кружок становится оранжевым и вокруг вспыхивают искры. */
function BentoPlusTile({ p, big }: { p: Project; big?: boolean }) {
  const chips = [p.tag, p.size, p.deadline].filter((c) => c && c !== "—").slice(0, 3);
  return (
    <Link
      href={href(p)}
      className={`group relative block overflow-hidden rounded-3xl ring-orange-500 transition-[box-shadow] duration-300 hover:ring-4 ${big ? "aspect-[4/3] lg:row-span-2 lg:aspect-auto" : "aspect-[16/10]"}`}
    >
      <Image src={p.image} alt={p.title} fill quality={90} sizes={big ? "(min-width:1024px) 60vw, 100vw" : "(min-width:1024px) 35vw, 100vw"} className="object-cover brightness-[0.85] transition-[filter] duration-300 group-hover:brightness-100" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 pt-20 sm:p-6 sm:pt-24">
        <h3 className={`font-bold text-white ${big ? "text-2xl sm:text-3xl" : "text-lg"}`}>{p.title}</h3>
        <p className="grid grid-rows-[0fr] text-sm text-white/80 transition-[grid-template-rows] duration-300 group-hover:grid-rows-[1fr]">
          <span className="overflow-hidden"><span className="block pt-2">{p.summary}</span></span>
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <span key={c} className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">{c}</span>
            ))}
          </div>
          <span className="relative shrink-0">
            <SparkleStar size={14} className="absolute -left-4 -top-3 scale-0 text-white transition-transform delay-75 duration-300 group-hover:scale-100" />
            <SparkleStar size={20} className="absolute -top-6 left-3 scale-0 text-orange-200 transition-transform delay-150 duration-300 group-hover:scale-100" />
            <SparkleStar size={10} className="absolute -right-3 top-1 scale-0 text-white transition-transform delay-200 duration-300 group-hover:scale-100" />
            <span className="flex size-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors duration-300 group-hover:bg-orange-500 group-hover:text-zinc-950">
              <ArrowRight size={20} weight="bold" />
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export function RecentBentoPlus({ projects }: { projects: Project[] }) {
  const [a, b, c] = projects;
  if (!a) return null;
  return (
    <div className="mx-auto max-w-6xl px-6">
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:grid-rows-2">
        <BentoPlusTile p={a} big />
        {b && <BentoPlusTile p={b} />}
        {c && <BentoPlusTile p={c} />}
      </div>
      <div className="mt-8 flex justify-center">
        <Button href="/portfolio" variant="tertiary" size="lg" pageTransition>
          See the whole portfolio
        </Button>
      </div>
    </div>
  );
}
