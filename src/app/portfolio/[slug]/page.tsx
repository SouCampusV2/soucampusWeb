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
    <main className="w-full mx-auto max-w-6xl flex-1 px-6 py-16 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Link href="/portfolio" className="text-sm font-medium text-orange-600">
          ← All work
        </Link>

        <span className="mt-6 block text-xs font-medium uppercase tracking-wide text-orange-600">
          {project.tag}
        </span>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">
          {project.title}
        </h1>

        <dl className="mt-6 flex flex-wrap gap-8 border-y border-zinc-200 py-4 text-sm">
          <div>
            <dt className="text-zinc-500">Timeline</dt>
            <dd className="font-semibold text-zinc-950">{project.deadline}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Size</dt>
            <dd className="font-semibold text-zinc-950">{project.size}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Price</dt>
            <dd className="font-semibold text-zinc-950">{project.price}</dd>
          </div>
        </dl>

        <p className="mt-8 leading-7 text-zinc-700">{project.description}</p>

        <div className="relative mt-10 aspect-video overflow-hidden rounded-2xl">
          <Image
            src={project.image}
            alt={project.title}
            fill
            sizes="(min-width: 1024px) 768px, 100vw"
            className="object-cover"
            priority
          />
        </div>

        {project.gallery && project.gallery.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
            {project.gallery.map((src) => (
              <div key={src} className="relative aspect-video overflow-hidden rounded-2xl">
                <Image
                  src={src}
                  alt={project.title}
                  fill
                  sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
