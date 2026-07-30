import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { PageGlow } from "@/components/PageGlow";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false },
};

// Сюда попадают из письма — через /auth/callback, который обменивает
// одноразовый код на сессию и уже с ней присылает человека на эту
// страницу (см. ForgotPasswordForm → redirectTo).
export default function ResetPasswordPage() {
  return (
    <main className="relative w-full overflow-x-clip px-6">
      <PageGlow color="rgba(249,115,22,0.28)" />
      <section className="relative pb-28 pt-20">
        <div className="mx-auto max-w-md text-center">
          <h1
            className={`${displayFont.className} text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
          >
            New password
          </h1>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            Pick something you haven&apos;t used here before.
          </p>
        </div>

        <div className="mt-10">
          <ResetPasswordForm />
        </div>
      </section>
    </main>
  );
}
