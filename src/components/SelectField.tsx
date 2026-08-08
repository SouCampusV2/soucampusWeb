"use client";

import { CaretDown } from "@phosphor-icons/react";

// Выпадающий список в стиле форм сайта.
//
// Внутри — НАСТОЯЩИЙ <select>, а не самодельный список на div'ах. Так
// бесплатно достаются вещи, которые в самоделке пришлось бы писать
// руками и всё равно писать хуже: клавиатура, поиск по первой букве,
// нативная прокрутка длинного списка и, главное, родное колесо выбора
// на телефоне вместо крошечных пунктов.
//
// Своё здесь только оформление: рамка и фокус те же, что у AuthField,
// стрелка нарисована нашей иконкой (appearance-none убирает системную).
export function SelectField({
  id,
  label,
  hint,
  value,
  onChange,
  options,
  required,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
        {hint && (
          <span className="font-normal text-zinc-500 dark:text-zinc-400">
            {" "}
            {hint}
          </span>
        )}
      </label>
      <div className="relative">
        <select
          id={id}
          name={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full cursor-pointer appearance-none rounded-2xl border border-zinc-950/[0.08] bg-transparent py-3 pl-4 pr-11 text-sm text-zinc-950 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50"
        >
          {options.map((option) => (
            // Пункты рисует система, и наши классы к ним почти не
            // применяются — но фон задать нужно, иначе в тёмной теме
            // на некоторых платформах список выходит белым на белом.
            <option
              key={option.value}
              value={option.value}
              className="bg-[#fbfbff] text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50"
            >
              {option.label}
            </option>
          ))}
        </select>
        <CaretDown
          size={16}
          weight="bold"
          aria-hidden
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
        />
      </div>
    </div>
  );
}
