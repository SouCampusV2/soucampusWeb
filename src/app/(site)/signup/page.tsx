import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { AuthForm } from "@/components/AuthForm";
import { PageGlow } from "@/components/PageGlow";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a SouCampus builds account to buy maps and keep your downloads in one place.",
  robots: { index: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Ширину держит контент внутри (max-w-md) — см. комментарий в /profile.
  return (
    <main className="relative w-full overflow-x-clip px-6">
      <PageGlow color="rgba(249,115,22,0.28)" />
      <section className="relative pb-28 pt-20">

        <div className="mx-auto max-w-md text-center">
          <h1
            className={`${displayFont.className} text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
          >
            Create account
          </h1>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            One account for every map you buy and download.
          </p>
        </div>

        <div className="mt-10">
          <AuthForm mode="signup" next={next} />
        </div>
      </section>
    </main>
  );
}
