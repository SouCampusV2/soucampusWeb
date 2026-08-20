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
      displayName: user.displayName ?? "",
      firstName: null,
      lastName: null,
      avatarUrl: null,
      nameColor: null,
      // Строки profiles нет — значит и покупок за ней не числится:
      // выбор цвета такому аккаунту не показываем.
      isClient: false,
      bio: null,
    };

  // Ширину держит контент внутри (max-w-md) — см. комментарий в /profile.
  return (
    <main className="relative w-full overflow-x-clip px-6">
      <PageGlow color="rgba(249,115,22,0.28)" />
      <section className="relative pb-28 pt-20">

        <div className="mx-auto max-w-md">
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
