import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { getAllProjectsForAdmin } from "@/lib/projects-admin";
import { BUTTON_PILL, BUTTON_COLORS } from "@/components/Button";
import { AdminPortfolioList } from "@/components/AdminPortfolioList";

// Работы портфолио — список с дверью к правке (2026-10-25).
//
// Права проверяет layout админки, а запись — /api/admin/portfolio сам.
// Порядок тот же, что на сайте (sort_order), чтобы владелец видел
// портфолио ровно так, как его видят посетители. Черновики (12.11) стоят
// в том же списке с меткой Draft — посетитель их не видит, их место
// здесь чисто справочное: Publish переставит работу первой. Порядок
// меняется перетаскиванием и стрелками (AdminPortfolioList, 12.11).
export const dynamic = "force-dynamic";

export default async function AdminPortfolioPage() {
  const projects = await getAllProjectsForAdmin();
  const drafts = projects.filter((p) => !p.isPublished).length;
  // В клиентский компонент — только то, что он рисует: галерея целиком
  // ему не нужна, хватит числа кадров.
  const rows = projects.map((p) => ({
    slug: p.slug,
    title: p.title,
    tag: p.tag,
    image: p.image,
    isFeatured: p.isFeatured,
    isPublished: p.isPublished,
    listingUrl: p.listingUrl,
    listingIsFree: p.listingIsFree,
    images: (p.gallery?.length ?? 0) + 1,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Portfolio
        </h1>
        <Link
          href="/admin/portfolio/new"
          className={`inline-flex items-center gap-1.5 ${BUTTON_PILL} ${BUTTON_COLORS.primary}`}
        >
          <Plus size={16} weight="bold" aria-hidden />
          Add a work
        </Link>
      </div>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {projects.length - drafts} works on the site
        {drafts > 0 && `, plus ${drafts} ${drafts === 1 ? "draft" : "drafts"} only you can see`}.
        {" "}Drag a row by its dots or use the arrows to change the order.
      </p>

      {/* key — подпись данных с сервера: после Publish или правки в другой
          вкладке список собирается заново, а не держит старый порядок. */}
      <AdminPortfolioList
        key={rows.map((row) => `${row.slug}:${row.isPublished}`).join("|")}
        projects={rows}
      />
    </div>
  );
}
