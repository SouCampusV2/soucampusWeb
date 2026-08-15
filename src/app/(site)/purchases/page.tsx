import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Unbounded } from "next/font/google";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/current-user";
import { getPurchasesForUser, signedDownloadUrl, downloadFileName } from "@/lib/orders";
import { readUserRatings } from "@/lib/ratings";
import { RatingStars } from "@/components/RatingStars";
import { PageGlow } from "@/components/PageGlow";
import { BUTTON_COLORS } from "@/components/Button";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My purchases",
  robots: { index: false },
};

// Личная страница — не кэшируем, гасим унаследованный от (site)
// revalidate = 60 (подробно — в notifications/page.tsx). Покупка
// появляется по вебхуку Stripe, то есть тоже без участия смотрящего.
export const dynamic = "force-dynamic";

// Только покупки — ни карточки профиля, ни его редактирования (просьба
// владельца 2026-07-30). Раньше всё это жило одной страницей /profile, и
// пункт меню «My purchases» вёл на страницу, где покупки были третьим
// блоком сверху. Профиль теперь редактируется в /settings, свои карты —
// в /resources, здесь только купленное.
export default async function PurchasesPage() {
  const supabase = await createSupabaseServer();
  const user = await getCurrentUser(supabase);

  if (!user) {
    redirect("/login?next=/purchases");
  }

  // Подписанные ссылки на скачивание — живут час; обновил страницу,
  // получил свежие (страница динамическая).
  const purchases = await getPurchasesForUser(user.id, user.email ?? "");
  const downloads = await Promise.all(
    purchases.map(async (p) => ({
      ...p,
      url: p.filePath
        ? await signedDownloadUrl(p.filePath, downloadFileName(p.title, p.filePath))
        : null,
    }))
  );

  // Свои оценки — чтобы подсветить уже выставленные звёзды.
  const userRatings = await readUserRatings(supabase, user.id);

  return (
    <main className="relative w-full overflow-x-clip px-6">
      <PageGlow color="rgba(249,115,22,0.28)" />
      <section className="relative pb-28 pt-20">
        <div className="mx-auto max-w-2xl">
          <h1
            className={`${displayFont.className} text-center text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
          >
            My purchases
          </h1>

          {downloads.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-zinc-200 bg-[#fbfbff] p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                You haven&apos;t bought any maps yet.
              </p>
              <Link
                href="/marketplace"
                className="mt-3 inline-block text-sm font-semibold text-orange-500 underline decoration-2 underline-offset-4 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-500"
              >
                Browse the marketplace
              </Link>
            </div>
          ) : (
            <ul className="mt-10 space-y-3">
              {downloads.map((item) => (
                <li
                  key={item.productId}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-[#fbfbff] px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="min-w-0">
                    {item.slug ? (
                      <Link
                        href={`/marketplace/${item.slug}`}
                        className="truncate font-semibold text-zinc-950 hover:underline dark:text-zinc-50"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <span className="truncate font-semibold text-zinc-950 dark:text-zinc-50">
                        {item.title}
                      </span>
                    )}

                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Your rating
                      </span>
                      <RatingStars
                        productId={item.productId}
                        initialStars={userRatings.get(item.productId) ?? 0}
                      />
                    </div>
                  </div>

                  {item.url ? (
                    <a
                      href={item.url}
                      className={`inline-flex shrink-0 items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors ${BUTTON_COLORS.primary}`}
                    >
                      <DownloadSimple size={16} weight="bold" />
                      Download
                    </a>
                  ) : (
                    <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                      File coming soon
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
