import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Unbounded } from "next/font/google";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/current-user";
import { getOwnProduct } from "@/lib/moderation";
import { EditMapForm } from "@/components/EditMapForm";
import { getReactionOptions } from "@/lib/reactions";
import { PageGlow } from "@/components/PageGlow";
import { BackLink } from "@/components/BackLink";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Edit map",
  robots: { index: false },
};

// Личная страница — не кэшируем, гасим унаследованный от (site)
// revalidate = 60 (подробно — в notifications/page.tsx). Форма обязана
// открываться с текущим содержимым карты, а не минутной давности.
export const dynamic = "force-dynamic";

// Правка своей карты. Владение проверяет не код, а RLS: getOwnProduct
// ищет строку с creator_id = текущий пользователь, поэтому чужой slug
// просто не найдётся и страница отдаст 404. Отдельной проверки «а моё
// ли это» здесь намеренно нет — она была бы вторым источником правды
// рядом с политикой БД.
export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createSupabaseServer();
  const user = await getCurrentUser(supabase);
  if (!user) {
    redirect(`/login?next=/resources/${slug}/edit`);
  }

  const product = await getOwnProduct(supabase, user.id, slug);
  if (!product) notFound();

  // Список реакций живёт в базе, а форма клиентская — читаем здесь
  // (тот же довод, что на /admin/products/new).
  const reactionOptions = await getReactionOptions();

  return (
    <main className="relative w-full overflow-x-clip px-6">
      <PageGlow color="rgba(249,115,22,0.28)" />
      <section className="relative pb-28 pt-20">
        <div className="mx-auto max-w-2xl">
          <BackLink href="/resources">Your resources</BackLink>

          <h1
            className={`${displayFont.className} mt-6 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
          >
            Edit map
          </h1>

          {/* Причина отказа — на самом верху формы: человек пришёл сюда
              именно чтобы её исправить, и искать её на другой странице
              он не должен. */}
          {product.state === "rejected" && product.rejectionReason && (
            <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <span className="font-semibold">Why it was rejected: </span>
              {product.rejectionReason}
            </p>
          )}

          <div className="mt-8">
            <EditMapForm
              product={product}
              userId={user.id}
              reactionOptions={reactionOptions}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
