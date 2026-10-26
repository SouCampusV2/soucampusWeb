import { AnnounceForm } from "@/components/AnnounceForm";
import { getRecipients } from "@/lib/notifications";

// Уведомления, написанные руками. Права проверяет layout админки; у
// самого обработчика /api/admin/announce своя проверка.
export const dynamic = "force-dynamic";

export default async function AdminAnnouncePage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const [recipients, { to }] = await Promise.all([getRecipients(), searchParams]);
  // Навбар ведёт сюда двумя пунктами: «на сайте» и «в Discord».
  const initialTarget = to === "site" || to === "discord" ? to : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        Send a notification
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        To everyone — sales, policy changes, big news — on the site, in the
        Discord announcements channel, or both. Or to one person on the site.
        Everything else notifies people by itself.
      </p>
      <AnnounceForm
        recipients={recipients}
        discordReady={Boolean(process.env.DISCORD_ANNOUNCE_WEBHOOK_URL)}
        initialTarget={initialTarget}
      />
    </div>
  );
}
