import Link from "next/link";
import {
  getOverview,
  getFunnel,
  formatMoney,
  resolveRange,
  type Funnel,
  type Range,
} from "@/lib/analytics";
import { SalesChart } from "@/components/SalesChart";
import { PeriodPicker } from "@/components/PeriodPicker";
import { INLINE_LINK, NEW_TAB } from "@/components/Button";
import { creatorHref } from "@/lib/creators";
import { formatDayMonthYear } from "@/lib/dates";

// Сводка — она же корневая страница админки.
//
// Раньше /admin отдавал 404: разделы существовали, а входа не было, и
// адрес приходилось помнить целиком. Теперь здесь общая картина, а
// разделы — ссылками из шапки.
export const dynamic = "force-dynamic";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const range = resolveRange(await searchParams);
  const overview = await getOverview(range);
  // Число заказов берём из сводки, а не считаем второй раз: два места,
  // считающие одно и то же, рано или поздно ответят по-разному.
  const funnel = overview ? await getFunnel(range, overview.orders) : null;

  if (!overview) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Overview
        </h1>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Sales data is unavailable right now.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        Overview
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {formatRange(range)}
      </p>

      {/* Переключатель периода стоит НАД деньгами: он меняет и их тоже,
          а не только график, и внизу это читалось бы как «фильтр
          графика». */}
      <PeriodPicker range={range} />

      {/* Деньги — первым и крупно: это то, ради чего сюда заходят. */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Revenue" value={formatMoney(overview.revenueCents)} />
        <Stat label="Orders" value={String(overview.orders)} />
        <Stat
          label="Average order"
          value={formatMoney(overview.averageOrderCents)}
        />
        <Stat label="Buyers" value={String(overview.buyers)} />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Revenue per day
      </h2>
      <SalesChart days={overview.days} range={range} />

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <Panel title="Top maps">
          {overview.topProducts.length === 0 ? (
            <Empty>No sales yet.</Empty>
          ) : (
            <ol className="space-y-2">
              {overview.topProducts.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-zinc-700 dark:text-zinc-300">
                    {p.title}
                  </span>
                  <span className="shrink-0 font-medium text-zinc-950 dark:text-zinc-50">
                    {p.sales} · {formatMoney(p.revenueCents)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        {/* Только те, у кого есть карты, и только пятеро — остальные
            обладатели права загрузки сюда не попадают вовсе. */}
        <Panel title="Creators with maps">
          {overview.topCreators.length === 0 ? (
            <Empty>Nobody has published a map yet.</Empty>
          ) : (
            <ol className="space-y-2">
              {overview.topCreators.map((c) => (
                <li key={c.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <Link
                    href={creatorHref(c.username)}
                    {...NEW_TAB}
                    className={`min-w-0 truncate ${INLINE_LINK}`}
                  >
                    {c.username}
                  </Link>
                  <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
                    {c.sales} sold · {c.maps}{" "}
                    {c.maps === 1 ? "map" : "maps"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        From the storefront to a map
      </h2>
      <FunnelPanel funnel={funnel} />

      {/* Состояние площадки — не деньги, поэтому ниже и мельче. Числа
          кликабельны: увидел «3 waiting» — сразу пошёл разбирать. */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Live maps" value={String(overview.liveMaps)} />
        <Stat
          label="In review"
          value={String(overview.pendingMaps)}
          href="/admin/moderation"
        />
        {/* Считаются аккаунты с правом загрузки (profiles.is_creator), а
            не авторы карт на витрине — числа с панелью «Creators with
            maps» выше расходятся законно: право есть у всех одобренных,
            карты пока у одного. Плитка называлась «Can upload» именно
            поэтому, но владелец просит «Creators» (2026-08-14): под
            заголовком раздела Creators в шапке админки это то же самое
            множество людей, и два разных слова про одно путали сильнее,
            чем расхождение чисел. */}
        <Stat
          label="Creators"
          value={String(overview.creators)}
          href="/admin/applications"
        />
        <Stat label="Users" value={String(overview.accounts)} />
      </div>

      {/* Удалённые — отдельной строкой и РАЗДЕЛЬНО по тому, кто удалил.
          Одно число на оба случая ничего не значит: «авторы передумали»
          и «мы сняли за нарушения» — разные события, и растут они по
          разным причинам. Обе плитки ведут в каталог с готовым фильтром,
          чтобы от числа можно было сразу перейти к списку. */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Deleted by authors"
          value={String(overview.deletedByAuthor)}
          href="/admin/products?state=deleted"
        />
        <Stat
          label="Removed by site"
          value={String(overview.deletedBySite)}
          href="/admin/products?state=deleted"
        />
      </div>
    </div>
  );
}

/** «1 Aug 2026 – 14 Aug 2026 · 14 days» — период словами под заголовком. */
function formatRange(range: Range): string {
  const day = (key: string) => formatDayMonthYear(`${key}T00:00:00Z`);

  return `${day(range.from)} – ${day(range.to)} · ${range.days} ${
    range.days === 1 ? "day" : "days"
  }`;
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
    </>
  );

  const className =
    "rounded-2xl border border-zinc-200 px-4 py-3 dark:border-zinc-800";

  return href ? (
    <Link href={href} className={`${className} block transition-colors hover:border-orange-500`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/**
 * Воронка витрины.
 *
 * ⚠️ ПОДПИСИ ЗДЕСЬ ВАЖНЕЕ ЧИСЕЛ, и они намеренно длиннее обычного.
 * Единица счёта — браузер, а не человек: телефон и ноутбук одного
 * покупателя это двое. И шаг тут ровно один — «витрина → карта»,
 * посчитанный по одному и тому же браузеру. Покупки стоят рядом
 * отдельным числом и НЕ делятся на предыдущее: у заказа нет id
 * посетителя, связать покупку с браузером нечем, и «конверсия» из
 * двух разных единиц была бы выдумкой с двумя знаками после запятой.
 */
function FunnelPanel({ funnel }: { funnel: Funnel | null }) {
  if (!funnel) {
    return (
      <div className="mt-4">
        <Empty>
          View data is unavailable. If this is a fresh database, the
          funnel_counts migration has not been run yet.
        </Empty>
      </div>
    );
  }

  const steps = [
    { label: "Opened the storefront", value: funnel.storefront },
    { label: "Opened a map page", value: funnel.products },
    { label: "Did both", value: funnel.both },
  ];
  // Шкала — от самого большого шага, а не от суммы: полоска должна
  // показывать долю от входа в воронку.
  const peak = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div className="mt-4 space-y-3">
      {steps.map((step) => (
        <div key={step.label}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">{step.label}</span>
            <span className="font-semibold text-zinc-950 dark:text-zinc-50">
              {step.value}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-950/[0.06] dark:bg-zinc-50/[0.08]">
            <div
              className="h-full rounded-full bg-orange-500 dark:bg-orange-400"
              style={{ width: `${Math.round((step.value / peak) * 100)}%` }}
            />
          </div>
        </div>
      ))}

      <div className="flex items-baseline justify-between border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
        <span className="text-zinc-700 dark:text-zinc-300">Paid orders</span>
        <span className="font-semibold text-zinc-950 dark:text-zinc-50">
          {funnel.orders}
        </span>
      </div>

      <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        Counted per browser, not per person — a phone and a laptop are two.
        The first three lines follow the same browser through the site.
        Orders are counted differently and are not a percentage of the
        lines above: an order carries no visitor id, so it cannot be tied
        back to a browser.
      </p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">{children}</p>
  );
}
