import { formatDayMonthYear } from "@/lib/dates";
import { formatFileSize } from "@/lib/product-specs";
import type { ProductSpecs as Specs } from "@/lib/products";

// Характеристики карты в правой колонке страницы товара.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ КОМПОНЕНТ. Страница товара и без того длинная, а этот
// блок — единственное место, где решается «что показывать, а что молча
// пропустить». Правило одно и оно важное: ПУСТОЕ ПОЛЕ НЕ ПОКАЗЫВАЕТСЯ
// ВОВСЕ. Строка «Theme: —» не сообщает ничего, кроме того, что автор
// поленился, и делает карточку похожей на анкету с пробелами. Карты,
// залитые до миграции 20260821130000, пусты целиком — у них блок просто
// не появится.
//
// Серверный компонент: ни состояния, ни обработчиков. "use client" здесь
// был бы платой за ничто.

/** Пилюля значения. Один вид на версии, режимы, темы и метки. */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
      {children}
    </span>
  );
}

/** Строка «название — набор пилюль». Пустой набор не рисуется. */
function SpecRow({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 py-2">
      <dt className="w-28 shrink-0 text-sm text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="flex flex-1 flex-wrap gap-1.5">
        {values.map((v) => (
          <Pill key={v}>{v}</Pill>
        ))}
      </dd>
    </div>
  );
}

/** Плитка с числом. Крупная цифра, мелкая подпись — как в Stats. */
function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
      <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

export function ProductSpecs({
  specs,
  updatedAt,
  salesCount,
  views,
}: {
  specs: Specs;
  /** Когда карту правили в последний раз (products.updated_at). */
  updatedAt: string | null;
  salesCount: number;
  /** Уникальные посетители страницы карты; 0 — счётчик недоступен. */
  views: number;
}) {
  const fileSize = formatFileSize(specs.fileSizeBytes);

  const tiles: { value: string; label: string }[] = [];

  // Просмотры первыми: это единственное число, которое есть у КАЖДОЙ
  // карты с первого дня, — остальные плитки у новой карты пусты.
  // Ноль не показываем: он значит не «никто не заходил» (кто-то уже
  // открыл эту самую страницу), а «счётчик недоступен».
  if (views > 0) {
    tiles.push({ value: views.toLocaleString("en-GB"), label: "Views" });
  }
  if (specs.publishedAt) {
    tiles.push({ value: formatDayMonthYear(specs.publishedAt), label: "Published" });
  }
  if (updatedAt) {
    tiles.push({ value: formatDayMonthYear(updatedAt), label: "Updated" });
  }
  if (fileSize) tiles.push({ value: fileSize, label: "File size" });
  tiles.push({
    value: String(salesCount),
    label: salesCount === 1 ? "Purchase" : "Purchases",
  });

  const rows: { label: string; values: string[] }[] = [
    // Тип и размер — одиночные значения, но показываем той же пилюлей:
    // разный вид у соседних строк читался бы как разный смысл, которого
    // здесь нет.
    { label: "Type", values: specs.mapType ? [specs.mapType] : [] },
    { label: "Game mode", values: specs.gameModes },
    { label: "Theme", values: specs.themes },
    { label: "Size", values: specs.mapSize ? [specs.mapSize] : [] },
    { label: "Formats", values: specs.fileFormats },
  ];

  const hasRows = rows.some((r) => r.values.length > 0);
  const hasVersions = specs.mcVersions.length > 0;
  const hasTags = specs.tags.length > 0;

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((t) => (
          <Tile key={t.label} value={t.value} label={t.label} />
        ))}
      </div>

      {hasVersions && (
        <div className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Supported versions
          </h2>
          {/* Формулировка не случайна. Площадка карты не запускает и
              совместимость не проверяет — это заявление автора, и читать
              его как нашу гарантию покупатель не должен. Дешевле сказать
              честно здесь, чем разбирать возврат потом. */}
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            As stated by the author
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {specs.mcVersions.map((v) => (
              <Pill key={v}>{v}</Pill>
            ))}
          </div>
        </div>
      )}

      {hasRows && (
        <div className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
          <dl className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map((r) => (
              <SpecRow key={r.label} label={r.label} values={r.values} />
            ))}
          </dl>
        </div>
      )}

      {hasTags && (
        <div className="flex flex-wrap gap-1.5">
          {specs.tags.map((t) => (
            <Pill key={t}>{t}</Pill>
          ))}
        </div>
      )}
    </div>
  );
}
