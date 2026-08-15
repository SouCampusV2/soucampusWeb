import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Unbounded } from "next/font/google";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/current-user";
import { getNotifications } from "@/lib/notifications";
import { PageGlow } from "@/components/PageGlow";
import { NotificationList, EmptyState } from "@/components/NotificationList";
import { RefreshButton } from "@/components/RefreshButton";
import { NotificationsLive } from "@/components/NotificationsLive";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false },
};

// Личная страница — кэшировать её нельзя, и вот почему это пришлось
// написать явно.
//
// Группа (site) объявляет `revalidate = 60` (см. её layout.tsx), и это
// наследуют ВСЕ страницы внутри, включая эту. Для витрины и портфолио
// «считай готовый ответ свежим минуту» — то, ради чего сайт и держится
// на статике. Здесь же ответ у каждого свой и меняется не от действий
// смотрящего: уведомление приходит, пока страница открыта.
//
// Из-за унаследованной минуты кнопка «обновить» выглядела сломанной:
// router.refresh() уходил на сервер, но ответ приезжал из кэша маршрута,
// и нового уведомления в нём не было. F5 при этом помогал — полная
// перезагрузка идёт другим путём, и именно это расхождение («жму кнопку
// — ничего, жму F5 — есть») указывало на кэш, а не на выборку.
//
// force-dynamic = «рендерить на каждый запрос», это же обнуляет
// унаследованный revalidate. Ровно так объявлены все страницы админки —
// там та же кнопка работала как раз поэтому.
export const dynamic = "force-dynamic";

// Всё, что площадка сказала человеку: решения по заявке и картам,
// покупки, объявления. Заглушка-колокол в навбаре наконец ведёт сюда.
export default async function NotificationsPage() {
  const supabase = await createSupabaseServer();
  const user = await getCurrentUser(supabase);

  if (!user) {
    redirect("/login?next=/notifications");
  }

  const items = await getNotifications(supabase, user.id);

  return (
    <main className="relative w-full overflow-x-clip px-6">
      <PageGlow color="rgba(249,115,22,0.28)" />
      <section className="relative pb-28 pt-20">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between gap-4">
            <h1
              className={`${displayFont.className} text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
            >
              Notifications
            </h1>
            {/* Список подтягивается сам по событию из базы (см.
                NotificationsLive ниже). Кнопка остаётся запасным путём:
                WebSocket может отвалиться, и тогда нужен способ спросить
                руками. */}
            <RefreshButton label="Check for new notifications" />
          </div>

          {/* Ничего не рисует: слушает базу и перечитывает страницу,
              когда приходит новое. */}
          <NotificationsLive userId={user.id} />

          {items.length === 0 ? <EmptyState /> : <NotificationList items={items} />}
        </div>
      </section>
    </main>
  );
}
