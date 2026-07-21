import { Hero } from "@/components/Hero";
import { Stats } from "@/components/Stats";
import { RecentProjects } from "@/components/RecentProjects";
import { ClientReviews } from "@/components/ClientReviews";
import { CountriesMarquee } from "@/components/CountriesMarquee";
import { HowItWorks } from "@/components/HowItWorks";
import { getAllProjects } from "@/lib/projects";
import { getAllReviews } from "@/lib/reviews";
import { getStats } from "@/lib/stats";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, SITE_SAMEAS, SITE_TAGLINE, SITE_URL } from "@/lib/site";

// Кто такой SouCampus (Organization) + сам сайт (WebSite) — машиночитаемо.
// Это и кормит брендовый ответ поиска. `@graph` — способ отдать несколько
// связанных сущностей одним блоком.
const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      alternateName: "SouCampus",
      url: SITE_URL,
      description: SITE_TAGLINE,
      logo: `${SITE_URL}/opengraph-image`,
      sameAs: SITE_SAMEAS,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

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
      <JsonLd data={HOME_JSON_LD} />
      <Hero />
      <Stats stats={stats} />
      <RecentProjects projects={projects} />
      <CountriesMarquee />
      <ClientReviews reviews={reviews} />
      <HowItWorks />
    </main>
  );
}
