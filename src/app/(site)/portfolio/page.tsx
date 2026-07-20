import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Unbounded } from "next/font/google";
import { getAllProjects } from "@/lib/projects";
import { PortfolioHero } from "@/components/PortfolioHero";

// Same display font as the hero headings — the card title rhymes with them.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portfolio — SouCampus builds",
};

// Cycles through a varied bento pattern (big feature, small squares, wide
// banners) so the grid stays visually interesting no matter how many
// projects get added later — not one fixed layout per card.
const SPAN_PATTERN = [
  "lg:col-span-4 lg:row-span-2",
  "lg:col-span-2 lg:row-span-1",
  "lg:col-span-2 lg:row-span-2",
  "lg:col-span-2 lg:row-span-1",
  "lg:col-span-3 lg:row-span-1",
  "lg:col-span-3 lg:row-span-1",
];

// async, потому что данные теперь приезжают из базы, а не лежат в файле
// рядом. Серверные компоненты умеют быть асинхронными "из коробки":
// Next.js дожидается ответа БД на сервере и отправляет браузеру уже
// готовый HTML — посетитель никакой загрузки не видит.
export default async function PortfolioPage() {
  const projects = await getAllProjects();

  // Состав карусели задаёт галочка is_featured в базе, а не "первые пять
  // по порядку", как раньше. Теперь порядок карточек в сетке можно менять,
  // не трогая карусель — это два независимых решения (см. STRUCTURE.md).
  const featured = projects.filter((p) => p.isFeatured);
  const gridProjects = projects.filter((p) => !p.isFeatured);

  return (
    <main className="w-full mx-auto max-w-6xl flex-1 px-6">
      <PortfolioHero projects={featured} />

      <div className="mt-16 border-t border-zinc-200 pt-10 dark:border-zinc-800 sm:mt-28 sm:pt-16">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
          More projects
        </h2>
        <p className="mt-2 max-w-xl text-zinc-600 dark:text-zinc-400">
          The full portfolio. Click a build to see details, timeline and gallery.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-6 lg:auto-rows-[220px] lg:grid-flow-dense">
          {gridProjects.map((project, i) => (
            <Link
              key={project.slug}
              href={`/portfolio/${project.slug}`}
              className={`group relative block overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 ${SPAN_PATTERN[i % SPAN_PATTERN.length]}`}
            >
              {/* Below `lg:` the grid has no fixed row height (that's a
                  lg:auto-rows-[220px] thing, for the bento span pattern) —
                  h-full/min-h-[220px] alone doesn't give the box a real
                  height there, it was resolving to a squashed sliver on
                  mobile/tablet. aspect-video keeps it a proper ~16:9 card
                  in the single/2-column layout; lg: swaps back to filling
                  the bento cell's own explicit row-span height. */}
              <div className="relative aspect-video w-full lg:aspect-auto lg:h-full lg:min-h-[220px]">
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  sizes="(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/10 to-transparent" />

                <span className="absolute left-4 top-4 rounded-full bg-lime-300/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-950">
                  {project.tag}
                </span>

                <div className="absolute inset-x-0 bottom-0 p-5 transition-transform duration-300 group-hover:-translate-y-1">
                  <h3
                    className={`${displayFont.className} text-lg leading-tight text-lime-400`}
                  >
                    {project.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
