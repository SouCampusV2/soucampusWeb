import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Unbounded } from "next/font/google";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/current-user";
import { isCreator, isAdminProfile, getSubmissionBlock } from "@/lib/creator-applications";
import { PageGlow } from "@/components/PageGlow";
import { AddMapScreen } from "@/components/AddMapScreen";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Add a map",
  robots: { index: false },
};

// Личная страница — не кэшируем (см. resources/page.tsx).
export const dynamic = "force-dynamic";

// Дверь автора к форме загрузки — шаг 4 разморозки креаторства
// (docs/SCANNER.md § 1). С 28.08 форма жила только в админке, и автор,
// не будучи админом, получал там 404.
//
// Флаг CREATOR_SIGNUPS_OPEN здесь НЕ спрашивается: страница пускает по
// is_creator, а креатором без заявки не стать — заявку держат флаг и
// обработчик. Пока приём закрыт, креатор один — владелец.
export default async function AddMapForCreatorPage() {
  const supabase = await createSupabaseServer();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login?next=/resources/new");

  // Не креатор и автор на паузе после тяжёлого отказа — оба на
  // /resources: там заявка и плашка с датой паузы. Объяснять то же
  // самое второй раз здесь значило бы завести второе место, которое
  // однажды скажет другое.
  const creator = await isCreator(supabase, user.id);
  const blockedUntil = creator
    ? await getSubmissionBlock(supabase, user.id)
    : null;
  if (!creator || blockedUntil) redirect("/resources");

  return (
    <main className="relative w-full overflow-x-clip px-6">
      <PageGlow color="rgba(249,115,22,0.28)" />
      <section className="relative pb-28 pt-20">
        <div className="mx-auto max-w-3xl">
          <h1
            className={`${displayFont.className} text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
          >
            Add a map
          </h1>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Every map is reviewed before it reaches the marketplace. You&apos;ll
            get a notification when there&apos;s a decision.
          </p>

          <AddMapScreen
            userId={user.id}
            submittedHref="/resources/new/submitted"
            cancelHref="/resources"
            freeOnly={!(await isAdminProfile(supabase, user.id))}
          />
        </div>
      </section>
    </main>
  );
}
