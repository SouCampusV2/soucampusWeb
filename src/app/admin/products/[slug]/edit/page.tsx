import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getAdminUser } from "@/lib/admin";
import { getOwnProduct } from "@/lib/moderation";
import { EditMapForm } from "@/components/EditMapForm";
import { getReactionOptions } from "@/lib/reactions";
import { INLINE_LINK } from "@/components/Button";

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
// ⚠️ Старый адрес продолжает работать редиректом, и это не вежливость.
// «/resources/<карта>/edit» стоит в УЖЕ РАЗОСЛАННЫХ уведомлениях об
// отклонённых картах — там ссылка ведёт человека исправлять причину
// отказа. Строки уведомлений в базе задним числом не переписать. Тот же
// урок, что стоил семи дней недостижимой формы загрузки: переезд — это
// не только новый адрес, но и все стрелки, которые в него ведут.
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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-sm">
        <Link href="/admin/products" className={INLINE_LINK}>
          Back to the catalog
        </Link>
      </p>

      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        Edit map
      </h1>

      {/* Причина отказа — на самом верху формы: человек пришёл сюда
          именно чтобы её исправить, и искать её на другой странице он не
          должен. */}
      {product.state === "rejected" && product.rejectionReason && (
        <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <span className="font-semibold">Why it was rejected: </span>
          {product.rejectionReason}
        </p>
      )}

      <div className="mt-8">
        <EditMapForm product={product} reactionOptions={reactionOptions} />
      </div>
    </div>
  );
}
