import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Unbounded } from "next/font/google";
import Link from "next/link";
import { Warning } from "@phosphor-icons/react/dist/ssr";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/current-user";
import { getOwnProducts } from "@/lib/moderation";
import { isCreator, getSubmissionBlock } from "@/lib/creator-applications";
import { UploadMapForm } from "@/components/UploadMapForm";
import { getReactionOptions } from "@/lib/reactions";
import { PageGlow } from "@/components/PageGlow";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Add a map",
  robots: { index: false },
};

// Личная страница — не кэшируем, гасим унаследованный от (site)
// revalidate = 60 (подробно — в notifications/page.tsx). Право на
// загрузку выдаёт админ, и появиться оно должно сразу.
export const dynamic = "force-dynamic";

// Тот же гейт, что у /profile/edit: страница закрыта, гость летит на
// /login. Клиентская проверка в CreatorOwnerActions (кнопка сюда ведёт)
// — это только UX ("не показывать кнопку постороннему"), не защита; сама
// защита — здесь, на сервере.
export default async function UploadMapPage() {
  const supabase = await createSupabaseServer();
  const user = await getCurrentUser(supabase);

  if (!user) {
    redirect("/login?next=/creator/upload");
  }

  // Загружать может только одобренный креатор (с 2026-08-09). Раньше сюда
  // проходил ЛЮБОЙ зарегистрированный, и единственным фильтром была
  // модерация каждой карты по отдельности — то есть спамера приходилось
  // ловить заново на каждой заявке.
  //
  // Отправляем в /resources, а не в 404: человек здесь не посторонний, он
  // просто ещё не подавал заявку. На /resources его и ждёт форма — это то
  // же место, куда он шёл за «добавить карту».
  if (!(await isCreator(supabase, user.id))) {
    redirect("/resources");
  }

  // Два РАЗНЫХ случая, и путать их нельзя.
  //
  // Отклонённая карта — единственный, где предупреждать уместно: после
  // отказа человек естественно идёт «загрузить заново» и создаёт ВТОРУЮ
  // строку вместо исправления первой (slug при совпадении получает
  // случайный суффикс, ничто дубликат не останавливает).
  //
  // Карта на ревью — обычное состояние, а не проблема: отправил одну,
  // спокойно делаешь вторую. Сначала предупреждение показывалось на обе,
  // и человек, добавляя ВТОРУЮ карту, получал тревожную плашку про
  // дубликаты на ровном месте.
  // Пауза после тяжёлого отказа (миграция 20260811160000). Уводим
  // отсюда, а не показываем форму, которую база всё равно не примет:
  // человек заполнял бы её, грузил файл и получал непонятный отказ на
  // последнем шаге. Объяснение и дата ждут его на /resources.
  if (await getSubmissionBlock(supabase, user.id)) {
    redirect("/resources");
  }

  // Список реакций читаем ЗДЕСЬ: форма клиентская, а список живёт в
  // базе. Тянуть его из браузера значило бы лишний запрос при каждом
  // открытии формы ради данных, которые страница и так получает.
  const reactionOptions = await getReactionOptions();

  const own = await getOwnProducts(supabase, user.id);
  const rejected = own.filter((p) => p.state === "rejected");
  const pending = own.filter((p) => p.state === "pending");

  return (
    <main className="relative w-full overflow-x-clip px-6">
      <PageGlow color="rgba(249,115,22,0.28)" />
      <section className="relative pb-28 pt-20">
        <div className="mx-auto max-w-2xl">
          <h1
            className={`${displayFont.className} text-center text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
          >
            Add a map
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-center text-zinc-600 dark:text-zinc-400">
            Submitted maps are reviewed before they go live on the marketplace —
            you&apos;ll see it on your profile once it&apos;s approved.
          </p>

          {/* Отказ — здесь предупреждение оправдано. */}
          {rejected.length > 0 && (
            <div className="mt-8 rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30">
              <p className="flex gap-2.5 text-sm text-orange-900 dark:text-orange-100">
                <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
                <span>
                  Fixing something after a rejection?{" "}
                  <strong>Edit the existing map</strong> instead of uploading it
                  again — a re-upload creates a second listing rather than
                  replacing the first.
                </span>
              </p>
              <ul className="mt-3 space-y-1.5">
                {rejected.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/resources/${product.slug}/edit`}
                      className="text-sm font-semibold text-orange-700 underline decoration-2 underline-offset-4 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-200"
                    >
                      {product.title}
                    </Link>{" "}
                    <span className="text-xs text-orange-800/70 dark:text-orange-200/70">
                      — needs changes
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Карты на проверке — просто справка, без тревоги: ни рамки,
              ни значка предупреждения, приглушённый текст. Добавлять
              вторую карту, пока первая на ревью, совершенно нормально. */}
          {pending.length > 0 && rejected.length === 0 && (
            <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {pending.length === 1
                ? "One of your maps is in review"
                : `${pending.length} of your maps are in review`}
              :{" "}
              {pending.map((product, i) => (
                <span key={product.id}>
                  {i > 0 && ", "}
                  <Link
                    href={`/resources/${product.slug}/edit`}
                    className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-orange-600 dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-orange-400"
                  >
                    {product.title}
                  </Link>
                </span>
              ))}
              . Adding another one is fine.
            </p>
          )}

          <div className="mt-10">
            <UploadMapForm userId={user.id} reactionOptions={reactionOptions} />
          </div>
        </div>
      </section>
    </main>
  );
}
