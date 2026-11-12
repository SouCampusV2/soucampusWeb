import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { TwoStepChallenge } from "@/components/TwoStepChallenge";
import { PageGlow } from "@/components/PageGlow";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Confirm it's you",
  robots: { index: false, follow: false },
};

// Второй шаг входа — код из приложения (аудит 2026-11, S-25). Сюда уводит
// layout админки; разбор — в TwoStepChallenge и lib/admin.ts.
//
// Страница вне /admin намеренно: layout админки сюда и отправляет тех,
// кого сам ещё не пускает, — лежи она внутри, получился бы круг.
export default async function TwoStepPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="relative w-full overflow-x-clip px-6">
      <PageGlow color="rgba(249,115,22,0.28)" />
      <section className="relative pb-28 pt-20">
        <div className="mx-auto max-w-md text-center">
          <h1
            className={`${displayFont.className} text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
          >
            One more step
          </h1>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            Enter the six digits from your authenticator app.
          </p>
        </div>
        <div className="mt-10">
          <TwoStepChallenge next={next} />
        </div>
      </section>
    </main>
  );
}
