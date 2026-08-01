import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { LinkBreak } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/Button";
import { PageGlow } from "@/components/PageGlow";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "This link doesn't work anymore",
  robots: { index: false },
};

// Куда попадает человек, чья ссылка из письма протухла или уже была
// использована.
//
// Раньше такого места не было, и Supabase высаживал его на /login с
// адресом вида
//   /login#error=access_denied&error_code=otp_expired&error_description=…
// то есть на обычную форму входа, поверх которой висит сырая английская
// техническая строка в адресной строке — а на самой странице ни слова о
// том, что произошло. Человек видит «войдите», хотя войти он как раз и
// не может: он пришёл менять пароль.
//
// Отсюда отдельная страница: она называет причину человеческим языком и
// даёт ровно одно нужное действие — запросить свежую ссылку.
//
// Причина приходит в ?reason (наш callback) или разбирается из хэша
// (AuthErrorRedirect — Supabase кладёт ошибку во фрагмент, который на
// сервер не попадает вовсе).
export default async function LinkExpiredPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  // Разбираем только то, что реально отличается для пользователя.
  // Остальные коды Supabase (их десяток) сводятся к одному и тому же
  // «ссылка не сработала», и плодить под них тексты незачем.
  const isExpired = reason === "otp_expired";

  return (
    <main className="relative w-full overflow-x-clip px-6">
      <PageGlow color="rgba(249,115,22,0.28)" />
      <section className="relative flex flex-col items-center pb-28 pt-24 text-center">
        <LinkBreak size={56} weight="thin" className="text-zinc-400 dark:text-zinc-600" />
        <h1
          className={`${displayFont.className} mt-6 text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl`}
        >
          This link doesn&apos;t work anymore
        </h1>
        <p className="mx-auto mt-4 max-w-md text-zinc-600 dark:text-zinc-400">
          {isExpired
            ? "Links from our emails expire within the hour and can only be used once. Yours has run out — request a fresh one and it'll work."
            : "The link was already used, or it wasn't complete. Request a fresh one and it'll work."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href="/forgot-password">Request a new link</Button>
          <Button href="/login" variant="secondary">
            Back to sign in
          </Button>
        </div>
      </section>
    </main>
  );
}
