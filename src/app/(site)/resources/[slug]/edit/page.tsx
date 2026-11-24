import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Unbounded } from "next/font/google";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/current-user";
import { getOwnProduct } from "@/lib/moderation";
import { isAdminProfile, isCreator } from "@/lib/creator-applications";
import { getReactionOptions } from "@/lib/reactions";
import { EditMapForm, RejectionNote } from "@/components/EditMapForm";
import { PageGlow } from "@/components/PageGlow";
import { BackArrow } from "@/components/BackArrow";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Edit map",
  robots: { index: false },
};

// Личная страница — форма открывается с текущим содержимым карты.
export const dynamic = "force-dynamic";

// Правка карты автором — вторая дверь к той же форме, что в админке
// (admin/products/[slug]/edit). С 06.09 по разморозку её не было: правка
// жила только в админке, и автор-не-админ не мог исправить даже
// отклонённую карту. По этому адресу ведут ссылки из уведомлений об
// отказе, поэтому он и выбран.
//
// Право править — владение картой: getOwnProduct ищет строку с
// creator_id = текущий пользователь, чужой slug не найдётся. Решает
// шлюз /api/creator/map, страница только не показывает форму тому, кого
// он развернёт.
export default async function EditOwnMapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();
  const user = await getCurrentUser(supabase);
  if (!user) redirect(`/login?next=/resources/${slug}/edit`);

  const product = await getOwnProduct(supabase, user.id, slug);
  if (!product) notFound();

  // Лишённый статуса картами не распоряжается (решение 14.08) — шлюз
  // откажет на сохранении. Причина отзыва написана на /resources.
  if (!(await isCreator(supabase, user.id))) redirect("/resources");

  const reactionOptions = await getReactionOptions();

  return (
    <main className="relative w-full overflow-x-clip px-6">
      <PageGlow color="rgba(249,115,22,0.28)" />
      <section className="relative pb-28 pt-20">
        {/* 6xl, а не 3xl: форма с 24.11 в две колонки (картинки справа). */}
        <div className="mx-auto max-w-6xl">
          {/* Кружок слева от заголовка, в одном ряду, без подписи — как на
              странице карты и работы (24.11, просьба владельца). */}
          <div className="flex items-center gap-3 sm:gap-4">
            <BackArrow href="/resources" label="Your resources" />
            <h1
              className={`${displayFont.className} text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
            >
              Edit map
            </h1>
          </div>

          <RejectionNote product={product} />

          <div className="mt-8">
            <EditMapForm
              product={product}
              reactionOptions={reactionOptions}
              doneHref="/resources"
              freeOnly={!(await isAdminProfile(supabase, user.id))}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
