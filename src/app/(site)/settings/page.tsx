import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Unbounded } from "next/font/google";
import { createSupabaseServer } from "@/lib/supabase-server";
import { readProfile, type Profile } from "@/lib/profiles";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { PageGlow } from "@/components/PageGlow";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Edit profile",
  robots: { index: false },
};

export default async function ProfileEditPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Обычно строка profiles есть (триггер создаёт её при регистрации).
  // Фоллбэк на метаданные — на случай аккаунтов до появления таблицы.
  const profile: Profile =
    (await readProfile(supabase, user.id)) ?? {
      displayName:
        (user.user_metadata?.display_name as string | undefined) ?? "",
      firstName: null,
      lastName: null,
      avatarUrl: null,
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
            Edit profile
          </h1>

          <div className="mt-10">
            <ProfileEditForm initial={profile} userId={user.id} />
          </div>
        </div>
      </section>
    </main>
  );
}
