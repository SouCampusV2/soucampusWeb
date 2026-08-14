import { formatMoney, type DayPoint, type Range } from "@/lib/analytics";

// Продажи по дням — инлайновый SVG, без библиотеки графиков.
//
// Библиотеку не берём осознанно: тридцать столбиков это десяток строк
// разметки, а любая charting-библиотека — сотни килобайт в бандл ради них.
// Правило из docs/IDEAS.md: тяжёлое подключать не раньше, чем станет
// понятно, какие графики реально смотрят.
//
// ЧТО ИЗМЕНИЛОСЬ (2026-08-14, по замечанию владельца). Первая версия
// рисовала голые столбики на одной базовой линии: без сетки, без шкалы
// денег и без единой даты, кроме двух подписей по краям. Форму она
// показывала, а величину — нет: чтобы понять, сколько принёс столбик,
// приходилось наводить курсор на каждый по очереди. Теперь есть
// горизонтальная сетка с подписями в евро (значение читается по высоте,
// без наведения), вертикальные засечки с датами (видно, КОГДА была
// продажа) и подсветка дня под курсором.
//
// ЦВЕТ. Один ряд, поэтому легенда не нужна — заголовок и так называет,
// что показано. Оттенки по правилу инверсии из DESIGN.md: orange-500 в
// светлой теме, orange-400 в тёмной. Сетка намеренно бледнее данных: она
// опора для чтения, а не сами данные, и не должна спорить со столбиками.
//
// СТОЛБИКИ, А НЕ ЛИНИЯ: продажи по дням — величина за отдельный день, а
// не непрерывный процесс. У молодого магазина большинство дней нулевые, и
// линия между двумя далёкими покупками рисовала бы продажи там, где их не
// было.
//
// Координаты в SVG фиксированные, наружу растягивается вся картинка
// целиком (`w-full`) — поэтому подписи масштабируются вместе с графиком и
// не наезжают друг на друга ни на телефоне, ни на широком мониторе.

const WIDTH = 760;
const HEIGHT = 260;
const PAD = { top: 16, right: 12, bottom: 28, left: 56 };

const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

/** Сколько горизонтальных линий сетки, не считая нулевой. */
const GRID_LINES = 4;
/** Больше этого числа подписей дат по низу не помещается. */
const MAX_DATE_LABELS = 8;

