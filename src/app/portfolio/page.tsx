import Link from "next/link";
import type { Metadata } from "next";
import { projects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Portfolio — SouCampus builds",
};

export default function PortfolioPage() {
  return (
    <main className="mx-auto max-w-6xl flex-1 px-6 py-24">
      <h1 className="text-4xl font-bold tracking-tight text-zinc-950 dark:text-white">
        Portfolio
      </h1>
      <p className="mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">
        Все работы. Нажми на карточку, чтобы посмотреть подробности, сроки и
        галерею.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.slug}
            href={`/portfolio/${project.slug}`}
            className="group block overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800"
          >
            <div className="aspect-[4/3] bg-gradient-to-br from-emerald-500/20 via-zinc-200 to-zinc-100 transition-transform duration-300 group-hover:scale-105 dark:from-emerald-500/10 dark:via-zinc-800 dark:to-zinc-900" />
            <div className="p-5">
              <span className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                {project.tag}
              </span>
              <h2 className="mt-1 font-semibold text-zinc-950 dark:text-white">
                {project.title}
              </h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {project.summary}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
