import Link from "next/link";
import { DownloadSimple, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { getDownloadEvents } from "@/lib/downloads";
import { INLINE_LINK, NEW_TAB } from "@/components/Button";
import { RefreshButton } from "@/components/RefreshButton";
import { LocalTime } from "@/components/LocalTime";

// Журнал скачиваний купленных карт (2026-09-26).
//
// ЗАЧЕМ. Когда покупатель оспаривает списание, Stripe даёт неделю-две
// на ответ, и главный довод по цифровому товару — «вот когда и с какого
// устройства он его скачал». Здесь этот довод ищется за секунду: у
// банка на руках почта, по почте и ищем.
//
// Строки пишет /api/download в момент клика по Download — не показа
// страницы (разбор в шапке миграции 20260926120000_download_events).
//
// Поиск — обычная GET-форма без JavaScript: ищут здесь редко и
// целенаправленно, и живой фильтр по мере набора ничего не добавил бы.
//
// Права проверяет layout админки.
export const dynamic = "force-dynamic";

const SOURCE_LABEL = {
  purchases: "My purchases",
  success: "After checkout",
} as const;

export default async function AdminDownloadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const events = await getDownloadEvents(query);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Downloads
        </h1>
        <RefreshButton label="Check for new downloads" />
      </div>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Every click on Download by a buyer. Use it as evidence when a payment
        is disputed.
      </p>

      <form method="get" className="relative mt-6">
        <MagnifyingGlass
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by buyer email or username"
          aria-label="Search by buyer email or username"
          className="w-full rounded-full border border-zinc-950/[0.08] py-2 pl-9 pr-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:bg-zinc-900"
        />
      </form>

      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        {query
          ? `${events.length} ${events.length === 1 ? "download" : "downloads"} matching “${query}”.`
          : events.length === 0
            ? "No downloads yet."
            : `Latest ${events.length} ${events.length === 1 ? "download" : "downloads"}.`}
        {query && (
          <>
            {" "}
            <Link href="/admin/downloads" className={INLINE_LINK}>
              Clear
            </Link>
          </>
        )}
      </p>

      {events.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-zinc-200 p-12 text-center dark:border-zinc-800">
          <DownloadSimple
            size={40}
            weight="duotone"
            className="mx-auto text-orange-500 dark:text-orange-400"
          />
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            {query
              ? "Nothing found. Check the spelling, or search by part of the email."
              : "Downloads of bought maps will show up here."}
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-2xl border border-zinc-200 p-4 text-sm sm:p-5 dark:border-zinc-800"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                  {event.title}
                </span>
                <span className="text-zinc-400 dark:text-zinc-600" aria-hidden>
                  ·
                </span>
                {/* Время с минутами: в споре спрашивают «до или после
                    того, как он написал в банк», и дня для этого мало. */}
                <LocalTime
                  value={event.createdAt}
                  shape="dayMonthYearTime"
                  className="text-zinc-500 dark:text-zinc-400"
                />
              </div>

              <p className="mt-1.5 text-zinc-700 dark:text-zinc-300">
                {event.username ? (
                  <>
                    <Link href={`/@${event.username}`} {...NEW_TAB} className={INLINE_LINK}>
                      {event.username}
                    </Link>{" "}
                    <span className="text-zinc-500 dark:text-zinc-400">
                      ({event.customerEmail})
                    </span>
                  </>
                ) : (
                  event.customerEmail
                )}
                <span className="text-zinc-500 dark:text-zinc-400">
                  {" "}
                  · from {SOURCE_LABEL[event.source]}
                </span>
              </p>

              {/* Отпечаток IP и браузер — мелко: их читают только в споре.
                  Первых 12 знаков хэша хватает, чтобы глазами увидеть
                  «тот же адрес» между строками. */}
              <p className="mt-1.5 break-all font-mono text-xs text-zinc-400 dark:text-zinc-500">
                IP #{event.ipHash.slice(0, 12)}
                {event.userAgent ? ` · ${event.userAgent}` : ""}
              </p>
              {event.orderId && (
                <p className="mt-0.5 break-all font-mono text-xs text-zinc-400 dark:text-zinc-500">
                  Order {event.orderId}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
