"use client";

import { FadeIn } from "@/components/FadeIn";
import Link from "next/link";
import Image from "next/image";
import type { Project } from "@/lib/projects";
import { HashHighlight } from "@/components/HashHighlight";
import { Button } from "@/components/Button";

// Проекты приходят пропсом, а не импортом массива: это клиентский
// компонент ("use client"), он живёт в браузере и в базу ходить не может
// и не должен. Данные загружает серверная страница (app/(site)/page.tsx)
// и передаёт сюда уже готовыми — граница "сервер грузит, клиент рисует".
export function RecentProjects({ projects }: { projects: Project[] }) {
  // Три последние ДОБАВЛЕННЫЕ работы (владелец 17.11), а не первые три по
  // ручному порядку каталога (sort_order), как было до этого. Копия
  // массива: sort меняет исходный, а тот же список нужен странице дальше.
  // ISO-даты сравниваются строкой правильно.
  const recent = [...projects]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(0, 3);

  return (
    // С 17.11 секция ПЕРЕД «Who is SouCampus» (владелец: сначала работы).
    // Полный верхний отступ, нижнего нет: пара читается одним блоком
    // «что построено → кто строил», зазор между ними задаёт Who is.
    <section className="mx-auto max-w-6xl px-6 pt-16 sm:pt-28">
      <HashHighlight />
      <FadeIn>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
          Recent projects
        </h2>
      </FadeIn>
      <p className="mt-2 max-w-xl text-zinc-600 dark:text-zinc-400">
        A few recent projects. See the full catalog in Portfolio.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {recent.map((project, i) => (
          // h-full по цепочке FadeIn → Link → flex-колонка: карточки ряда одной
          // высоты, даже если у одной описание длиннее (владелец 17.11:
          // «Redspire выделяется»).
          <FadeIn key={project.slug} y={24} delay={i * 100} className="h-full">
            <Link
              // Цель ссылки «Home» со страницы работы (PortfolioBackLink).
              id={`home-work-${project.slug}`}
              href={`/portfolio/${project.slug}?from=home`}
              className="group flex h-full scroll-mt-28 flex-col overflow-hidden rounded-2xl border border-zinc-200 ring-orange-500 ring-offset-4 ring-offset-[#fbfbff] transition-shadow duration-500 data-[returned=true]:ring-2 dark:ring-offset-zinc-950 dark:border-zinc-800"
            >
              <div className="relative aspect-[4/3] shrink-0 overflow-hidden">
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="flex-1 p-5">
                <span className="text-xs font-medium uppercase tracking-wide text-lime-600 dark:text-lime-400">
                  {project.tag}
                </span>
                <h3 className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  {project.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {project.summary}
                </p>
              </div>
            </Link>
          </FadeIn>
        ))}
      </div>

      {/* Под всеми тремя — путь в полный каталог (владелец 17.11). По
          центру, как вывод ряда; tertiary — подчёркнутая ссылка, как все
          «читать дальше» главной (владелец 17.11; secondary и стрелку в
          кружке отверг). Волна — портфолио это студия. */}
      <FadeIn className="mt-8 flex justify-center">
        <Button href="/portfolio" variant="tertiary" size="lg" pageTransition>
          See the whole portfolio
        </Button>
      </FadeIn>
    </section>
  );
}
