import type { Metadata } from "next";
import { TwoStepSetup } from "@/components/TwoStepSetup";

export const metadata: Metadata = {
  title: "Two-step sign-in",
  robots: { index: false, follow: false },
};

// Двухшаговый вход для админки (аудит 2026-11, S-25).
//
// Страница живёт ВНУТРИ /admin намеренно: гейт стоит в layout, и сюда
// попадает только админ. Обычному покупателю привязка приложения ничего
// бы не дала — код спрашивает только админка, — а выглядела бы как
// защита его аккаунта, которой на деле нет.
//
// Пока приложение не привязано, layout пускает сюда по одному паролю
// (иначе включить было бы негде); после — только с введённым кодом, так
// что отвязать приложение украденным паролем нельзя.
export default function AdminSecurityPage() {
  return (
    <div className="px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-md text-center">
        {/* H1 как у остальных страниц /admin (отчёт 16.11): служебная
            страница, дисплейный шрифт здесь ни к чему. */}
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Two-step sign-in
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          A code from your phone on top of the password — for this admin only.
        </p>
      </div>
      <div className="mt-10">
        <TwoStepSetup />
      </div>
    </div>
  );
}
