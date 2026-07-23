import type { Metadata } from "next";
import Link from "next/link";
import {
  getPaidOrder,
  buildPaidOrderFromSession,
  recordPaidOrder,
  signedDownloadUrl,
  type PaidOrder,
} from "@/lib/orders";
import { Button } from "@/components/Button";
import { ClearCartOnSuccess } from "@/components/ClearCartOnSuccess";
import { DISCORD_INVITE } from "@/lib/site";

// Страница персональная (у каждого свой session_id в адресе) — кэшировать
// и предсобирать нечего, рендерится на каждый запрос.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order complete",
  // Персональная страница с временными ссылками — поисковику здесь
  // делать нечего, как на /terms.
  robots: { index: false, follow: false },
};

// Формат id Checkout Session ("cs_test_..." / "cs_live_..."). Всё, что
// не похоже, отбрасываем до похода в БД и Stripe.
const SESSION_ID_PATTERN = /^cs_[a-zA-Z0-9_]{10,250}$/;

/**
 * Ищет оплаченный заказ. Обычно его уже записал вебхук, но покупатель
 * может вернуться со Stripe РАНЬШЕ, чем вебхук дошёл (или в локальной
 * разработке вебхук вообще не настроен). Тогда спрашиваем Stripe
 * напрямую по секретному ключу — это наш сервер спрашивает Stripe, а не
 * браузер утверждает "я оплатил", верить можно — и записываем заказ
 * сами. recordPaidOrder идемпотентна, поэтому кто бы ни успел первым
 * (вебхук или эта страница), второй ничего не задвоит.
 */
async function findOrRecordOrder(sessionId: string): Promise<PaidOrder | null> {
  const existing = await getPaidOrder(sessionId);
  if (existing) return existing;

  let input;
  try {
    input = await buildPaidOrderFromSession(sessionId);
  } catch {
    // Несуществующий session_id — Stripe отвечает ошибкой при retrieve.
    // Для нас это просто "заказа нет", а не авария.
    return null;
  }
  if (!input) return null;

  await recordPaidOrder(input);
  return getPaidOrder(sessionId);
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  const order =
    sessionId && SESSION_ID_PATTERN.test(sessionId)
      ? await findOrRecordOrder(sessionId)
      : null;

  if (!order) {
    return (
      <main className="w-full mx-auto max-w-6xl flex-1 px-6 py-16 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Order not found
          </h1>
          <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-400">
            We couldn&apos;t confirm this payment. If you&apos;ve just paid, wait a
            few seconds and refresh this page. Still nothing? Reach out on
            Discord and we&apos;ll sort it out.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer">
              Contact on Discord
            </Button>
            <Button href="/shop" variant="secondary">
              Back to shop
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Подписываем ссылки при рендере: страница динамическая, обновление
  // страницы даёт свежие ссылки — отдельный маршрут скачивания не нужен.
  const items = await Promise.all(
    order.items.map(async (item) => ({
      ...item,
      downloadUrl: item.filePath ? await signedDownloadUrl(item.filePath) : null,
    }))
  );

  return (
    <main className="w-full mx-auto max-w-6xl flex-1 px-6 py-16 sm:py-28">
      <ClearCartOnSuccess />
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Thank you! 🎉
        </h1>
        <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-400">
          Payment confirmed. A receipt was sent to{" "}
          <span className="font-medium text-zinc-950 dark:text-zinc-50">
            {order.customerEmail}
          </span>
          . Your downloads are below — the links stay valid for about an hour,
          and refreshing this page issues fresh ones.
        </p>

        <ul className="mt-10 space-y-4">
          {items.map((item) => (
            <li
              key={item.title}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <div>
                <p className="font-semibold text-zinc-950 dark:text-zinc-50">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {(item.priceCents / 100).toLocaleString("en-US", {
                    style: "currency",
                    currency: order.currency,
                  })}
                </p>
              </div>
              {item.downloadUrl ? (
                <Button href={item.downloadUrl} size="sm">
                  Download
                </Button>
              ) : (
                // Файл ещё не загружен в Storage — честно говорим, как
                // получить покупку, а не показываем мёртвую кнопку.
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  File delivery via{" "}
                  <a
                    href={DISCORD_INVITE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-orange-600 underline decoration-2 underline-offset-4"
                  >
                    Discord
                  </a>
                </p>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm text-zinc-500 dark:text-zinc-400">
          Lost the link?{" "}
          <Link
            href="/contact"
            className="font-medium text-orange-600 underline decoration-2 underline-offset-4"
          >
            Contact us
          </Link>{" "}
          with your receipt email and we&apos;ll resend it.
        </p>
      </div>
    </main>
  );
}
