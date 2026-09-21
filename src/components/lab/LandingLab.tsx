"use client";

import { useState, useSyncExternalStore } from "react";
import { Hero } from "@/components/Hero";
import { Stats } from "@/components/Stats";
import { RecentProjects } from "@/components/RecentProjects";
import { CountriesMarquee } from "@/components/CountriesMarquee";
import { ClientReviews } from "@/components/ClientReviews";
import { HowItWorks } from "@/components/HowItWorks";
import { VariantEditorial } from "./VariantEditorial";
import { VariantShowcase } from "./VariantShowcase";
import { VariantBlocks } from "./VariantBlocks";
import type { Project } from "@/lib/projects";
import type { Review } from "@/lib/reviews";
import type { Stat } from "@/lib/stats";

// ============================================================
// Лаборатория лендинга (2026-09-21, ветка design-lab).
//
// Четыре композиции на одних и тех же настоящих данных, переключаются
// прямо на странице. Смысл именно в переключении: четыре скриншота в
// чате сравнивать нельзя — глаз не помнит предыдущий, а страница
// «до/после» на одном экране показывает разницу честно.
//
// ⚠️ ПЕРВЫЙ ВАРИАНТ — НЫНЕШНИЙ САЙТ, И ЭТО НЕ ФОРМАЛЬНОСТЬ. Без него
// сравнивать не с чем: любой новый макет выглядит свежее просто потому,
// что он новый. «Now» — та же сборка компонентов, что на главной, без
// единой правки.
//
// Выбор хранится в адресе (?v=) и в localStorage. В адресе — чтобы
// ссылку можно было прислать («посмотри вариант C»); в localStorage —
// чтобы при возврате на страницу не начинать сначала.
// ============================================================

type VariantId = "now" | "editorial" | "showcase" | "blocks";

const VARIANTS: {
  id: VariantId;
  label: string;
  idea: string;
  risk: string;
}[] = [
  {
    id: "now",
    label: "Now",
    idea: "Сегодняшняя главная, для сравнения",
    risk: "Ничего не меняется — это точка отсчёта",
  },
  {
    id: "editorial",
    label: "A · Издание",
    idea: "Текст слева, огромный тип, тональные полосы, работы списком",
    risk: "На первом экране нет ни одной фотографии",
  },
  {
    id: "showcase",
    label: "B · Витрина",
    idea: "Фото во весь экран, параллакс, лента работ",
    risk: "Тёмная секция (решение 16.07) и тяжёлый LCP",
  },
  {
    id: "blocks",
    label: "C · Блоки",
    idea: "Сетка квадратов, все три акцента сразу, появление клетками",
    risk: "Тематическая вёрстка сужает аудиторию",
  },
];

const STORAGE_KEY = "lab_landing_variant";

function isVariant(value: string | null): value is VariantId {
  return VARIANTS.some((v) => v.id === value);
}

// ------------------------------------------------------------
// Выбранный вариант — внешнее состояние, а не состояние React.
//
// ⚠️ Читать его в useEffect и класть через setState нельзя, и это не
// придирка линтера: такой код даёт лишний каскадный рендер, а на
// странице, где под ним висит целый лендинг, это заметно. В проекте для
// ровно этой задачи уже есть приём — useSyncExternalStore (корзина,
// тема, useHydrated). Повторяем его, а не изобретаем четвёртый способ.
//
// Значение примитивное (строка), поэтому ссылочная стабильность
// снимков, из-за которой в cart-context понадобился кэш, здесь
// получается сама: одинаковая строка равна одинаковой строке.
// ------------------------------------------------------------
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  // Ещё и на «назад/вперёд» в браузере: адрес меняется, значит меняется
  // и выбранный вариант.
  window.addEventListener("popstate", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("popstate", callback);
  };
}

function readVariant(): VariantId {
  // Адрес сильнее сохранённого выбора: если человеку прислали ссылку на
  // вариант C, показать надо C, а не то, что он смотрел вчера.
  const fromUrl = new URLSearchParams(window.location.search).get("v");
  if (isVariant(fromUrl)) return fromUrl;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isVariant(stored)) return stored;
  } catch {
    // Приватный режим — просто нет сохранённого выбора.
  }
  return "now";
}

