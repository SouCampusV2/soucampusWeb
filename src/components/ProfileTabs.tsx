"use client";

import { useState } from "react";

// Вкладки под шапкой профиля — вариант 8 лаборатории (выбор владельца
// 26.10): цифра — это заголовок раздела («Maps 2»), а не отдельный факт
// в углу шапки.
//
// Переключение — на клиенте, а не адресом (?tab=): проп searchParams
// сделал бы статическую страницу профиля динамической (разбор 11.09 в
// CLAUDE.md, /portfolio/[slug]). Все панели при этом рисует СЕРВЕР и все
// лежат в HTML — неактивные скрыты атрибутом hidden. Поиск видит каждую,
// а без JS открыта первая.

export type ProfileTab = {
  id: string;
  label: string;
  /** Счётчик на вкладке; undefined — без счётчика (About). */
  count?: number;
  content: React.ReactNode;
};

export function ProfileTabs({ tabs }: { tabs: ProfileTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div className="mt-10">
      {/* Серая линия — отдельная полоска ПОД вкладками, а не border-b
          строки с -mb-px у вкладки (так было до 26.10). overflow-x-auto
          делает и вертикаль прокручиваемой, и вылезающий на 1px край
          подчёркивания рисовал справа полосу прокрутки со стрелками.
          Теперь подчёркивание лежит поверх линии, не выходя за строку.
          Полоса прокрутки скрыта и по горизонтали: не влезшие вкладки
          листаются пальцем или колёсиком, полоса им не нужна. */}
      <div className="relative">
        <div className="absolute inset-x-0 bottom-0 h-px bg-zinc-200 dark:bg-zinc-800" aria-hidden />
      <div
        role="tablist"
        className="relative flex gap-6 overflow-x-auto [scrollbar-width:none] sm:gap-8 [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={`shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors ${
                selected
                  ? "border-orange-500 text-zinc-950 dark:border-orange-400 dark:text-zinc-50"
                  : "border-transparent text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 rounded-full bg-zinc-950/[0.06] px-2 py-0.5 text-xs dark:bg-zinc-50/[0.08]">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
          className="mt-8"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
