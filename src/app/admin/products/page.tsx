import Link from "next/link";
import { Package } from "@phosphor-icons/react/dist/ssr";
import { getCatalog, summarize, type CatalogRow } from "@/lib/catalog";
import { CatalogActions } from "@/components/CatalogActions";
import { CatalogFilterBar } from "@/components/CatalogFilterBar";
import { RefreshButton } from "@/components/RefreshButton";
import { INLINE_LINK, NEW_TAB } from "@/components/Button";
import { creatorHref } from "@/lib/creators";
import { formatDate } from "@/lib/dates";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/current-user";

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
  searchParams: Promise<{ q?: string; state?: string }>;
}) {
  const { q, state } = await searchParams;

  // Кто смотрит — нужно, чтобы решить, показывать ли ссылку на правку.
  // Форма правки живёт на /resources/[slug]/edit и пускает по ВЛАДЕНИЮ
  // (getOwnProduct ищет строку с creator_id = текущий пользователь), а
  // не по правам админа. То есть на чужую карту ссылка вела бы в 404 —
  // поэтому её там и не рисуем.
  const supabase = await createSupabaseServer();
  const viewer = await getCurrentUser(supabase);

  const rows = await getCatalog({
    q,
    state: state as never,
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
            {q || state ? "Nothing matches that." : "No maps yet."}
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((product) => (
            <CatalogRowItem
              key={product.id}
              product={product}
              viewerId={viewer?.id ?? null}
            />
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

function CatalogRowItem({
  product,
  viewerId,
}: {
  product: CatalogRow;
  viewerId: string | null;
}) {
  // Своя карта — значит форма правки её откроет. Проверка тут только для
  // ВИДА ссылки; настоящее «моё ли это» решает getOwnProduct на самой
  // странице правки, по creator_id.
  const canEdit = Boolean(viewerId) && product.creator?.id === viewerId;

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
                href={creatorHref(product.creator.username)}
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
            {formatDate(product.createdAt)}
          </p>

          {/* Открыть на витрине — только у тех, кто на ней есть: у
              остальных публичной страницы не существует, ссылка вела бы в
              404. Условие то же, что в политике чтения. */}
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {product.state === "live" && product.creatorActive && (
              <Link
                href={`/marketplace/${product.slug}`}
                {...NEW_TAB}
                className={INLINE_LINK}
              >
                Open in the marketplace
              </Link>
            )}
            {/* Правка содержимого — название, описание, цена, галерея,
                файл. Раньше попасть в неё можно было только через
                «Your resources», а этот пункт убран из навбара вместе с
                заморозкой креаторства (src/lib/flags.ts) — функционал
                остался, дверь пропала. Здесь она и нужна: каталог админки
                это единственное место, где владелец видит все свои карты
                разом.

                Отдельного редактора для админа сознательно НЕ заводим:
                это был бы второй путь записи в products со своими
                правами и своими дырами, а формы правки уже есть и
                проверены. Ссылка ведёт в существующую.

                Удалённую карту не правят — форма её и не откроет. */}
            {canEdit && product.state !== "deleted" && (
              <Link
                href={`/resources/${product.slug}/edit`}
                {...NEW_TAB}
                className={INLINE_LINK}
              >
                Edit
              </Link>
            )}
          </span>

          {product.suspensionReason && (
            <p className="mt-2 whitespace-pre-line rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
              {/* Подпись по состоянию: колонка одна на оба случая (см.
                  /api/admin/catalog), а называть удаление «снятием» —
                  врать самому себе при следующем разборе. */}
              <span className="font-semibold">
                {product.state === "deleted"
                  ? product.deletedBy === "creator"
                    ? "Deleted by the author: "
                    : "Removed by the site: "
                  : "Taken down: "}
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

// Подписи состояний — в одном месте, чтобы каталог и кабинет автора не
// разъезжались в словах об одном и том же.
const STATE_BADGES: Record<
  CatalogRow["state"],
  { label: string; className: string }
> = {
  deleted: {
    label: "Deleted",
    className:
      "bg-zinc-950/[0.06] text-zinc-600 dark:bg-zinc-50/[0.08] dark:text-zinc-400",
  },
  pending: {
    label: "In review",
    className:
      "bg-zinc-950/[0.05] text-zinc-600 dark:bg-zinc-50/[0.06] dark:text-zinc-400",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  },
  suspended: {
    label: "Taken down",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
  hidden: {
    label: "Hidden by author",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
  live: {
    label: "Live",
    className:
      "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  },
};

function StatusBadge({ product }: { product: CatalogRow }) {
  // Кто удалил — видно СРАЗУ в списке, а не только в журнале.
  //
  // Колонка deleted_by завелась 2026-08-15 и доезжала сюда, но на экран
  // не попадала: обе стороны показывались одним словом «Deleted». А это
  // два разных события. «Автор передумал» — обычная жизнь каталога, и
  // считать её вместе с нарушениями значит портить себе же статистику.
  // «Убрала площадка» — решение модерации, у него есть причина и спор по
  // нему разбирают.
  if (product.state === "deleted") {
    return product.deletedBy === "creator" ? (
      <Badge className="bg-zinc-950/[0.06] text-zinc-600 dark:bg-zinc-50/[0.08] dark:text-zinc-400">
        Deleted by author
      </Badge>
    ) : (
      <Badge className="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
        Removed by site
      </Badge>
    );
  }

  // «Creator revoked» — не состояние карты, а состояние её автора,
  // поэтому проверяется отдельно и раньше остальных живых случаев. Иначе
  // владелец видит «Live» у карты, которой на витрине нет, — или ищет, за
  // что снял ИМЕННО ЭТУ карту, хотя решение было про человека и вернётся
  // она сама вместе с его статусом.
  //
  // Удалённые сюда уже не доходят — они разобраны веткой выше, и там
  // важнее, кто удалил, чем статус автора.
  if (!product.creatorActive) {
    return (
      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
        Creator revoked
      </Badge>
    );
  }

  const badge = STATE_BADGES[product.state];
  return <Badge className={badge.className}>{badge.label}</Badge>;
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
