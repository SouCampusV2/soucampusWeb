import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Unbounded } from "next/font/google";
import { getAdminUser } from "@/lib/admin";
import { INLINE_LINK, NEW_TAB } from "@/components/Button";
import { ThemeToggle } from "@/components/ThemeToggle";

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
      {/* Шапка на телефоне. Была одна строка `justify-between` с пятью
          разделами, почтой и двумя ссылками — на 360px это сжимало
          пункты в нечитаемую кашу и вылезало за экран.
          Теперь две строки: сверху имя и служебное (почта прячется —
          владелец и так знает, под кем сидит), снизу разделы. Разделы
          не переносятся, а ПРОКРУЧИВАЮТСЯ вбок: перенос на вторую-третью
          строку съедал бы пол-экрана на каждой странице, а горизонтальная
          лента — это ровно то, чего ждёшь от ряда вкладок. */}
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="flex items-center justify-between gap-4 md:justify-start">
            <Link
              href="/admin"
              className={`${displayFont.className} text-lg tracking-tight text-zinc-950 dark:text-zinc-50`}
            >
              Admin
            </Link>
            {/* На телефоне тема переключается здесь — вторая строка отдана
                разделам целиком. */}
            <div className="md:hidden">
              <ThemeToggle />
            </div>
          </div>
          {/* Разделы админки. Без выделения активного: подсветка требует
              usePathname, то есть клиентской границы вокруг всего layout.
              Дойдут руки — вернуться. */}
          <nav className="-mx-6 flex items-center gap-4 overflow-x-auto px-6 text-sm [scrollbar-width:none] md:mx-0 md:overflow-visible md:px-0">
            <Link
              href="/admin"
              className="shrink-0 whitespace-nowrap font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Overview
            </Link>
            <Link
              href="/admin/moderation"
              className="shrink-0 whitespace-nowrap font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Queue
            </Link>
            <Link
              href="/admin/products"
              className="shrink-0 whitespace-nowrap font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Catalog
            </Link>
            <Link
              href="/admin/applications"
              className="shrink-0 whitespace-nowrap font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Creators
            </Link>
            <Link
              href="/admin/comments"
              className="shrink-0 whitespace-nowrap font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Comments
            </Link>
            <Link
              href="/admin/announce"
              className="shrink-0 whitespace-nowrap font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Announce
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-4 text-sm">
            {/* Почта — справка «под кем я зашёл», на телефоне она первой
                уходит: занимает полстроки, а сообщает то, что владелец и
                так знает. */}
            <span className="hidden text-zinc-500 lg:inline dark:text-zinc-400">
              {admin.email}
            </span>
            {/* В магазин, а не на лендинг: отсюда разбирают карты, и
                «назад к сайту» здесь означает «к витрине», а не к
                странице о студии. */}
            <Link
              href="/marketplace"
              {...NEW_TAB}
              className={`whitespace-nowrap font-medium ${INLINE_LINK}`}
            >
              Back to the marketplace
            </Link>
            {/* Тему переключают из футера, а футера в админке нет — иначе
                тёмная тема здесь недоступна вовсе. На телефоне кнопка
                стоит в первой строке, поэтому здесь она от md. */}
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
