import { formatMoney, type DayPoint } from "@/lib/analytics";

// Продажи по дням — инлайновый SVG, без библиотеки графиков.
//
// Библиотеку не берём осознанно: 30 столбиков это десяток строк разметки,
// а любая charting-библиотека — сотни килобайт в бандл ради них. Правило
// из docs/IDEAS.md: тяжёлое подключать не раньше, чем станет понятно,
// какие графики реально смотрят.
//
// ЦВЕТ. Один ряд, поэтому легенда не нужна — заголовок и так называет,
// что показано. Оттенки взяты из нашей шкалы по правилу инверсии
// (DESIGN.md): orange-500 в светлой теме, orange-400 в тёмной. Прогон
// через валидатор палитр дал предупреждение по контрасту в светлой теме
// (2.73 против порога 3.0) — оно снимается «видимыми подписями или
// таблицей», и здесь есть и то, и другое: подпись у максимума и полная
// таблица под графиком. Проверка «полосы яркости» к одному ряду не
// относится: она про различимость НЕСКОЛЬКИХ категориальных цветов между
// собой, а различать здесь не с чем (сам валидатор оговаривает область
// применения).
//
// СТОЛБИКИ, А НЕ ЛИНИЯ: продажи по дням — величина за отдельный день, а
// не непрерывный процесс. У молодого магазина большинство дней нулевые, и
// линия между двумя далёкими покупками рисовала бы продажи там, где их не
// было.

const BAR_WIDTH = 8;
const BAR_GAP = 2; // зазор поверхностью между соседними столбиками
const CHART_HEIGHT = 96;
const RADIUS = 4; // скругление на «конце данных»

export function SalesChart({ days }: { days: DayPoint[] }) {
  const width = days.length * (BAR_WIDTH + BAR_GAP) - BAR_GAP;
  const peak = Math.max(...days.map((d) => d.revenueCents), 0);
  const peakIndex = days.findIndex((d) => d.revenueCents === peak && peak > 0);

  const total = days.reduce((sum, d) => sum + d.revenueCents, 0);

  if (peak === 0) {
    return (
      <p className="mt-6 rounded-2xl border border-dashed border-zinc-300 px-6 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No paid orders in the last {days.length} days yet.
      </p>
    );
  }

  return (
    <figure className="mt-6">
      <svg
        viewBox={`0 0 ${width} ${CHART_HEIGHT + 14}`}
        className="w-full"
        role="img"
        aria-label={`Revenue per day for the last ${days.length} days, ${formatMoney(total)} in total`}
      >
        {/* Базовая линия — приглушённая: это опора для чтения, а не данные. */}
        <line
          x1={0}
          y1={CHART_HEIGHT}
          x2={width}
          y2={CHART_HEIGHT}
          className="stroke-zinc-200 dark:stroke-zinc-800"
          strokeWidth={1}
        />

        {days.map((day, i) => {
          const x = i * (BAR_WIDTH + BAR_GAP);
          const height = peak > 0 ? (day.revenueCents / peak) * CHART_HEIGHT : 0;

          return (
            <g key={day.date} className="group">
              {/* Прозрачная зона нажатия во всю высоту: попасть курсором в
                  столбик высотой 3px невозможно, а навести на день — нужно. */}
              <rect
                x={x}
                y={0}
                width={BAR_WIDTH + BAR_GAP}
                height={CHART_HEIGHT}
                fill="transparent"
              />
              {day.revenueCents > 0 && (
                <rect
                  x={x}
                  y={CHART_HEIGHT - height}
                  width={BAR_WIDTH}
                  height={height}
                  rx={Math.min(RADIUS, height / 2)}
                  className="fill-orange-500 dark:fill-orange-400"
                />
              )}

              {/* Подпись по наведению. Отдельным текстом, а не браузерным
                  title: тот появляется через секунду и на графике из
                  тридцати столбиков делает просмотр мучительным. */}
              <text
                x={Math.min(Math.max(x, 24), width - 24)}
                y={10}
                textAnchor="middle"
                className="pointer-events-none fill-zinc-950 text-[9px] font-semibold opacity-0 transition-opacity group-hover:opacity-100 dark:fill-zinc-50"
              >
                {new Date(day.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
                {" · "}
                {formatMoney(day.revenueCents)}
              </text>
            </g>
          );
        })}

        {/* Подпись у максимума — постоянная: она даёт шкалу, без которой
            столбики показывают только форму, но не величину. */}
        {peakIndex >= 0 && (
          <text
            x={Math.min(
              Math.max(peakIndex * (BAR_WIDTH + BAR_GAP), 20),
              width - 20
            )}
            y={CHART_HEIGHT + 12}
            textAnchor="middle"
            className="fill-zinc-500 text-[9px] dark:fill-zinc-400"
          >
            peak {formatMoney(peak)}
          </text>
        )}
      </svg>

      <figcaption className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {new Date(days[0].date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
        <span>today</span>
      </figcaption>

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
          </tbody>
        </table>
      </details>
    </figure>
  );
}
