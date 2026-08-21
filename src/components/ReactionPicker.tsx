"use client";

import type { ReactionOption } from "@/lib/reactions";

// Выбор реакции автором — в формах загрузки и правки карты.
//
// Одна на карту, выбирается при публикации (решение владельца). Не набор
// смайликов под каждой картой, а один: тот, который автор считает
// подходящим своей работе. Посетители по нему жмут, как по лайку.
//
// Список приходит пропом, а не читается здесь: он живёт в базе
// (reaction_options), а форма клиентская. Тянуть его из браузера значило
// бы лишний запрос при каждом открытии формы ради данных, которые
// страница и так получила на сервере.

export function ReactionPicker({
  options,
  value,
  onChange,
}: {
  options: ReactionOption[];
  /** id выбранной реакции; null — без реакции. */
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  // Список пуст — миграция не прогнана или владелец всё удалил. Показывать
  // пустую секцию с заголовком незачем: это выглядит как поломка.
  if (options.length === 0) return null;

  return (
    <div>
      <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Reaction
      </span>
      <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
        One per map — visitors tap it like a like. Optional.
      </span>

      {/* radiogroup: выбор ОДИН из списка, и клавиатура со средством
          чтения должны понимать это сами. */}
      <div
        role="radiogroup"
        aria-label="Reaction"
        className="mt-2 flex flex-wrap gap-2"
      >
        {options.map((option) => {
          const active = value === option.id;
          return (
            // type="button" обязателен: кнопка без типа внутри <form>
            // считается submit, и выбор реакции отправлял бы карту.
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={option.label}
              title={option.label}
              // Повторное нажатие снимает выбор: иначе поставленную по
              // ошибке реакцию уже не убрать — у одиночного выбора нет
              // «пустого» пункта.
              onClick={() => onChange(active ? null : option.id)}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border text-lg transition ${
                active
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-zinc-950/[0.08] hover:border-zinc-400 dark:border-zinc-50/[0.08] dark:hover:border-zinc-600"
              }`}
            >
              {/* Картинка, если она есть, иначе символ. Обычный <img> —
                  реакции это маленькие гифки, а next/image убил бы
                  анимацию и потребовал бы домена в remotePatterns. */}
              {option.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={option.imageUrl}
                  alt=""
                  width={24}
                  height={24}
                  aria-hidden
                  className="h-6 w-6 object-contain"
                />
              ) : (
                <span aria-hidden>{option.emoji}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
