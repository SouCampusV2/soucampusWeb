import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { AuthForm } from "@/components/AuthForm";

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
  return (
    <main className="mx-auto w-full max-w-6xl px-6">
      <section className="relative pb-28 pt-20">
        <div className="absolute -top-32 left-1/2 -z-10 h-[36rem] w-full max-w-[90rem] -translate-x-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.28),transparent_70%)]" />

        <div className="mx-auto max-w-md text-center">
          <h1
            className={`${displayFont.className} text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
          >
            Create your account
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