// На сервере вариантов нет: рендерим нынешний сайт. Первый клиентский
// кадр совпадает с серверным дословно, и только потом, если выбран
// другой вариант, страница перерисовывается — один раз, без мигания.
const serverVariant = (): VariantId => "now";

export function LandingLab({
  projects,
  reviews,
  stats,
}: {
  projects: Project[];
  reviews: Review[];
  stats: Stat[];
}) {
  const variant = useSyncExternalStore(subscribe, readVariant, serverVariant);
  const [notes, setNotes] = useState(true);

  function choose(next: VariantId) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Приватный режим — просто не запомним выбор. Ронять из-за этого
      // страницу нельзя.
    }
    const url = new URL(window.location.href);
    url.searchParams.set("v", next);
    // replaceState, а не router.push: перерисовывать серверный кусок не
    // надо, а история не должна забиваться четырьмя вариантами подряд.
    window.history.replaceState(null, "", url.toString());
    // replaceState не будит popstate — подписчиков зовём сами, иначе
    // страница не перерисуется. Тот же шаг, что writeCart в корзине.
    for (const listener of listeners) listener();
    window.scrollTo({ top: 0 });
  }

  const current = VARIANTS.find((v) => v.id === variant) ?? VARIANTS[0];

  return (
    <div className="relative">
      {variant === "now" && (
        <>
          <Hero />
          <Stats stats={stats} />
          <RecentProjects projects={projects} />
          <CountriesMarquee />
          <ClientReviews reviews={reviews} />
          <HowItWorks />
        </>
      )}
      {variant === "editorial" && (
        <VariantEditorial projects={projects} reviews={reviews} stats={stats} />
      )}
      {variant === "showcase" && (
        <VariantShowcase projects={projects} reviews={reviews} stats={stats} />
      )}
      {variant === "blocks" && (
        <VariantBlocks projects={projects} reviews={reviews} stats={stats} />
      )}

      {/* Переключатель. Стекло по рецепту DESIGN.md — он плавает над
          контентом, который под ним проезжает, то есть ровно тот
          случай, для которого приём и узаконен.

          Снизу по центру: сверху он спорил бы с навбаром, а справа
          на телефоне попадал бы под большой палец вместе со ссылками. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        {/* ⚠️ Плотность 95, а не 85 из рецепта DESIGN.md — и это
            осознанное отступление. Над тёмной фотографией варианта B
            сквозь стекло читалась подпись «ABOVE: BLUESPAWN», то есть
            переключатель спорил с содержимым. Стекло на сайте —
            украшение поверхности, а здесь это ИНСТРУМЕНТ: он обязан
            читаться над любым вариантом, включая те, которых ещё нет. */}
        <div className="pointer-events-auto w-full max-w-2xl rounded-3xl border border-white/60 bg-[#fbfbff]/95 p-2 shadow-xl shadow-zinc-950/10 backdrop-blur-2xl backdrop-saturate-150 backdrop-brightness-110 dark:border-white/10 dark:bg-zinc-900/95 dark:backdrop-brightness-75">
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {VARIANTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => choose(v.id)}
                className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors pointer-coarse:py-2.5 ${
                  v.id === variant
                    ? "bg-orange-500 text-zinc-950 dark:bg-orange-400"
                    : "text-zinc-600 hover:bg-zinc-950/[0.06] dark:text-zinc-300 dark:hover:bg-zinc-50/[0.08]"
                }`}
              >
                {v.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setNotes((n) => !n)}
              aria-pressed={notes}
              className="ml-auto shrink-0 cursor-pointer rounded-full px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-950/[0.06] dark:text-zinc-400 dark:hover:bg-zinc-50/[0.08]"
            >
              {notes ? "Скрыть заметки" : "Заметки"}
            </button>
          </div>

          {/* Заметка про выбранный вариант — идея и цена. Цена написана
              рядом с идеей намеренно: вариант, который нравится, обычно
              нравится вместе со своим риском, и узнавать о риске через
              неделю хуже, чем сейчас. */}
          {notes && (
            <div className="px-3 pb-2 pt-3">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {current.idea}
              </p>
              <p className="mt-1 text-xs text-orange-700 dark:text-orange-300">
                Цена: {current.risk}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Место под переключатель, чтобы он не накрывал низ страницы. */}
      <div className="h-32" aria-hidden />
    </div>
  );
}
