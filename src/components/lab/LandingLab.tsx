"use client";

import { useState, useSyncExternalStore } from "react";
import { CaretLeft, CaretRight, List, X } from "@phosphor-icons/react";
import { Hero } from "@/components/Hero";
import { Stats } from "@/components/Stats";
import { RecentProjects } from "@/components/RecentProjects";
import { CountriesMarquee } from "@/components/CountriesMarquee";
import { ClientReviews } from "@/components/ClientReviews";
import { HowItWorks } from "@/components/HowItWorks";
import { VariantEditorial } from "./VariantEditorial";
import { VariantShowcase } from "./VariantShowcase";
import { VariantBlocks } from "./VariantBlocks";
import {
  VariantScrub,
  VariantSpring,
  VariantTimeline,
  VariantTicker,
} from "./BespokeVariants";
import { ComposedVariant } from "./ComposedVariant";
import { PRESETS } from "./presets";
import type { Project } from "@/lib/projects";
import type { Review } from "@/lib/reviews";
import type { Stat } from "@/lib/stats";

// ============================================================
// Лаборатория лендинга: двадцать вариантов одной страницы + нынешний
// сайт как точка отсчёта (ветка design-lab, 2026-09-21).
//
// Каждый вариант — линза одного из привезённых скиллов, то есть не
// «ещё один макет», а ВОПРОС к странице: что если иерархия строгая?
// что если воздуха вдвое больше? что если движения нет вообще?
//
// ⚠️ «Now» стоит первым и вариантом НЕ считается. Без него сравнивать
// не с чем: любой новый макет выигрывает уже тем, что он новый.
// ============================================================

type Data = { projects: Project[]; reviews: Review[]; stats: Stat[] };

type Entry = {
  id: string;
  label: string;
  /** Какой привезённый скилл дал идею. */
  skill: string;
  idea: string;
  risk: string;
  render: (data: Data) => React.ReactNode;
};

const BASELINE: Entry = {
  id: "now",
  label: "Now",
  skill: "—",
  idea: "Сегодняшняя главная, без единой правки",
  risk: "Точка отсчёта, а не вариант",
  render: ({ projects, reviews, stats }) => (
    <>
      <Hero />
      <Stats stats={stats} />
      <RecentProjects projects={projects} />
      <CountriesMarquee />
      <ClientReviews reviews={reviews} />
      <HowItWorks />
    </>
  ),
};

// Написанные руками: у них отличается не раскладка, а сам приём,
// конфигом такое не выражается.
const HANDMADE: Entry[] = [
  {
    id: "editorial",
    label: "Издание",
    skill: "typography-scale",
    idea: "Текст слева, огромный тип, тональные полосы, работы списком",
    risk: "На первом экране нет ни одной фотографии",
    render: (d) => <VariantEditorial {...d} />,
  },
  {
    id: "showcase",
    label: "Витрина",
    skill: "visual-hierarchy",
    idea: "Постройка во весь первый экран, заголовок поверх, параллакс",
    risk: "Тёмная секция (решение 16.07) и тяжёлый LCP",
    render: (d) => <VariantShowcase {...d} />,
  },
  {
    id: "blocks",
    label: "Блоки",
    skill: "layout-grid",
    idea: "Сетка квадратов, все три акцента сразу, появление клетками",
    risk: "Тематическая вёрстка сужает аудиторию",
    render: (d) => <VariantBlocks {...d} />,
  },
  {
    id: "scrub",
    label: "Прокрутка ведёт",
    skill: "gsap-scrolltrigger",
    idea: "Первый экран прикреплён и проигрывается прокруткой, а не листается",
    risk: "Два экрана высоты ради одного, и не сразу понятно, почему «не листается»",
    render: (d) => <VariantScrub {...d} />,
  },
  {
    id: "spring",
    label: "Пружины",
    skill: "react-spring-physics",
    idea: "Движение по физике: карточки тащатся, перелетают и оседают",
    risk: "Перетаскивание на лендинге никому не нужно — эффект ради эффекта",
    render: (d) => <VariantSpring {...d} />,
  },
  {
    id: "timeline",
    label: "Таймлайн",
    skill: "animejs",
    idea: "Одна поставленная последовательность вместо дюжины отдельных появлений",
    risk: "Пока идут титры, читать нечего — на повторном заходе раздражает",
    render: (d) => <VariantTimeline {...d} />,
  },
  {
    id: "ticker",
    label: "Готовые эффекты",
    skill: "animated-component-libraries",
    idea: "Бегущая строка, счётчики, светящаяся рамка — набор узнаваемых блоков",
    risk: "Сайт из чужих эффектов выглядит как чужой сайт",
    render: (d) => <VariantTicker {...d} />,
  },
];

const ENTRIES: Entry[] = [
  BASELINE,
  ...HANDMADE,
  ...PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    skill: preset.skill,
    idea: preset.idea,
    risk: preset.risk,
    render: (d: Data) => <ComposedVariant preset={preset} {...d} />,
  })),
];

