import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { AuthForm } from "@/components/AuthForm";
import { PageGlow } from "@/components/PageGlow";
import { AuthErrorRedirect } from "@/components/AuthErrorRedirect";

// Тот же дисплейный шрифт, что у всех hero-заголовков сайта (см. DESIGN.md).
const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your SouCampus builds account to access your purchases and downloads.",
  // Служебная страница — как /shop и /terms, из поиска исключаем.
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  // ?next=/cart — куда вернуть после входа. searchParams в Next 16 — Promise.
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Ширину держит контент внутри (max-w-md) — см. комментарий в /profile.
  return (
    <main className="relative w-full overflow-x-clip px-6">
      {/* Протухшую ссылку из письма Supabase высаживает именно сюда, и
          причину кладёт в хэш — на сервер он не приходит. Компонент
          ловит её в браузере и уводит на /link-expired. */}
      <AuthErrorRedirect />
      <PageGlow color="rgba(249,115,22,0.28)" />
      <section className="relative pb-28 pt-20">
        {/* Радиальная подсветка позади навбара — общий приём hero-секций,
            цвет primary-акцента (orange). См. DESIGN.md → Hero-секции. */}

        <div className="mx-auto max-w-md text-center">
          <h1
            className={`${displayFont.className} text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
          >
            Welcome back
          </h1>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            Sign in to reach your purchases and downloads.
          </p>
        </div>

        <div className="mt-10">
          <AuthForm mode="login" next={next} />
        </div>
      </section>
    </main>
  );
}
