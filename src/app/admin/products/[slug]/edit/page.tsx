import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getAdminUser } from "@/lib/admin";
import { getOwnProduct } from "@/lib/moderation";
import { EditMapForm, RejectionNote } from "@/components/EditMapForm";
import { getReactionOptions } from "@/lib/reactions";
import { BackArrow } from "@/components/BackArrow";

export const metadata: Metadata = {
  title: "Edit map",
  robots: { index: false },
};

// Личная страница — не кэшируем, как всё в админке: форма обязана
// открываться с текущим содержимым карты, а не минутной давности.
export const dynamic = "force-dynamic";

// ФОРМА ПРАВКИ ПЕРЕЕХАЛА СЮДА С /resources/[slug]/edit (2026-09-06,
// решение владельца), и это вторая половина переезда 28 августа: тогда
// в админку ушла ЗАГРУЗКА, а правка осталась в кабинете автора. Пока
// приём авторов заморожен, кабинет никому не показывается, и правка в
// нём была дверью в комнату, которой нет на плане.
//
// К разморозке креаторства правка вернулась и в кабинет автора —
// /resources/[slug]/edit, та же форма. Редирект со старого адреса сюда
// снят: он уводил автора-не-админа в 404 админки. Ссылки из уже
// разосланных уведомлений «/resources/<карта>/edit» теперь открывают
// кабинетную страницу и работают у любого автора, владельца тоже.
//
// ⚠️ ЧТО ПЕРЕЕЗД НЕ МЕНЯЕТ: право править висит на ВЛАДЕНИИ картой, а не
// на админстве. Так решает база — getOwnProduct ищет строку с
// creator_id = текущий пользователь, и чужой slug просто не найдётся.
// Админка здесь дверь, а не разрешение: админ, не являющийся автором
// карты, получит отсюда 404, и это правильно.
export default async function AdminEditMapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Гость и посторонний сюда не доходят — гейт стоит в layout админки и
  // отвечает обоим 404. id нужен, чтобы найти карту по владению.
  const admin = await getAdminUser();
  if (!admin) return null;

  const supabase = await createSupabaseServer();
  const product = await getOwnProduct(supabase, admin.id, slug);
  if (!product) notFound();

  // Список реакций живёт в базе, а форма клиентская — читаем здесь
  // (тот же довод, что на /admin/products/new).
  const reactionOptions = await getReactionOptions();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center gap-3">
        <BackArrow href="/admin/products" label="All products" />
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Edit map
        </h1>
      </div>

      <RejectionNote product={product} />

      <div className="mt-8">
        <EditMapForm
          product={product}
          reactionOptions={reactionOptions}
          doneHref="/admin/products"
        />
      </div>
    </div>
  );
}
