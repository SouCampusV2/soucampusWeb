import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { projects, getProject } from "@/lib/projects";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  return {
    title: project ? `${project.title} — SouCampus builds` : "Not found",
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  return (
    <main className="mx-auto max-w-4xl flex-1 px-6 py-24">
      <Link
        href="/portfolio"
        className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
      >
        ← Все работы
      </Link>

      <span className="mt-6 block text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
        {project.tag}
      </span>
      <h1 className="mt-1 text-4xl font-bold tracking-tight text-zinc-950 dark:text-white">
        {project.title}
      </h1>

      <dl className="mt-6 flex flex-wrap gap-8 border-y border-zinc-200 py-4 text-sm dark:border-zinc-800">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Срок выполнения</dt>
          <dd className="font-semibold text-zinc-950 dark:text-white">
            {project.deadline}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Размер</dt>
          <dd className="font-semibold text-zinc-950 dark:text-white">
            {project.size}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Стоимость</dt>
          <dd className="font-semibold text-zinc-950 dark:text-white">
            {project.price}
          </dd>
        </div>
      </dl>

      <p className="mt-8 leading-7 text-zinc-700 dark:text-zinc-300">
        {project.description}
      </p>

      <div className="relative mt-10 aspect-video overflow-hidden rounded-2xl">
        <Image
          src={project.image}
          alt={project.title}
          fill
          sizes="(min-width: 1024px) 896px, 100vw"
          className="object-cover"
          priority
        />
      </div>
    </main>
  );
}
