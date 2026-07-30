import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Unbounded } from "next/font/google";
import Link from "next/link";
import { Warning } from "@phosphor-icons/react/dist/ssr";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getOwnProducts } from "@/lib/moderation";
import { UploadMapForm } from "@/components/UploadMapForm";
import { PageGlow } from "@/components/PageGlow";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Add a map",
  robots: { index: false },
};

// Тот же гейт, что у /profile/edit: страница закрыта, гость летит на
// /login. Клиентская проверка в CreatorOwnerActions (кнопка сюда ведёт)
// — это только UX ("не показывать кнопку постороннему"), не защита; сама
// защита — здесь, на сервере.
export default async function UploadMapPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/creator/upload");
  }

  // Карты, которые ждут разбора или отклонены. Показываем их здесь не
  // ради красоты: после отказа человек естественно идёт «загрузить
  // заново» — и создаёт ВТОРУЮ строку вместо исправления первой (slug
  // при совпадении получает случайный суффикс, ничто дубликат не
  // останавливает). Ссылка на правку прямо здесь закрывает этот путь.
  const own = await getOwnProducts(supabase, user.id);
  const unfinished = own.filter(
    (p) => p.status === "pending" || p.status === "rejected"
  );

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
            Submitted maps are reviewed before they go live on the shop —
            you&apos;ll see it on your profile once it&apos;s approved.
          </p>

          {unfinished.length > 0 && (
            <div className="mt-8 rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30">
              <p className="flex gap-2.5 text-sm text-orange-900 dark:text-orange-100">
                <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
                <span>
                  You already have{" "}
                  {unfinished.length === 1 ? "a map" : `${unfinished.length} maps`}{" "}
                  waiting. If you&apos;re fixing something after a rejection,
                  <strong> edit the existing one</strong> instead of uploading
                  it again — otherwise you&apos;ll end up with duplicates.
                </span>
              </p>
              <ul className="mt-3 space-y-1.5">
                {unfinished.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/resources/${product.slug}/edit`}
                      className="text-sm font-semibold text-orange-700 underline decoration-2 underline-offset-4 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-200"
                    >
                      {product.title}
                    </Link>{" "}
                    <span className="text-xs text-orange-800/70 dark:text-orange-200/70">
                      — {product.status === "pending" ? "in review" : "rejected"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-10">
            <UploadMapForm userId={user.id} />
          </div>
        </div>
      </section>
    </main>
  );
}
