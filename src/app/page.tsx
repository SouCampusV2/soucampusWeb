import { Hero } from "@/components/Hero";
import { Stats } from "@/components/Stats";
import { RecentProjects } from "@/components/RecentProjects";
import { ClientReviews } from "@/components/ClientReviews";
import { CountriesMarquee } from "@/components/CountriesMarquee";
import { HowItWorks } from "@/components/HowItWorks";
import { AuthorCta } from "@/components/AuthorCta";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <Stats />
      <RecentProjects />
      <CountriesMarquee />
      <ClientReviews />
      <HowItWorks />
      <AuthorCta />
    </main>
  );
}
