import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Unbounded } from "next/font/google";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/current-user";
import { readProfile, type Profile } from "@/lib/profiles";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { PageGlow } from "@/components/PageGlow";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false },
};

// Личная страница — не кэшируем, гасим унаследованный от (site)
// revalidate = 60 (подробно — в notifications/page.tsx).
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createSupabaseServer();
  const user = await getCurrentUser(supabase);

  if (!user) {
    redirect("/login?next=/settings");
  }

  // Обычно строка profiles есть (триггер создаёт её при регистрации).
  // Фоллбэк на метаданные — на случай аккаунтов до появления таблицы.
  const profile: Profile =
    (await readProfile(supabase, user.id)) ?? {
      // Строки нет — имени тоже нет. Пустая строка честнее выдуманного
      // значения: форма покажет поле пустым и потребует заполнить, а не
      // сохранит молча что-то из метаданных.
      username: "",
      usernameChangedAt: null,
      firstName: null,
      lastName: null,
      avatarUrl: null,
      bannerUrl: null,
      nameColor: null,
      // Строки profiles нет — значит и покупок за ней не числится:
      // выбор цвета такому аккаунту не показываем.
      isClient: false,
      bio: null,
      links: [],
    };

  // max-w-6xl — рамка страницы по DESIGN.md: с 26.10 рядом с формой стоит
  // превью профиля. Колонки (5:7) держит сетка в ProfileEditForm.
  // px-6 — ВНУТРИ рамки, на её контейнере, а не на <main> (17.11, владелец:
  // «Settings шире Portfolio и About»): снаружи отступ выносил контент за
  // рамку на 48px. Та же ошибка, что 16.11 у FAQ и Wiki (DESIGN.md).
  return (
    <main className="relative w-full overflow-x-clip">
      <PageGlow color="rgba(249,115,22,0.28)" />
      <section className="relative pb-28 pt-20">

        <div className="mx-auto max-w-6xl px-6">
          <h1
            className={`${displayFont.className} text-center text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
          >
            Settings
          </h1>

          <div className="mt-10">
            <ProfileEditForm initial={profile} userId={user.id} />
          </div>

        </div>
      </section>
    </main>
  );
}
