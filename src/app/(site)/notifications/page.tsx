import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Unbounded } from "next/font/google";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/current-user";
import { getNotifications } from "@/lib/notifications";
import { PageGlow } from "@/components/PageGlow";
import { NotificationList, EmptyState } from "@/components/NotificationList";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false },
};

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
          <h1
            className={`${displayFont.className} text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
          >
            Notifications
          </h1>

          {items.length === 0 ? <EmptyState /> : <NotificationList items={items} />}
        </div>
      </section>
    </main>
  );
}
