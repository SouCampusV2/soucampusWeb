import { getAllProjectsForAdmin } from "@/lib/projects-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PortfolioForm } from "@/components/PortfolioForm";
import {
  prefillFromDraft,
  rowToInboxItem,
  type InboxRow,
  type PortfolioPrefill,
} from "@/lib/discord-inbox";

export const dynamic = "force-dynamic";

export default async function NewPortfolioWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ inbox?: string }>;
}) {
  // Теги — подсказкой под полем: «Order» и «Personal project» должны
  // писаться одинаково, иначе на сайте окажется два почти одинаковых.
  const tags = [...new Set((await getAllProjectsForAdmin()).map((p) => p.tag))];

  // ?inbox=<key> — «Open as new work» из /admin/discord (27.10): форма
  // приходит заполненной фактами из Discord. Права проверил layout
  // админки; читаем служебным ключом, потому что discord_inbox закрыта.
  const { inbox } = await searchParams;
  let prefill: PortfolioPrefill | undefined;
  let inboxKey: string | undefined;
  if (inbox) {
    const { data } = await getSupabaseAdmin()
      .from("discord_inbox")
      .select("key, kind, payload, image_urls, created_at")
      .eq("key", inbox)
      .eq("status", "pending")
      .maybeSingle();
    const item = data ? rowToInboxItem(data as InboxRow) : null;
    if (item?.kind === "portfolio_draft") {
      prefill = prefillFromDraft(item.draft, item.imageUrls);
      inboxKey = item.key;
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-8 text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        Add a work
      </h1>
      {prefill && (
        <p className="-mt-4 mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
          Filled in from Discord: size, price, deadline and photos. Write the
          title, summary and description yourself.
        </p>
      )}
      <PortfolioForm tags={tags} prefill={prefill} inboxKey={inboxKey} />
    </div>
  );
}
