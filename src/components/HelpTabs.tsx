import Link from "next/link";
import { PageGlow } from "@/components/PageGlow";

// Справочные страницы: FAQ, Wiki, Terms, Privacy (просьба владельца 17.11 —
// «неудобно, когда всё разрознено»). Четыре отдельные страницы со своими
// адресами, а не панели одной страницы: у каждой свой title, canonical и
// место в поиске, на /terms#refunds ссылается Stripe, на /privacy — Google
// OAuth. Вкладка здесь — просто ссылка.
//
// Решения владельца 17.11 (третий заход — не возвращать отвергнутое):
//   · видимого h1 нет, на его месте вкладки; h1 есть в разметке (sr-only)
//     для поиска и читалки;
//   · вкладки — ячейки вплотную на всю ширину, между ними тёмно-серые
//     вертикальные разделители, верхней и нижней линии нет, отступы
//     крупные; активная — зелёная заливка (lime-300), наведение — светло-
//     зелёный фон, текст тёмный. Отвергнуты по очереди: подчёркивание,
//     блоки с серым фоном, голый оранжевый текст, скруглённые ячейки,
//     таблица с полной сеткой, ярко- и мягко-оранжевая заливка;
//   · без волны перехода: она только на страницы студии (PageTransition.tsx);
//   · в навбаре ни одна группа не подсвечена (Navbar.tsx, HELP_PAGES):
//     эти страницы общие для студии и магазина, где ты — видно по вкладкам.
//
// HelpPageHeader — общая шапка всех четырёх: вкладки, абзац, дата
// обновления. Отступы заданы ЗДЕСЬ, один раз, и страницы их не повторяют:
// 17.11 у каждой страницы был свой зазор между абзацем, датой и первым
// разделом, и владелец увидел разницу. Тело страницы — HELP_BODY ниже.

const TABS = [
  { id: "faq", href: "/faq", label: "FAQ" },
  { id: "wiki", href: "/wiki", label: "Wiki" },
  { id: "terms", href: "/terms", label: "Terms of Service" },
  { id: "privacy", href: "/privacy", label: "Privacy Policy" },
] as const;

export type HelpTabId = (typeof TABS)[number]["id"];

/** Контейнер тела справочной страницы: та же ширина, что у шапки, разделы через одинаковый зазор. */
export const HELP_BODY = "mx-auto max-w-6xl space-y-14 px-6 pb-16 sm:pb-24";

/** Заголовок раздела внутри справочной страницы — «длинный документ», без sm:-шага (DESIGN.md → «Типографика»). */
export const HELP_H2 = "scroll-mt-24 text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50";

/**
 * Карточки в конце справочной страницы (Terms, Privacy): парой в ряд, а не
 * одной во всю ширину (17.11, владелец). На телефоне — друг под другом.
 */
export const HELP_CARDS = "grid gap-4 sm:grid-cols-2";
export const HELP_CARD =
  "rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 dark:border-zinc-800 dark:bg-zinc-900";
export const HELP_CARD_TITLE = "mt-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50";

export function HelpTabs({ active }: { active: HelpTabId }) {
  return (
    <nav aria-label="Help and legal pages">
      {/* 17.11, шестой заход (владелец): без верхней и нижней линии —
          только вертикальные разделители между ячейками, тёмно-серые
          (zinc-500). Соседние рамки ложатся в одну приёмом «-1px» по
          горизонтали. Активная — зелёная (lime): оранжевый на сайте —
          цвет главных кнопок, и вкладка в нём спорила бы с ними. */}
      <ul className="grid grid-cols-2 pl-px lg:grid-cols-4">
        {TABS.map((tab) => {
          const on = tab.id === active;
          return (
            <li key={tab.id} className="-ml-px">
              <Link
                href={tab.href}
                aria-current={on ? "page" : undefined}
                className={`relative block border-x px-4 py-6 text-center text-lg font-extrabold tracking-tight text-zinc-900 transition-colors sm:py-8 sm:text-xl lg:text-2xl ${
                  on
                    ? "z-10 border-lime-400 bg-lime-300 dark:border-lime-700 dark:bg-lime-800 dark:text-lime-50"
                    : "border-zinc-500 hover:bg-lime-100 dark:border-zinc-500 dark:text-zinc-100 dark:hover:bg-lime-950"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function HelpPageHeader({
  active,
  title,
  updated,
  children,
}: {
  active: HelpTabId;
  /** Имя страницы для h1 (sr-only) — то же, что в metadata.title. */
  title: string;
  /** «17 November 2026» — дата последней правки текста страницы. */
  updated: string;
  /** Абзац под вкладками. */
  children: React.ReactNode;
}) {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-10 pt-20 sm:pb-14">
      <PageGlow color="rgba(251,146,60,0.35)" />
      <HelpTabs active={active} />
      <h1 className="sr-only">{title}</h1>
      <p className="mt-8 max-w-3xl text-zinc-600 dark:text-zinc-400">{children}</p>
      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Last updated: {updated}</p>
    </section>
  );
}
