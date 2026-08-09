import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Unbounded } from "next/font/google";
import { getAdminUser } from "@/lib/admin";
import { INLINE_LINK } from "@/components/Button";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Админка живёт ВНЕ группы (site) — намеренно (см. CLAUDE.md): она не
// наследует навбар магазина, блок тарифов и футер. Это рабочий
// инструмент владельца, а не страница сайта.
//
// Гейт стоит в layout, а не в каждой странице: любой новый раздел
// админки получает проверку автоматически, а не «если не забыли».
// notFound(), а не redirect: постороннему админка не должна выдавать
// самим фактом ответа, что она существует.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();
  if (!admin) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfbff] dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/admin/moderation"
            className={`${displayFont.className} text-lg tracking-tight text-zinc-950 dark:text-zinc-50`}
          >
            Admin
          </Link>
          {/* Разделы админки. Пока их два, поэтому просто ссылки в шапке,
              без выделения активного: подсветка требует usePathname, то
              есть клиентской границы вокруг всего layout ради двух
              пунктов. Появится третий-четвёртый — вернуться к этому. */}
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/admin"
              className="font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Overview
            </Link>
            <Link
              href="/admin/moderation"
              className="font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Queue
            </Link>
            <Link
              href="/admin/products"
              className="font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Catalog
            </Link>
            <Link
              href="/admin/applications"
              className="font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Creators
            </Link>
          </nav>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">{admin.email}</span>
            {/* В магазин, а не на лендинг: отсюда разбирают карты, и
                «назад к сайту» здесь означает «к витрине», а не к
                странице о студии. */}
            <Link href="/shop" className={`font-medium ${INLINE_LINK}`}>
              Back to shop
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