const STORAGE_KEY = "lab_landing_variant";

function isKnown(value: string | null): boolean {
  return ENTRIES.some((v) => v.id === value);
}

// ------------------------------------------------------------
// Выбранный вариант — внешнее состояние, а не состояние React.
// Читать его в эффекте и класть через setState нельзя: лишний
// каскадный рендер под целым лендингом. В проекте для этого уже есть
// приём — useSyncExternalStore (корзина, тема, useHydrated).
// ------------------------------------------------------------
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("popstate", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("popstate", callback);
  };
}

function readVariant(): string {
  // Адрес сильнее сохранённого выбора: прислали ссылку на вариант —
  // показать надо его, а не то, что смотрели вчера.
  const fromUrl = new URLSearchParams(window.location.search).get("v");
  if (isKnown(fromUrl)) return fromUrl as string;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isKnown(stored)) return stored as string;
  } catch {
    // Приватный режим — сохранённого выбора просто нет.
  }
  return "now";
}

const serverVariant = () => "now";

export function LandingLab({ projects, reviews, stats }: Data) {
  const variant = useSyncExternalStore(subscribe, readVariant, serverVariant);
  const [listOpen, setListOpen] = useState(false);

  const index = Math.max(
    0,
    ENTRIES.findIndex((v) => v.id === variant)
  );
  const current = ENTRIES[index];

  function choose(next: string) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // см. выше
    }
    const url = new URL(window.location.href);
    url.searchParams.set("v", next);
    window.history.replaceState(null, "", url.toString());
    // replaceState не будит popstate — зовём подписчиков сами, иначе
    // страница не перерисуется. Тот же шаг, что writeCart в корзине.
    for (const listener of listeners) listener();
    window.scrollTo({ top: 0 });
  }

  // Перебор по кругу: на двадцати вариантах «следующий» нажимают куда
  // чаще, чем выбирают из списка, и упираться в конец на середине
  // перебора неудобно.
  const step = (delta: number) =>
    choose(ENTRIES[(index + delta + ENTRIES.length) % ENTRIES.length].id);

  return (
    <div className="relative">
      {current.render({ projects, reviews, stats })}

      {/* Список всех вариантов. Закрывается по выбору: выбрал — смотри
          страницу, а не список. */}
      {listOpen && (
        <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4">
          <div className="pointer-events-auto max-h-[58vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/60 bg-[#fbfbff]/95 p-3 shadow-xl shadow-zinc-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-900/95">
            <div className="grid gap-2 sm:grid-cols-2">
              {ENTRIES.map((entry, i) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    choose(entry.id);
                    setListOpen(false);
                  }}
                  className={`cursor-pointer rounded-2xl p-3 text-left transition-colors ${
                    entry.id === variant
                      ? "bg-orange-500/15 ring-1 ring-orange-500"
                      : "hover:bg-zinc-950/[0.04] dark:hover:bg-zinc-50/[0.06]"
                  }`}
                >
                  <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    {i === 0 ? "" : `${i}. `}
                    {entry.label}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {entry.skill}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                    {entry.idea}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Панель управления. Стекло плотнее рецепта DESIGN.md (95 вместо
          85): над тёмными вариантами сквозь него читался текст самой
          страницы, а это инструмент — он обязан читаться над чем угодно,
          включая варианты, которых ещё нет. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-3xl rounded-3xl border border-white/60 bg-[#fbfbff]/95 p-2 shadow-xl shadow-zinc-950/10 backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-zinc-900/95">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Предыдущий вариант"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-950/[0.06] dark:text-zinc-300 dark:hover:bg-zinc-50/[0.08]"
            >
              <CaretLeft size={18} weight="bold" />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                {index === 0
                  ? "Now — нынешний сайт"
                  : `${index}/${ENTRIES.length - 1} · ${current.label}`}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {current.skill}
              </p>
            </div>

            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Следующий вариант"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-950/[0.06] dark:text-zinc-300 dark:hover:bg-zinc-50/[0.08]"
            >
              <CaretRight size={18} weight="bold" />
            </button>

            <button
              type="button"
              onClick={() => setListOpen((open) => !open)}
              aria-expanded={listOpen}
              aria-label={listOpen ? "Закрыть список" : "Все варианты"}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-950/[0.06] dark:text-zinc-300 dark:hover:bg-zinc-50/[0.08]"
            >
              {listOpen ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
            </button>
          </div>

          {/* Идея и цена — всегда на виду. Вариант, который нравится,
              нравится вместе со своим риском; прятать цену за кнопку
              значит прятать половину решения. */}
          <div className="px-3 pb-1 pt-2">
            <p className="text-sm leading-5 text-zinc-700 dark:text-zinc-300">
              {current.idea}
            </p>
            <p className="mt-1 text-xs leading-5 text-orange-700 dark:text-orange-300">
              Цена: {current.risk}
            </p>
          </div>
        </div>
      </div>

      {/* Место под панель, чтобы она не накрывала низ страницы. */}
      <div className="h-40" aria-hidden />
    </div>
  );
}
