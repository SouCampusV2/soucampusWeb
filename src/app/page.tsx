import { Hero } from "@/components/Hero";
import { Stats } from "@/components/Stats";
import { RecentProjects } from "@/components/RecentProjects";
import { ClientReviews } from "@/components/ClientReviews";
import { HowItWorks } from "@/components/HowItWorks";
import { ContactFooter } from "@/components/ContactFooter";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <Stats />
      <RecentProjects />
      <ClientReviews />
      <HowItWorks />
      <ContactFooter />
    </main>
  );
}
