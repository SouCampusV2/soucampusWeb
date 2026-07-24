import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Unbounded } from "next/font/google";
import { createSupabaseServer } from "@/lib/supabase-server";
import { readProfile, type Profile } from "@/lib/profiles";
import { ProfileEditForm } from "@/components/ProfileEditForm";

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
    };

  return (
    <main className="mx-auto w-full max-w-6xl px-6">
      <section className="relative pb-28 pt-20">
        <div className="absolute -top-32 left-1/2 -z-10 h-[36rem] w-full max-w-[90rem] -translate-x-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.28),transparent_70%)]" />

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
