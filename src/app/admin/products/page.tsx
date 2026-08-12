import Link from "next/link";
import { Package } from "@phosphor-icons/react/dist/ssr";
import { getCatalog, summarize, type CatalogRow } from "@/lib/catalog";
import { CatalogActions } from "@/components/CatalogActions";
import { CatalogFilterBar } from "@/components/CatalogFilterBar";
import { RefreshButton } from "@/components/RefreshButton";
import { INLINE_LINK, NEW_TAB } from "@/components/Button";
import { creatorHref } from "@/lib/creators";

// Полный каталог: ВСЕ карты, а не только очередь разбора.
//
// До этой страницы модерация работала ровно один раз в жизни карты —
// одобрил, и она исчезала из админки навсегда. Нарушение может всплыть и
// через месяц, а снять карту с витрины было нечем, кроме Table Editor.
//
// Права проверяет layout админки; здесь дублировать не нужно (но в
// /api/admin/catalog проверка своя — туда можно постучаться мимо страницы).
export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const rows = await getCatalog({
    q,
    status: status as never,
  });
  const stats = summarize(rows);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Catalog
        </h1>
        <RefreshButton label="Reload the catalog" />
      </div>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Every map on the site, whatever its state.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Shown" value={stats.total} />
        <Stat label="Live" value={stats.live} />
        <Stat label="Taken down" value={stats.hidden} />
        <Stat label="Purchases" value={stats.sales} />
      </div>

      <CatalogFilterBar />

      {rows.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-zinc-200 p-12 text-center dark:border-zinc-800">
          <Package size={40} weight="thin" className="mx-auto text-zinc-300 dark:text-zinc-700" />
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            {q || status ? "Nothing matches that." : "No maps yet."}
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((product) => (
            <CatalogRowItem key={product.id} product={product} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <p className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

function CatalogRowItem({ product }: { product: CatalogRow }) {
  return (
    <li className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt=""
          className="h-16 w-28 shrink-0 rounded-xl object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-zinc-950 dark:text-zinc-50">
              {product.title}
            </span>
            <StatusBadge product={product} />
          </div>

          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {product.creator ? (
              <Link
                href={creatorHref(product.creator.displayName)}
                {...NEW_TAB}
                className={`font-medium ${INLINE_LINK}`}
              >
                {product.creator.displayName}
              </Link>
            ) : (
              "—"
            )}{" "}
            · {product.price} · {product.category ?? "no category"} ·{" "}
            {product.sales} {product.sales === 1 ? "purchase" : "purchases"} ·{" "}
            {new Date(product.createdAt).toLocaleDateString()}
          </p>

          {/* Открыть на витрине — только у живых: у остальных публичной
              страницы не существует, ссылка вела бы в 404. */}
          {product.isPublished && !product.deletedAt && (
            <Link
              href={`/shop/${product.slug}`}
              {...NEW_TAB}
              className={`mt-1 inline-block text-sm ${INLINE_LINK}`}
            >
              Open in the shop
            </Link>
          )}

          {product.suspensionReason && (
            <p className="mt-2 whitespace-pre-line rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
              {/* Подпись по состоянию: колонка одна на оба случая (см.
                  /api/admin/catalog), а называть удаление «снятием» —
                  врать самому себе при следующем разборе. */}
              <span className="font-semibold">
                {product.deletedAt ? "Removed: " : "Taken down: "}
              </span>
              {product.suspensionReason}
            </p>
          )}
        </div>

        <CatalogActions product={product} />
      </div>
    </li>
  );
}

function StatusBadge({ product }: { product: CatalogRow }) {
  // Порядок проверок = порядок важности для владельца: удалённое важнее
  // того, опубликовано ли оно, а «снял модератор» важнее «убрал автор».
  if (product.deletedAt) {
    return <Badge className="bg-zinc-950/[0.06] text-zinc-600 dark:bg-zinc-50/[0.08] dark:text-zinc-400">Deleted</Badge>;
  }
  if (product.status === "pending") {
    return <Badge className="bg-zinc-950/[0.05] text-zinc-600 dark:bg-zinc-50/[0.06] dark:text-zinc-400">In review</Badge>;
  }
  if (product.status === "rejected") {
    return <Badge className="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">Rejected</Badge>;
  }
  if (!product.isPublished) {
    return (
      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
        {product.hiddenBy === "moderator" ? "Taken down" : "Hidden by author"}
      </Badge>
    );
  }
  return <Badge className="bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300">Live</Badge>;
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
