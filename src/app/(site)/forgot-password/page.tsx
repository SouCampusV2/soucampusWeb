import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { PageGlow } from "@/components/PageGlow";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Reset your password",
  // Служебная страница — как /login и /signup, из поиска исключаем.
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  // Ширину держит контент внутри (max-w-md) — см. комментарий в /profile.
  return (
    <main className="relative w-full overflow-x-clip px-6">
      <PageGlow color="rgba(249,115,22,0.28)" />
      <section className="relative pb-28 pt-20">
        <div className="mx-auto max-w-md text-center">
          <h1
            className={`${displayFont.className} text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
          >
            Reset password
          </h1>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            Enter your email and we&apos;ll send you a link to set a new one.
          </p>
        </div>

        <div className="mt-10">
          <ForgotPasswordForm />
        </div>
      </section>
    </main>
  );
}
