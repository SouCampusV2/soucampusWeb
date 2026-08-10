import { AnnounceForm } from "@/components/AnnounceForm";

// Рассылка объявлений. Права проверяет layout админки; у самого
// обработчика /api/admin/announce своя проверка.
export const dynamic = "force-dynamic";

export default function AdminAnnouncePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        Announcement
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Lands in everyone&apos;s notifications — sales, policy changes, big
        news. Everything else on the site notifies people by itself.
      </p>
      <AnnounceForm />
    </div>
  );
}
