import Link from "next/link";
import { notFound } from "next/navigation";
import { INLINE_LINK } from "@/components/Button";
import { getAllProjects } from "@/lib/projects";
import { PortfolioForm } from "@/components/PortfolioForm";

export const dynamic = "force-dynamic";

export default async function EditPortfolioWorkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Один запрос на всё: и сама работа, и теги для подсказки.
  const projects = await getAllProjects();
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  const tags = [...new Set(projects.map((p) => p.tag))];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Edit “{project.title}”
        </h1>
        {/* Черновик поста в канал витрины из этой работы (27.10). */}
        <Link
          href={`/admin/discord?tab=showcase&from=${encodeURIComponent(project.slug)}`}
          className={`text-sm font-medium ${INLINE_LINK}`}
        >
          Post to Discord
        </Link>
      </div>
      <PortfolioForm project={project} tags={tags} />
    </div>
  );
}
