import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Unbounded } from "next/font/google";
import { getAdminUser } from "@/lib/admin";

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
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/admin/moderation"
            className={`${displayFont.className} text-lg tracking-tight text-zinc-950 dark:text-zinc-50`}
          >
            Admin
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">{admin.email}</span>
            <Link
              href="/"
              className="font-medium text-orange-600 hover:underline dark:text-orange-400"
            >
              Back to site
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
