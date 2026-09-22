import Image from "next/image";
import Link from "next/link";
import {
  COUNTRIES,
  DISCORD_INVITE,
  HERO,
  PLANS,
  PLANS_NOTE,
  SOCIALS,
  STEPS,
  noDash,
  pickWork,
  type LabData,
} from "../../_shared/content";
import { BuildDialog, ReviewTabs, StepsAccordion } from "./client";
import { cn } from "./cn";

// Вариант 23 — baseline-ui (ibelick, «deslop UI»). Ветка design-lab.
//
// Скилл — это не стиль, а набор запретов и обязательств против «ИИ-вида».
// Здесь они выполнены буквально, поэтому страница самая «обычная» из
// двадцати пяти — и это её смысл: так выглядит чистая база, на которую
// потом кладут характер.
//   MUST   Tailwind по умолчанию (zinc + один синий акцент), cn(),
//          доступные примитивы Base UI для всего с фокусом,
//          text-balance у заголовков и text-pretty у текста,
//          tabular-nums у данных, h-dvh вместо h-screen, aria-label у
//          кнопок-иконок, у пустого — одно следующее действие.
//   NEVER  градиентов, свечения, своих кривых, изменения letter-spacing,
//          анимации без просьбы, анимации дольше 200ms у отклика,
//          анимации width/height/top/left — поэтому индикатор вкладок
//          едет transform'ом, а аккордеон не «растёт», а проявляется.
// Шрифт — системный стек (не font-sans: в проекте он переопределён на
// Plus Jakarta, а вариант не берёт ничего из нашей дизайн-системы).
export function BaselineUi({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 6);

  const button = "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors";

  return (
    <div className="min-h-dvh bg-zinc-50 font-[ui-sans-serif,system-ui,sans-serif] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="font-semibold">SouCampus</Link>
          <nav aria-label="Main" className="flex items-center gap-4 text-sm text-zinc-600">
            <Link href="/portfolio" className="hidden hover:text-zinc-900 sm:block">Portfolio</Link>
            <Link href="/marketplace" className="hidden hover:text-zinc-900 sm:block">Marketplace</Link>
            <Link href={HERO.primary.href} className={cn(button, "bg-blue-600 text-white hover:bg-blue-700")}>{HERO.primary.label}</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <section className="py-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <h1 className="max-w-2xl text-4xl font-semibold text-balance sm:text-5xl">{HERO.title}</h1>
          <p className="mt-4 max-w-xl text-lg text-pretty text-zinc-600">{HERO.lede}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={HERO.primary.href} className={cn(button, "bg-blue-600 text-white hover:bg-blue-700")}>{HERO.primary.label}</Link>
            <Link href={HERO.secondary.href} className={cn(button, "border border-zinc-200 bg-white hover:bg-zinc-50")}>{HERO.secondary.label}</Link>
          </div>
          <dl className="mt-12 grid gap-4 sm:grid-cols-3">
            {stats.map((st) => (
              <div key={st.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                <dt className="text-sm text-zinc-500">{st.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{st.value}{st.suffix}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="b-work" className="py-12">
          <h2 id="b-work" className="text-2xl font-semibold text-balance">Recent builds</h2>
          <p className="mt-1 text-pretty text-zinc-600">Select a build to see its details.</p>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3">
            {work.map((p) => (
              <BuildDialog
                key={p.slug}
                build={{ slug: p.slug, title: p.title, tag: p.tag, image: p.image, summary: noDash(p.summary), size: p.size, deadline: p.deadline, price: p.price }}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="b-reviews" className="py-12">
          <h2 id="b-reviews" className="text-2xl font-semibold text-balance">What clients say</h2>
          <div className="mt-6">
            <ReviewTabs reviews={reviews.slice(0, 5).map((r) => ({ slug: r.slug, name: r.name, role: r.role, text: noDash(r.text) }))} />
          </div>
          <ul className="mt-8 flex flex-wrap gap-2">
            {COUNTRIES.map((c) => (
              <li key={c.id} className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-sm">
                <Image src={c.src} alt="" width={16} height={16} className="size-4 rounded-full" />
                {c.label}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="b-steps" className="py-12">
          <h2 id="b-steps" className="text-2xl font-semibold text-balance">How an order goes</h2>
          <div className="mt-6">
            <StepsAccordion steps={STEPS.map((x) => ({ ...x }))} />
          </div>
        </section>

        <section aria-labelledby="b-plans" className="py-12">
          <h2 id="b-plans" className="text-2xl font-semibold text-balance">Build library</h2>
          <p className="mt-1 text-pretty text-zinc-600">{PLANS_NOTE}</p>
          <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr><th className="px-4 py-3 font-medium">Plan</th><th className="px-4 py-3 font-medium">Price</th><th className="hidden px-4 py-3 font-medium sm:table-cell">Includes</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {PLANS.map((p) => (
                  <tr key={p.name}>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{p.price}</td>
                    <td className="hidden px-4 py-3 text-pretty text-zinc-600 sm:table-cell">{p.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="py-16">
          <div className="rounded-lg border border-zinc-200 bg-white p-8">
            <h2 className="text-2xl font-semibold text-balance">Tell me what you want built</h2>
            <p className="mt-1 text-pretty text-zinc-600">Describe your idea and get a price and timeline.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={HERO.primary.href} className={cn(button, "bg-blue-600 text-white hover:bg-blue-700")}>{HERO.primary.label}</Link>
              <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={cn(button, "border border-zinc-200 bg-white hover:bg-zinc-50")}>Discord</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-x-6 gap-y-2 px-4 py-8 pb-28 text-sm text-zinc-500">
          {SOCIALS.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="hover:text-zinc-900">{l.label}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
