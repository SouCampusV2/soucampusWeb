"use client";

import { FadeIn } from "@/components/FadeIn";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react";
import type { Project } from "@/lib/projects";
import { HashHighlight } from "@/components/HashHighlight";
import { SparkleStar } from "@/components/Sparkles";

// Recent projects на главной — бенто (24.11, лаборатория главной, вариант
// Р2+, выбор владельца: «восхитительно»). Одна работа крупно слева, две
// справа. Подпись и плашки (тип, размер, срок) лежат на фото; при
// наведении — оранжевая рамка, фото светлеет, выезжает описание, кружок со
// стрелкой краснеет в оранжевый и вокруг вспыхивают искры (приём с
// legko.company). Увеличения картинки нет: владелец его не любит.
//
// Работы — три самые новые по created_at (владелец 17.11), а не по
// sort_order портфолио: тот про любимые, этот про свежие.
//
// id home-work-<slug> и data-returned — для возврата со страницы работы
// (?from=home): HashHighlight находит карточку и обводит её на секунду.

function Sparks({ className = "" }: { className?: string }) {
  return (
    <>
      <SparkleStar size={14} className={`absolute -left-4 -top-3 scale-0 transition-transform delay-75 duration-300 group-hover:scale-100 ${className}`} />
      <SparkleStar size={20} className="absolute -top-6 left-3 scale-0 text-orange-300 transition-transform delay-150 duration-300 group-hover:scale-100" />
      <SparkleStar size={10} className={`absolute -right-3 top-1 scale-0 transition-transform delay-200 duration-300 group-hover:scale-100 ${className}`} />
    </>
  );
}

function Tile({ project, big }: { project: Project; big?: boolean }) {
  const chips = [project.tag, project.size, project.deadline]
    .filter((c) => c && c !== "—")
    .slice(0, 3);
  return (
    <Link
      id={`home-work-${project.slug}`}
      href={`/portfolio/${project.slug}?from=home`}
      className={`group relative block scroll-mt-28 overflow-hidden rounded-3xl ring-orange-500 ring-offset-4 ring-offset-[#fbfbff] transition-[box-shadow] duration-300 hover:ring-4 hover:ring-offset-0 data-[returned=true]:ring-2 dark:ring-offset-zinc-950 ${
        big ? "aspect-[4/3] lg:row-span-2 lg:aspect-auto" : "aspect-[16/10]"
      }`}
    >
      <Image
        src={project.image}
        alt={project.title}
        fill
        quality={90}
        sizes={big ? "(min-width: 1024px) 60vw, 100vw" : "(min-width: 1024px) 35vw, 100vw"}
        className="object-cover brightness-[0.85] transition-[filter] duration-300 group-hover:brightness-100"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 pt-20 sm:p-6 sm:pt-24">
        <h3 className={`font-bold text-white ${big ? "text-2xl sm:text-3xl" : "text-lg"}`}>
          {project.title}
        </h3>
        {/* Описание выезжает: высота строки сетки 0fr → 1fr, без замера в JS. */}
        <p className="grid grid-rows-[0fr] text-sm text-white/80 transition-[grid-template-rows] duration-300 group-hover:grid-rows-[1fr]">
          <span className="overflow-hidden">
            <span className="block pt-2">{project.summary}</span>
          </span>
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <span
                key={c}
                className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm"
              >
                {c}
              </span>
            ))}
          </div>
          <span className="relative shrink-0">
            <Sparks className="text-white" />
            <span className="flex size-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors duration-300 group-hover:bg-orange-500 group-hover:text-zinc-950">
              <ArrowRight size={20} weight="bold" />
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export function RecentProjects({ projects }: { projects: Project[] }) {
  const [a, b, c] = [...projects]
    .sort((x, y) => (x.createdAt < y.createdAt ? 1 : x.createdAt > y.createdAt ? -1 : 0))
    .slice(0, 3);

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-16 sm:pt-28">
      <HashHighlight />
      <FadeIn>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
          Recent projects
        </h2>
      </FadeIn>
      <p className="mt-2 max-w-xl text-zinc-600 dark:text-zinc-400">
        The newest builds. See the full catalog in Portfolio.
      </p>

      {a && (
        <FadeIn y={24} className="mt-10 grid w-full gap-4 lg:grid-cols-[3fr_2fr] lg:grid-rows-2">
          <Tile project={a} big />
          {b && <Tile project={b} />}
          {c && <Tile project={c} />}
        </FadeIn>
      )}

      {/* Кнопка под бенто — таблетка с обводкой и стрелкой; при наведении те
          же искры, что у кружка на карточке. Волна перехода — портфолио
          это студия. */}
      <FadeIn className="mt-10 flex justify-center">
        <Link
          href="/portfolio"
          data-page-transition="true"
          className="group relative inline-flex h-12 items-center gap-3 rounded-full border-2 border-orange-500 px-7 font-semibold text-orange-600 transition-colors hover:bg-orange-500 hover:text-zinc-950 active:scale-95 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-400 dark:hover:text-zinc-950 sm:h-14"
        >
          See the whole portfolio
          <span className="relative">
            <Sparks className="text-orange-400" />
            <ArrowRight size={20} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </Link>
      </FadeIn>
    </section>
  );
}
