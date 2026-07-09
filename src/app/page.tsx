import { Hero } from "@/components/Hero";
import { RecentProjects } from "@/components/RecentProjects";
import { ClientReviews } from "@/components/ClientReviews";
import { HowItWorks } from "@/components/HowItWorks";
import { ContactFooter } from "@/components/ContactFooter";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <RecentProjects />
      <ClientReviews />
      <HowItWorks />
      <ContactFooter />
    </main>
  );
}
