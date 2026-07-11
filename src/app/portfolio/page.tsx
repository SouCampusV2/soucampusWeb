import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { projects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Portfolio — SouCampus builds",
};

export default function PortfolioPage() {
  return (
    <main className="mx-auto max-w-6xl flex-1 px-6 py-28">
      <h1 className="text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">
        Portfolio
      </h1>
      <p className="mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">
        All the work. Click a card to see details, timeline and gallery.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.slug}
            href={`/portfolio/${project.slug}`}
            className="group block overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={project.image}
                alt={project.title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="p-5">
              <span className="text-xs font-medium uppercase tracking-wide text-orange-600 dark:text-orange-400">
                {project.tag}
              </span>
              <h2 className="mt-1 text-lg font-semibold text-zinc-950">
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
