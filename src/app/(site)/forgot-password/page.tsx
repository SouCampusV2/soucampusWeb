import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { PageGlow } from "@/components/PageGlow";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/current-user";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Reset your password",
  // Служебная страница — как /login и /signup, из поиска исключаем.
  robots: { index: false },
};

// Одна страница обслуживает два разных сценария, и путать их нельзя:
//
//   гость   — «забыл пароль»: вводит адрес, получает ссылку;
//   вошедший — «сменить пароль» из настроек: адрес уже известен,
//              подтверждение всё равно идёт письмом.
//
// Раньше вошедшему показывалось ровно то же, что гостю, вместе со
// ссылкой «Remembered it? Sign in». То есть со страницы смены СВОЕГО
// пароля можно было в один клик войти в другой аккаунт — молча, не
// выйдя из текущего (баг найден владельцем 2026-07-31). Поэтому кто
// перед нами, решает сессия, а не догадка.
export default async function ForgotPasswordPage() {
  const supabase = await createSupabaseServer();
  const user = await getCurrentUser(supabase);
  const signedInEmail = user?.email ?? null;

  // Ширину держит контент внутри (max-w-md) — см. комментарий в /profile.
  return (
    <main className="relative w-full overflow-x-clip px-6">
      <PageGlow color="rgba(249,115,22,0.28)" />
      <section className="relative pb-28 pt-20">
        <div className="mx-auto max-w-md text-center">
          <h1
            className={`${displayFont.className} text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
          >
            {signedInEmail ? "Change password" : "Reset password"}
          </h1>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            {signedInEmail
              ? "We'll email you a link to confirm it's you and set a new one."
              : "Enter your email and we'll send you a link to set a new one."}
          </p>
        </div>

        <div className="mt-10">
          <ForgotPasswordForm signedInEmail={signedInEmail} />
        </div>
      </section>
    </main>
  );
}
