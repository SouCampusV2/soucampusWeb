"use client";

import { useRef, useState } from "react";
import { NAME_COLORS } from "@/lib/name-colors";
import { useDismiss } from "@/lib/useDismiss";

// Выбор цвета ника — квадратик у поля ника, по нажатию открывается
// небольшая карточка.
//
// ПОЧЕМУ НЕ ПРОСТО РЯД КРУЖКОВ В ФОРМЕ (решение владельца 2026-08-21).
// Девять кружков плюс два предпросмотра занимали в форме больше места,
// чем имя, фамилия и биография вместе, — и это при том, что цвет
// выбирают один раз в жизни. Поповер оставляет привилегию на виду
// (квадратик показывает текущий цвет), но не заставляет всех листать
// её при каждой правке профиля.
//
// ЧТО ЭТОТ КОМПОНЕНТ НЕ РЕШАЕТ. Право поставить цвет держит триггер
// protect_name_color в базе (миграция 20260820130000). Здесь ничего не
// проверяется и проверяться не должно: форма пишет в profiles ПРЯМО ИЗ
// БРАУЗЕРА, и любая проверка на этой стороне — украшение, которое
// обходится запросом из консоли.

export function NameColorPicker({
  value,
  onChange,
  previewName,
}: {
  /** Текущий цвет; пустая строка — «без цвета». */
  value: string;
  onChange: (value: string) => void;
  /** Что писать в предпросмотре — ник, каким он введён прямо сейчас. */
  previewName: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // Закрытие по клику мимо и по Esc. Слушать надо document, а не сам
  // компонент: событие происходит ВНЕ него, и onBlur здесь не годится —
  // он не отличит «ушёл совсем» от «перешёл на кружок внутри карточки».
  useDismiss(wrap, () => setOpen(false), { enabled: open });

  return (
    <div ref={wrap} className="relative">
      {/* type="button" обязателен: внутри <form> кнопка без типа
          считается submit, и открытие палитры отправляло бы форму. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Name colour"
        title="Name colour"
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-950/[0.08] transition hover:border-zinc-400 dark:border-zinc-50/[0.08] dark:hover:border-zinc-600"
      >
        <span
          className="h-5 w-5 rounded-md border border-black/10 dark:border-white/10"
          style={{ backgroundColor: value || "transparent" }}
        >
          {/* Без цвета кружок пуст, и пустой квадрат читается как
              поломка. Буква «A» говорит «обычный ник» — то же, что и в
              самой палитре ниже. */}
          {!value && (
            <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
              A
            </span>
          )}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Name colour"
          // right-0 — карточка растёт ВЛЕВО от квадратика: сам он стоит у
          // правого края формы, и раскрытие вправо ушло бы за экран.
          className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-zinc-200 bg-[#fbfbff] p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Name colour
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Yours because you bought a map
          </p>

          {/* radiogroup, а не набор кнопок: выбор ОДИН из списка, и
              клавиатура со средством чтения должны понимать это сами. */}
          <div
            role="radiogroup"
            aria-label="Name colour"
            className="mt-3 flex flex-wrap items-center gap-2"
          >
            {/* «Без цвета» стоит первым: отказаться от украшения должно
                быть так же просто, как выбрать. */}
            <button
              type="button"
              role="radio"
              aria-checked={value === ""}
              aria-label="Default"
              onClick={() => onChange("")}
              className={`h-8 w-8 rounded-full border-2 text-xs font-semibold transition ${
                value === ""
                  ? "border-zinc-950 dark:border-zinc-50"
                  : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
              } bg-zinc-950/[0.06] text-zinc-600 dark:bg-zinc-50/[0.08] dark:text-zinc-300`}
            >
              A
            </button>

            {NAME_COLORS.map((colour) => (
              <button
                key={colour.value}
                type="button"
                role="radio"
                aria-checked={value === colour.value}
                aria-label={colour.label}
                title={colour.label}
                onClick={() => onChange(colour.value)}
                className={`h-8 w-8 rounded-full border-2 transition ${
                  value === colour.value
                    ? "border-zinc-950 dark:border-zinc-50"
                    : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
                style={{ backgroundColor: colour.value }}
              />
            ))}
          </div>

          {/* Предпросмотр на обоих фонах сразу. Палитра подобрана так, что
              читается в обеих темах, — но увидеть это своими глазами всё
              равно полезнее, чем поверить на слово. Почему именно эти
              восемь и какой у них контраст — в lib/name-colors.ts. */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <span className="truncate rounded-lg bg-[#fbfbff] px-3 py-1.5 text-center text-sm font-semibold ring-1 ring-black/5">
              <span style={value ? { color: value } : { color: "#09090b" }}>
                {previewName || "Your name"}
              </span>
            </span>
            <span className="truncate rounded-lg bg-zinc-950 px-3 py-1.5 text-center text-sm font-semibold ring-1 ring-white/10">
              <span style={value ? { color: value } : { color: "#fafafa" }}>
                {previewName || "Your name"}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
