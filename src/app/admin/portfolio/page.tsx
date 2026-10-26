import Link from "next/link";
import Image from "next/image";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { getAllProjects } from "@/lib/projects";
import { INLINE_LINK, NEW_TAB, BUTTON_PILL, BUTTON_COLORS } from "@/components/Button";

// Работы портфолио — список с дверью к правке (2026-10-25).
//
// Права проверяет layout админки, а запись — /api/admin/portfolio сам.
// Порядок тот же, что на сайте (sort_order), чтобы владелец видел
// портфолио ровно так, как его видят посетители.
export const dynamic = "force-dynamic";

export default async function AdminPortfolioPage() {
  const projects = await getAllProjects();

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
        {projects.length} works, in the order they appear on the site.
      </p>

      <ul className="mt-8 divide-y divide-zinc-200 rounded-3xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {projects.map((project) => (
          <li key={project.slug} className="flex items-center gap-4 p-4">
            <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
              <Image src={project.image} alt="" fill sizes="80px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-zinc-950 dark:text-zinc-50">
                {project.title}
              </p>
              <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span>#{project.sortOrder ?? "—"}</span>
                <span>{project.tag}</span>
                {project.isFeatured && <span>Carousel</span>}
                {project.listingUrl && (
                  <span>{project.listingIsFree ? "Free on store" : "Sold on store"}</span>
                )}
                <span>{(project.gallery?.length ?? 0) + 1} images</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-4 text-sm">
              <Link href={`/portfolio/${project.slug}`} {...NEW_TAB} className={INLINE_LINK}>
                View
              </Link>
              <Link
                href={`/admin/portfolio/${project.slug}/edit`}
                className={`font-medium ${INLINE_LINK}`}
              >
                Edit
              </Link>
              {/* Черновик поста в канал витрины из этой работы (27.10). */}
              <Link
                href={`/admin/discord?tab=showcase&from=${encodeURIComponent(project.slug)}`}
                className={`hidden sm:inline ${INLINE_LINK}`}
              >
                Post to Discord
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
