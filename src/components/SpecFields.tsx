"use client";

import {
  FILE_FORMATS,
  GAME_MODES,
  MAP_SIZES,
  MAP_TYPES,
  MC_VERSIONS,
  THEMES,
} from "@/lib/product-specs";
import type { ProductSpecs } from "@/lib/products";

// Характеристики карты в формах загрузки и правки.
//
// ОДИН КОМПОНЕНТ НА ОБЕ ФОРМЫ — намеренно. UploadMapForm и EditMapForm
// уже держат по своей копии галереи (~1000 строк на двоих, тех-долг
// записан в CLAUDE.md), и повторять ошибку ещё раз незачем: набор
// характеристик обязан совпадать у создания и правки до последнего
// пункта, иначе автор при первой же правке потеряет то, что выбрал при
// загрузке.
//
// Что автор ЗАПОЛНЯЕТ, а что считается само: file_size_bytes и
// published_at сюда не входят вовсе. Вес берётся из файла при загрузке,
// дату премьеры ставит база (триггер stamp_published_at). Спрошенное у
// человека число разъедется с реальностью при первой же замене файла.

/** Часть ProductSpecs, которую заполняет человек. */
export type EditableSpecs = Pick<
  ProductSpecs,
  "mcVersions" | "mapTypes" | "gameModes" | "themes" | "mapSize" | "fileFormats"
>;

export const EMPTY_SPECS: EditableSpecs = {
  mcVersions: [],
  mapTypes: [],
  gameModes: [],
  themes: [],
  mapSize: null,
  fileFormats: [],
};

/** Добавить/убрать значение из набора, сохраняя порядок словаря. */
function toggle(list: string[], value: string, order: readonly string[]): string[] {
  const next = list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
  // Пересортировка по словарю, а не «как нажимали»: иначе у двух карт с
  // одинаковым набором он покажется в разном порядке, и покупатель
  // решит, что наборы разные.
  return order.filter((v) => next.includes(v));
}

function Chip({
  label,
  active,
  onClick,
  disabled = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  /** Выбор исчерпан — пилюлю гасим, но с экрана не убираем. */
  disabled?: boolean;
}) {
  return (
    // type="button" обязателен: кнопка без типа внутри <form> считается
    // submit, и выбор темы отправлял бы карту на модерацию.
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300"
          : "border-zinc-950/[0.08] text-zinc-600 hover:border-zinc-400 dark:border-zinc-50/[0.08] dark:text-zinc-400 dark:hover:border-zinc-600"
      }`}
    >
      {label}
    </button>
  );
}

function Group({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      {hint && (
        <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
          {hint}
        </span>
      )}
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// Потолок набора типов. Дублирует ограничение в базе
// (20260906120000) НАМЕРЕННО: база решает, что можно сохранить, форма —
// что человек успеет попробовать. Здесь число ради подписи и гашения
// пилюль, а не ради защиты.
const MAX_MAP_TYPES = 3;

export function SpecFields({
  value,
  onChange,
}: {
  value: EditableSpecs;
  onChange: (next: EditableSpecs) => void;
}) {
  const set = (patch: Partial<EditableSpecs>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-6">
      <Group
        label="Supported versions"
        // Формулировка не случайна: площадка карты не запускает и
        // совместимость не проверяет. Автор должен понимать, что
        // отвечает за это заявление он, а не сайт.
        hint="Which versions you've confirmed this works on. Buyers see this as your word."
      >
        {MC_VERSIONS.map((v) => (
          <Chip
            key={v}
            label={v}
            active={value.mcVersions.includes(v)}
            onClick={() => set({ mcVersions: toggle(value.mcVersions, v, MC_VERSIONS) })}
          />
        ))}
      </Group>

      {/* До трёх (решение владельца 2026-09-06; было ровно одно).
          Потолок стоит и в базе — здесь он только чтобы человек упёрся
          в него до отправки, а не после отказа. */}
      <Group
        label="Type"
        hint={`Up to ${MAX_MAP_TYPES} — pick what it actually is.`}
      >
        {MAP_TYPES.map((t) => {
          const active = value.mapTypes.includes(t);
          return (
            <Chip
              key={t}
              label={t}
              active={active}
              // Четвёртый не выбирается молча: неотзывчивая пилюля
              // читается как поломка. Гасим её и объясняем подписью.
              disabled={!active && value.mapTypes.length >= MAX_MAP_TYPES}
              onClick={() =>
                set({ mapTypes: toggle(value.mapTypes, t, MAP_TYPES) })
              }
            />
          );
        })}
      </Group>

      <Group label="Game mode" hint="Pick any that fit.">
        {GAME_MODES.map((m) => (
          <Chip
            key={m}
            label={m}
            active={value.gameModes.includes(m)}
            onClick={() => set({ gameModes: toggle(value.gameModes, m, GAME_MODES) })}
          />
        ))}
      </Group>

      <Group label="Theme">
        {THEMES.map((t) => (
          <Chip
            key={t}
            label={t}
            active={value.themes.includes(t)}
            onClick={() => set({ themes: toggle(value.themes, t, THEMES) })}
          />
        ))}
      </Group>

      <Group label="Size">
        {MAP_SIZES.map((s) => (
          <Chip
            key={s}
            label={s}
            active={value.mapSize === s}
            onClick={() => set({ mapSize: value.mapSize === s ? null : s })}
          />
        ))}
      </Group>

      <Group label="File format" hint="What's actually inside the archive.">
        {FILE_FORMATS.map((f) => (
          <Chip
            key={f}
            label={f}
            active={value.fileFormats.includes(f)}
            onClick={() => set({ fileFormats: toggle(value.fileFormats, f, FILE_FORMATS) })}
          />
        ))}
      </Group>
    </div>
  );
}

/** Форма для записи в БД. Одна на обе формы — колонки не разъедутся. */
export function specsToColumns(specs: EditableSpecs) {
  return {
    mc_versions: specs.mcVersions,
    map_types: specs.mapTypes,
    game_modes: specs.gameModes,
    themes: specs.themes,
    map_size: specs.mapSize,
    file_formats: specs.fileFormats,
  };
}
