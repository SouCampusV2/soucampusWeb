import { AnnounceForm } from "@/components/AnnounceForm";
import { getRecipients } from "@/lib/notifications";

// Уведомления, написанные руками. Права проверяет layout админки; у
// самого обработчика /api/admin/announce своя проверка.
export const dynamic = "force-dynamic";

export default async function AdminAnnouncePage() {
  const recipients = await getRecipients();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        Send a notification
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        To everyone — sales, policy changes, big news — or to one person.
        Everything else on the site notifies people by itself.
      </p>
      <AnnounceForm recipients={recipients} />
    </div>
  );
}
