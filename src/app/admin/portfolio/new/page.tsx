import { getAllProjects } from "@/lib/projects";
import { PortfolioForm } from "@/components/PortfolioForm";

export const dynamic = "force-dynamic";

export default async function NewPortfolioWorkPage() {
  // Теги — подсказкой под полем: «Order» и «Personal project» должны
  // писаться одинаково, иначе на сайте окажется два почти одинаковых.
  const tags = [...new Set((await getAllProjects()).map((p) => p.tag))];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-8 text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        Add a work
      </h1>
      <PortfolioForm tags={tags} />
    </div>
  );
}
