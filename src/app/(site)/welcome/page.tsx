import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Unbounded } from "next/font/google";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/current-user";
import { PageGlow } from "@/components/PageGlow";
import { WelcomeNameForm } from "@/components/WelcomeNameForm";

// Выбор имени после первого входа через Google.
//
// force-dynamic — как у всех личных страниц: группа (site) наследует
// revalidate = 60, а кэш на минуту для «кто ты и назвался ли» неверен.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose your name",
  // Личная страница — в выдаче ей делать нечего.
  robots: { index: false, follow: false },
};

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export default async function WelcomePage() {
  const supabase = await createSupabaseServer();
  const user = await getCurrentUser(supabase);

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, username_claimed")
    .eq("id", user.id)
    .maybeSingle();

  // Имя уже заявлено — страница пуста по смыслу. Отправляем в каталог, а
  // не показываем форму «поменяй имя»: это не страница настроек, и
  // смена отсюда стоила бы человеку месячной паузы без предупреждения.
  if (!profile || profile.username_claimed) redirect("/marketplace");

  return (
    <main className="relative w-full overflow-x-clip px-6">
      <section className="relative mx-auto max-w-6xl pb-8 pt-20 sm:pb-12">
        <PageGlow color="rgba(251,146,60,0.35)" />
        <div className="mx-auto max-w-md">
          <span className="text-sm font-semibold text-orange-500">
            Almost there
          </span>
          <h1
            className={`${displayFont.className} mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
          >
            Pick your name
          </h1>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            Google doesn&apos;t give us a username, so we made one up from your
            email address. Change it to whatever you&apos;d rather be called —
            or keep it.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl pb-20 sm:pb-28">
        {/* Придуманное базой имя подставлено в поле заранее: человек
            видит, от чего отталкивается, и может просто нажать Continue.
            Пустое поле здесь означало бы «придумай с нуля» — лишняя
            работа там, где ответ уже есть. */}
        <WelcomeNameForm suggested={profile.username} />
      </section>
    </main>
  );
}
