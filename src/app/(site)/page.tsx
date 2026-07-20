import { Hero } from "@/components/Hero";
import { Stats } from "@/components/Stats";
import { RecentProjects } from "@/components/RecentProjects";
import { ClientReviews } from "@/components/ClientReviews";
import { CountriesMarquee } from "@/components/CountriesMarquee";
import { HowItWorks } from "@/components/HowItWorks";
import { getAllProjects } from "@/lib/projects";
import { getAllReviews } from "@/lib/reviews";
import { getStats } from "@/lib/stats";

// Страница серверная и асинхронная: данные для секций грузятся здесь,
// один раз, и уходят вниз пропсами. RecentProjects и ClientReviews —
// клиентские компоненты, сами в базу ходить не могут.
export default async function Home() {
  // Promise.all — оба запроса уходят одновременно и мы ждём оба разом.
  // Через два отдельных await они шли бы по очереди: сначала дождались
  // проектов, потом только начали грузить отзывы. Здесь они независимы,
  // так что ждать последовательно незачем.
  const [projects, reviews, stats] = await Promise.all([
    getAllProjects(),
    getAllReviews(),
    getStats(),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <Stats stats={stats} />
      <RecentProjects projects={projects} />
      <CountriesMarquee />
      <ClientReviews reviews={reviews} />
      <HowItWorks />
    </main>
  );
}
