import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getAllProjects, getProject } from "@/lib/projects";
import { getViewCounts, VIEW_PATHS } from "@/lib/views";
import { ViewCount } from "@/components/ViewCount";
import { PortfolioGallery } from "@/components/PortfolioGallery";
import {
  PortfolioBackLink,
  PortfolioBackLinkFallback,
} from "@/components/PortfolioBackLink";

// Список адресов, которые Next.js соберёт заранее, во время сборки.
// Раньше брался из массива мгновенно, теперь — запросом в базу, поэтому
// функция стала async. Next.js это поддерживает нативно.
export async function generateStaticParams() {
  const projects = await getAllProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Not found" };

  // Сниппет для выдачи и соцсетей собираем из готовых полей работы:
  // "<summary> Size 250×250, delivered in 1 week." — размер и срок это как раз
  // то, что ищет заказчик.
  const description = `${project.summary} Size ${project.size}, delivered in ${project.deadline}.`;

  // og:image — САМО ФОТО постройки (абсолютный URL), а не брендовая заглушка:
  // ссылка на работу в Discord показывает реальный билд. metadataBase делает
  // путь абсолютным, но для og картинку принято указывать полным адресом.
  return {
    title: project.title,
    description,
    alternates: { canonical: `/portfolio/${project.slug}` },
    openGraph: {
      type: "article",
      title: project.title,
      description,
      url: `/portfolio/${project.slug}`,
      images: [{ url: project.image, alt: project.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description,
      images: [project.image],
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const viewCounts = await getViewCounts();

  return (
    <main className="w-full mx-auto max-w-6xl flex-1 px-6 py-16 sm:py-28">

      <div className="mx-auto max-w-3xl">
        {/* ⚠️ Эта страница НЕ принимает searchParams, и это не забывчивость.
            Проп `searchParams` сам по себе делает страницу динамической:
            параметры известны только в момент запроса, значит Next обязан
            рендерить её каждому заходу — при том, что всё остальное здесь
            заранее известно. Ради одного слова в ссылке «назад»
            шестнадцать работ пересобирались на каждого посетителя.

            Теперь адрес читает клиентский PortfolioBackLink, а <Suspense>
            удерживает эту динамику внутри себя: без границы Next увёл бы
            на клиент всё дерево страницы. Разбор — в шапке компонента. */}
        <Suspense fallback={<PortfolioBackLinkFallback />}>
          <PortfolioBackLink />
        </Suspense>

        {/* Тег и счётчик — в одну строку: оба относятся к работе целиком,
            но счётчик приглушён, это второстепенная информация. */}
        <div className="mt-6 flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-orange-600">
            {project.tag}
          </span>
          <ViewCount
            count={viewCounts[VIEW_PATHS.project(project.slug)]}
            className="text-zinc-500 dark:text-zinc-400"
          />
        </div>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
          {project.title}
        </h1>

        <dl className="mt-6 flex flex-wrap gap-8 border-y border-zinc-200 py-4 text-sm dark:border-zinc-800">
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Timeline</dt>
            <dd className="font-semibold text-zinc-950 dark:text-zinc-50">{project.deadline}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Size</dt>
            <dd className="font-semibold text-zinc-950 dark:text-zinc-50">{project.size}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Price</dt>
            <dd className="font-semibold text-zinc-950 dark:text-zinc-50">{project.price}</dd>
          </div>
        </dl>

        <p className="mt-8 leading-7 text-zinc-700 dark:text-zinc-300">{project.description}</p>

        {/* Фото работы — клиентский блок: любой кадр открывается во весь
            экран с листанием (общий Lightbox, он же на странице товара и
            в админке). Остальная страница остаётся серверной. */}
        <PortfolioGallery
          image={project.image}
          gallery={project.gallery}
          title={project.title}
        />
      </div>
    </main>
  );
}
