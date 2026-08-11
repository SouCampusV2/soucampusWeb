import Link from "next/link";
import { getOverview, formatMoney, WINDOW_DAYS } from "@/lib/analytics";
import { SalesChart } from "@/components/SalesChart";
import { INLINE_LINK, NEW_TAB } from "@/components/Button";
import { creatorHref } from "@/lib/creators";

// Сводка — она же корневая страница админки.
//
// Раньше /admin отдавал 404: разделы существовали, а входа не было, и
// адрес приходилось помнить целиком. Теперь здесь общая картина, а
// разделы — ссылками из шапки.
export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const overview = await getOverview();

  if (!overview) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
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
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        Overview
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Last {WINDOW_DAYS} days.
      </p>

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
      <SalesChart days={overview.days} />

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
                    href={creatorHref(c.displayName)}
                    {...NEW_TAB}
                    className={`min-w-0 truncate ${INLINE_LINK}`}
                  >
                    {c.displayName}
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

      {/* Состояние площадки — не деньги, поэтому ниже и мельче. Числа
          кликабельны: увидел «3 waiting» — сразу пошёл разбирать. */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Live maps" value={String(overview.liveMaps)} />
        <Stat
          label="In review"
          value={String(overview.pendingMaps)}
          href="/admin/moderation"
        />
        {/* «Могут выкладывать», а не «Creators»: считаются аккаунты с
            правом загрузки (profiles.is_creator), а не авторы карт на
            витрине. Числа расходятся законно и сильно — право есть у
            всех одобренных, карты пока у одного, — но под общим словом
            «Creators» это читалось как ошибка данных. */}
        <Stat
          label="Can upload"
          value={String(overview.creators)}
          href="/admin/applications"
        />
        <Stat label="Accounts" value={String(overview.accounts)} />
      </div>
    </div>
  );
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