export function SalesChart({ days, range }: { days: DayPoint[]; range: Range }) {
  const peak = Math.max(...days.map((d) => d.revenueCents), 0);
  const total = days.reduce((sum, d) => sum + d.revenueCents, 0);

  if (peak === 0) {
    return (
      <p className="mt-6 rounded-2xl border border-dashed border-zinc-300 px-6 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No paid orders between {formatDay(range.from)} and {formatDay(range.to)}.
      </p>
    );
  }

  // Потолок шкалы округляем вверх до «круглого» числа. Иначе верхняя
  // линия сетки подписана вроде «€37.40» — число, которое ничего не
  // значит и мешает прикидывать промежуточные значения на глаз.
  const top = niceCeil(peak);
  const slot = PLOT_W / days.length;
  const barWidth = Math.max(2, Math.min(slot - 2, slot * 0.72));

  const y = (cents: number) => PAD.top + PLOT_H - (cents / top) * PLOT_H;

  // Через сколько дней ставить подпись с датой. Шаг, а не «каждый N-й по
  // счёту»: при 365 днях подписей должно остаться столько же, сколько при
  // семи, иначе они слипаются в серую полосу.
  const labelStep = Math.max(1, Math.ceil(days.length / MAX_DATE_LABELS));

  return (
    <figure className="mt-4">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Revenue per day from ${formatDay(range.from)} to ${formatDay(range.to)}, ${formatMoney(total)} in total`}
      >
        {/* Горизонтальная сетка + шкала денег слева. */}
        {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
          const value = (top / GRID_LINES) * i;
          const lineY = y(value);
          const isBase = i === 0;

          return (
            <g key={value}>
              <line
                x1={PAD.left}
                y1={lineY}
                x2={WIDTH - PAD.right}
                y2={lineY}
                className={
                  isBase
                    ? "stroke-zinc-300 dark:stroke-zinc-700"
                    : "stroke-zinc-200 dark:stroke-zinc-800"
                }
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={lineY + 3}
                textAnchor="end"
                className="fill-zinc-500 text-[10px] dark:fill-zinc-400"
              >
                {formatMoney(value)}
              </text>
            </g>
          );
        })}

        {days.map((day, i) => {
          const x = PAD.left + i * slot;
          const barX = x + (slot - barWidth) / 2;
          const barTop = y(day.revenueCents);
          const height = PAD.top + PLOT_H - barTop;
          const showLabel = i % labelStep === 0 || i === days.length - 1;

          return (
            <g key={day.date} className="group">
              {/* Вертикальная засечка под подписанными днями — по ней
                  глаз соотносит столбик с датой на длинных периодах. */}
              {showLabel && (
                <line
                  x1={x + slot / 2}
                  y1={PAD.top}
                  x2={x + slot / 2}
                  y2={PAD.top + PLOT_H}
                  className="stroke-zinc-200 dark:stroke-zinc-800"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                />
              )}

              {/* Прозрачная зона нажатия во всю высоту: попасть курсором в
                  столбик высотой 3px невозможно, а навести на день — нужно. */}
              <rect
                x={x}
                y={PAD.top}
                width={slot}
                height={PLOT_H}
                className="fill-transparent group-hover:fill-zinc-950/[0.04] dark:group-hover:fill-zinc-50/[0.06]"
              />

              {day.revenueCents > 0 && (
                <rect
                  x={barX}
                  y={barTop}
                  width={barWidth}
                  height={height}
                  rx={Math.min(3, barWidth / 2, height / 2)}
                  className="fill-orange-500 dark:fill-orange-400"
                />
              )}

              {showLabel && (
                <text
                  x={x + slot / 2}
                  y={HEIGHT - 10}
                  textAnchor="middle"
                  className="fill-zinc-500 text-[10px] dark:fill-zinc-400"
                >
                  {formatDay(day.date)}
                </text>
              )}

              {/* Подпись по наведению. Своим текстом, а не браузерным
                  title: тот появляется через секунду и на графике из
                  тридцати столбиков делает просмотр мучительным. Плашка
                  под текстом обязательна — иначе он ложится поверх сетки
                  и столбиков и не читается. */}
              <Tooltip
                x={x + slot / 2}
                text={`${formatDay(day.date)} · ${formatMoney(day.revenueCents)}${
                  day.orders > 0 ? ` · ${day.orders} ${day.orders === 1 ? "order" : "orders"}` : ""
                }`}
              />
            </g>
          );
        })}
      </svg>

      {/* Таблица — не запасной вариант, а обязательная часть: график
          читается глазами, а числа нужны точные, и скринридеру SVG
          рассказать нечего. */}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-orange-600 hover:underline dark:text-orange-400">
          Show the numbers
        </summary>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 dark:text-zinc-400">
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 font-medium">Orders</th>
              <th className="py-1 text-right font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {days
              .filter((d) => d.orders > 0)
              .map((day) => (
                <tr key={day.date} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="py-1 text-zinc-700 dark:text-zinc-300">
                    {new Date(day.date).toLocaleDateString()}
                  </td>
                  <td className="py-1 text-zinc-700 dark:text-zinc-300">{day.orders}</td>
                  <td className="py-1 text-right font-medium text-zinc-950 dark:text-zinc-50">
                    {formatMoney(day.revenueCents)}
                  </td>
                </tr>
              ))}
            <tr className="border-t border-zinc-300 dark:border-zinc-700">
              <td className="py-1 font-medium text-zinc-950 dark:text-zinc-50">Total</td>
              <td className="py-1 font-medium text-zinc-950 dark:text-zinc-50">
                {days.reduce((sum, d) => sum + d.orders, 0)}
              </td>
              <td className="py-1 text-right font-medium text-zinc-950 dark:text-zinc-50">
                {formatMoney(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/**
 * Плашка с подписью дня. Ширина считается из длины строки: в SVG нет
 * авто-подгонки фона под текст, а мерить его по-настоящему можно только
 * в браузере — здесь же всё рендерится на сервере.
 */
function Tooltip({ x, text }: { x: number; text: string }) {
  const width = text.length * 5.6 + 14;
  // Не даём плашке уехать за край картинки — у крайних дней она иначе
  // обрезается ровно там, где написана сумма.
  const left = Math.min(Math.max(x - width / 2, PAD.left), WIDTH - PAD.right - width);

  return (
    <g className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100">
      <rect
        x={left}
        y={0}
        width={width}
        height={18}
        rx={9}
        className="fill-zinc-950 dark:fill-zinc-50"
      />
      <text
        x={left + width / 2}
        y={12}
        textAnchor="middle"
        className="fill-zinc-50 text-[10px] font-semibold dark:fill-zinc-950"
      >
        {text}
      </text>
    </g>
  );
}

/** «2026-08-14» → «Aug 14». Год не пишем: он есть в подписи периода. */
function formatDay(key: string): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Ближайшее «круглое» число вверх: 1·10ⁿ, 2·10ⁿ или 5·10ⁿ. */
function niceCeil(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}
