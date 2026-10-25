import { notFound } from "next/navigation";
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
      <h1 className="mb-8 text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        Edit “{project.title}”
      </h1>
      <PortfolioForm project={project} tags={tags} />
    </div>
  );
}
