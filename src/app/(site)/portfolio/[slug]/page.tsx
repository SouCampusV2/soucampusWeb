import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  Ruler,
  Tag,
  Timer,
} from "@phosphor-icons/react/dist/ssr";
import {
  footprintInPitches,
  getAllProjects,
  getProject,
  type Project,
} from "@/lib/projects";
import { getViewCounts, VIEW_PATHS } from "@/lib/views";
import { ViewCount } from "@/components/ViewCount";
import { PortfolioGallery } from "@/components/PortfolioGallery";
import { Button } from "@/components/Button";
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
  // Весь список, а не одна работа: внизу соседи «предыдущая / следующая».
  // Страница собирается заранее, так что запрос делается на сборке, а не
  // на каждом заходе.
  const [projects, viewCounts] = await Promise.all([
    getAllProjects(),
    getViewCounts(),
  ]);
  const at = projects.findIndex((p) => p.slug === slug);
  if (at === -1) notFound();
  const project = projects[at];

  // По кругу, в порядке каталога (sort_order): с последней работы «дальше»
  // ведёт на первую. Тупик в конце ничего не сообщает.
  const prev =
    projects.length > 1 ? projects[(at - 1 + projects.length) % projects.length] : null;
  const next = projects.length > 1 ? projects[(at + 1) % projects.length] : null;

  const target = { slug: project.slug, featured: project.isFeatured };

  return (
    <main className="w-full mx-auto max-w-6xl flex-1 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        {/* ⚠️ Эта страница НЕ принимает searchParams, и это не забывчивость.
            Проп `searchParams` сам по себе делает страницу динамической:
            параметры известны только в момент запроса, значит Next обязан
            рендерить её каждому заходу — при том, что всё остальное здесь
            заранее известно. Ради одного слова в ссылке «назад»
            шестнадцать работ пересобирались на каждого посетителя.

            Теперь адрес читает клиентский PortfolioBackLink, а <Suspense>
            удерживает эту динамику внутри себя: без границы Next увёл бы
            на клиент всё дерево страницы. Разбор — в шапке компонента. */}
        <Suspense fallback={<PortfolioBackLinkFallback {...target} />}>
          <PortfolioBackLink {...target} />
        </Suspense>

        <header className="mt-8">
          {/* Тег — тем же лаймовым чипом, что на карточке в каталоге:
              человек только что кликнул по нему и узнаёт его здесь. */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-lime-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-950">
              {project.tag}
            </span>
            <ViewCount
              count={viewCounts[VIEW_PATHS.project(project.slug)]}
              className="text-zinc-500 dark:text-zinc-400"
            />
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-6xl">
            {project.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            {project.summary}
          </p>
        </header>

        {/* Фото работы — клиентский блок: любой кадр открывается во весь
            экран с листанием (общий Lightbox, он же на странице товара и
            в админке). Факты и описание переданы внутрь слотом: они
            встают между обложкой и остальными кадрами, а сами остаются
            серверной разметкой. */}
        <PortfolioGallery
          image={project.image}
          gallery={project.gallery}
          title={project.title}
        >
          <ProjectFacts project={project} />

          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_20rem] lg:gap-12">
            <section>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                About the build
              </h2>
              <p className="mt-4 text-lg leading-8 text-zinc-700 dark:text-zinc-300">
                {project.description}
              </p>
            </section>

            {/* Заказать похожее — прямо у работы, которая понравилась: это
                момент, когда решение и принимается. Надпись и адрес те же,
                что у кнопки в навбаре и hero, и так же без стрелки (поворот
                на -45 значит «уходишь с сайта», см. DESIGN.md → ArrowCircle). */}
            <aside className="self-start rounded-3xl bg-orange-100 p-6 dark:bg-orange-950">
              <p className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                Want something like this?
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                Tell me the size, the style and the deadline — I&apos;ll come
                back with a price and a plan.
              </p>
              <Button
                href="/contact"
                variant="primary"
                size="md"
                className="mt-5"
                pageTransition
              >
                Order a map
              </Button>
            </aside>
          </div>
        </PortfolioGallery>

        {prev && next && (
          <nav
            aria-label="More work"
            className="mt-20 border-t border-zinc-200 pt-10 dark:border-zinc-800"
          >
            <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Keep exploring
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-6">
              <NeighborCard project={prev} direction="prev" />
              <NeighborCard project={next} direction="next" />
            </div>
          </nav>
        )}
      </div>
    </main>
  );
}

// Три плитки фактов. Размер — с переводом в футбольные поля, иначе
// «200×200» ничего не говорит тому, кто не строит в Minecraft. Третья
// плитка — цена, а у непродававшейся работы (личная, командная, пробная)
// вместо неё тип: подпись «personal project» в графе «Price» читалась бы
// как цена.
function ProjectFacts({ project }: { project: Project }) {
  const pitches = footprintInPitches(project);

  const facts = [
    {
      icon: Ruler,
      label: "Size",
      value: project.size,
      note:
        pitches === null
          ? "blocks"
          : `blocks · about ${pitches} football ${pitches === 1 ? "pitch" : "pitches"}`,
    },
    {
      icon: Timer,
      label: "Timeline",
      value: project.deadline,
      note: "start to finish",
    },
    project.priceAmount !== null
      ? { icon: Coins, label: "Price", value: project.price, note: "what the client paid" }
      : { icon: Tag, label: "Made as", value: project.tag, note: "not a paid commission" },
  ];

  return (
    <dl className="mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
      {facts.map(({ icon: Icon, label, value, note }) => (
        <div
          key={label}
          className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
        >
          <dt className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Icon
              size={18}
              weight="bold"
              aria-hidden
              className="text-orange-500 dark:text-orange-400"
            />
            {label}
          </dt>
          <dd className="mt-2">
            <span className="block text-2xl font-bold text-zinc-950 dark:text-zinc-50">
              {value}
            </span>
            <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
              {note}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

// Соседняя работа — карточкой с фото, а не строкой текста: следующую
// постройку выбирают глазами. Стрелка сдвигается на наведении в сторону
// перехода, как в BackLink.
function NeighborCard({
  project,
  direction,
}: {
  project: Project;
  direction: "prev" | "next";
}) {
  const isNext = direction === "next";
  const Arrow = isNext ? ArrowRight : ArrowLeft;

  return (
    <Link
      href={`/portfolio/${project.slug}`}
      className="group relative block aspect-[16/9] overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800"
    >
      <Image
        src={project.image}
        alt={project.title}
        fill
        sizes="(min-width: 640px) 50vw, 100vw"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/20 to-transparent" />
      <div
        className={`absolute inset-x-0 bottom-0 flex items-end gap-3 p-5 ${
          isNext ? "flex-row-reverse text-right" : ""
        }`}
      >
        <Arrow
          size={20}
          weight="bold"
          className={`mb-1 shrink-0 text-lime-400 transition-transform ${
            isNext ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"
          }`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium uppercase tracking-wide text-zinc-300">
            {isNext ? "Next project" : "Previous project"}
          </span>
          <span className="block truncate text-lg font-semibold text-white">
            {project.title}
          </span>
        </span>
      </div>
    </Link>
  );
}
