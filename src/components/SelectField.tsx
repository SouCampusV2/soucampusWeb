"use client";

import { useRef, useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import { useDismiss } from "@/lib/useDismiss";

// Выпадающий список в стиле форм сайта.
//
// ⚠️ ВНУТРИ — НАШ СПИСОК, А НЕ <select> (решение владельца 2026-09-06).
// Здесь до 6 сентября стоял настоящий `<select>`, и стоял по разумным
// доводам: клавиатура, поиск по первой букве, родное колесо выбора на
// телефоне — всё это нативный элемент даёт даром. Довод перевесила одна
// вещь, которую он отнимает: РАСКРЫТЫЙ СПИСОК РИСУЕТ ОПЕРАЦИОННАЯ
// СИСТЕМА, и покрасить его нельзя в принципе. Классы доходят до
// закрытого поля и обрываются на нём — список приезжает с системным
// выделением, системным шрифтом и белым фоном даже в тёмной теме. Это
// было единственное место интерфейса, где наши правила цвета просто не
// действовали.
//
// Владелец сказал это дважды: 26 августа про сортировку на витрине (там
// тогда же появился свой список) и 6 сентября про формы. Второй раз —
// это уже не вкус, а правило.
//
// ⚠️ И вот чем за это платят, чтобы через месяц не удивляться. Клавиатура
// здесь своя и неполная: Escape и клик мимо закрывают, а листать
// стрелками нельзя. Поиска по первой букве нет. На телефоне вместо
// родного колеса — обычный список. Понадобится клавиатура — дописывать
// СЮДА, а не заводить второй компонент: ровно так на сайте уже
// расползались семь копий градиента.
//
// Комментарий в MarketplaceFilters, объяснявший, почему здесь остаётся
// нативный список, снят в этой же правке. Пережившее правку объяснение
// опаснее отсутствующего — это на сайте проверено дважды.
//
// ⚠️ Пропа `required` здесь БОЛЬШЕ НЕТ, и это не упущение. У нативного
// <select> он что-то значил; у кнопки — нет: пустого состояния не
// бывает, в каждом списке первый вариант выбран изначально, а
// aria-required роль button не поддерживает. Проп, который ничего не
// делает, хуже отсутствующего — его читают как работающую проверку.
// Появится список, который можно оставить пустым, — проверку писать
// здесь и настоящую.
export function SelectField({
  id,
  label,
  hint,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useDismiss(ref, () => setOpen(false), { enabled: open });

  const current = options.find((option) => option.value === value);

  return (
    <div>
      {/* label больше не for: подписывать нечего — управляет кнопка, а не
          поле ввода. Связь сделана через aria-labelledby на кнопке, так
          что для чтения с экрана ничего не изменилось. */}
      <span
        id={`${id}-label`}
        className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
        {hint && (
          <span className="font-normal text-zinc-500 dark:text-zinc-400">
            {" "}
            {hint}
          </span>
        )}
      </span>

      <div ref={ref} className="relative">
        <button
          id={id}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={`${id}-label`}
          className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border bg-transparent py-3 pl-4 pr-4 text-left text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:text-zinc-50 ${
            open
              ? "border-orange-500 dark:border-orange-400"
              : "border-zinc-950/[0.08] dark:border-zinc-50/[0.08]"
          }`}
        >
          <span className="truncate">{current?.label ?? ""}</span>
          <CaretDown
            size={16}
            weight="bold"
            aria-hidden
            className={`shrink-0 text-zinc-400 transition-transform duration-200 dark:text-zinc-500 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          // Тот же рецепт стекла, что у выпадашки профиля в навбаре и у
          // сортировки на витрине (DESIGN.md → «Стекло»). max-h: длинный
          // список категорий должен прокручиваться сам, а не растягивать
          // форму.
          <ul
            role="listbox"
            aria-label={label}
            className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto overflow-x-hidden rounded-xl border border-white/60 bg-[#fbfbff]/95 py-1 shadow-xl shadow-zinc-950/10 backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-zinc-900/95"
          >
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-950/[0.05] dark:hover:bg-zinc-50/[0.06] ${
                      selected
                        ? "font-semibold text-orange-700 dark:text-orange-400"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {/* Галочка, а не только цвет: выбранное должно быть
                        видно и тому, кто не различает оранжевый. */}
                    {selected && <Check size={14} weight="bold" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
