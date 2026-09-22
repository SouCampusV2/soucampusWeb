import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
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
import { FadeIn, OrderShortcut } from "./client";

// Вариант 5 — minimalist-skill «Premium Utilitarian Minimalism» (Leonxlnx).
//
// Страница как хорошо оформленный документ:
//   • тёплый монохром: холст #F7F6F3, текст #2F3437, вторичный #787774,
//     все линии ровно 1px #EAEAEA (§4, §8.4);
//   • заголовки — редакционный сериф Newsreader с плотным трекингом,
//     текст — Geist, метаданные — Geist Mono (§3);
//   • цвет только пастельными метками (§4 accents);
//   • bento асимметричное, радиусы 8–12px, без теней (§5);
//   • картинки построек — в «окне ОС» с тремя серыми точками (§5);
//   • шаги — аккордеон без коробок, только нижние линии и +/− (§5);
//   • клавиша O ведёт к заказу — «keystroke micro-UI» (§5);
//   • движение почти невидимое: подъём на 12px за 600ms каскадом (§7).
const geist = Geist({ subsets: ["latin"], variable: "--m-sans", preload: false });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--m-mono", preload: false });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--m-serif", preload: false, style: ["normal", "italic"] });

const TAG = ["bg-[#EDF3EC] text-[#346538]", "bg-[#E1F3FE] text-[#1F6C9F]", "bg-[#FBF3DB] text-[#956400]", "bg-[#FDEBEC] text-[#9F2F2D]"];

const serif = "font-[family-name:var(--m-serif)] tracking-[-0.03em]";
const mono = "font-[family-name:var(--m-mono)]";

export function Minimalist({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 4);
  const lead = work[0];

  return (
    <div className={`${geist.variable} ${geistMono.variable} ${newsreader.variable} relative min-h-[100dvh] overflow-x-clip bg-[#F7F6F3] font-[family-name:var(--m-sans)] leading-[1.6] text-[#2F3437] selection:bg-[#FBF3DB]`}>
      {/* Единственное фоновое движение: очень медленное тёплое пятно на
          фиксированном слое (§7 Background Ambient Motion). */}
      <div aria-hidden="true" className="pointer-events-none fixed -left-40 top-20 h-[36rem] w-[36rem] animate-[drift_28s_ease-in-out_infinite_alternate] rounded-full bg-[radial-gradient(closest-side,rgba(214,160,90,0.08),transparent)] motion-reduce:animate-none" />
      <style>{`@keyframes drift{to{transform:translate(40vw,30vh)}}`}</style>
      <OrderShortcut />

      <header className="sticky top-0 z-20 border-b border-[#EAEAEA] bg-[#F7F6F3]/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="font-medium">SouCampus</Link>
          <nav aria-label="Main" className="flex items-center gap-6 text-[14px] text-[#787774]">
            <Link href="/portfolio" className="hidden hover:text-[#2F3437] sm:block">Portfolio</Link>
            <Link href="/marketplace" className="hidden hover:text-[#2F3437] sm:block">Marketplace</Link>
            <Link href={HERO.primary.href} className="rounded-[6px] bg-[#111] px-3 py-1.5 text-white transition-[background-color,transform] hover:bg-[#333] active:scale-[0.98]">
              {HERO.primary.label}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5">
        <section className="pb-16 pt-24 md:pt-32">
          <FadeIn>
            <h1 className={`${serif} max-w-3xl text-[clamp(2.75rem,6vw,4.75rem)] leading-[1.05]`}>
              SouCampus crafts your ideas and <em>dreams</em>
            </h1>
          </FadeIn>
          <FadeIn index={1}>
            <p className="mt-6 max-w-xl text-lg text-[#787774]">{HERO.lede}</p>
          </FadeIn>
          <FadeIn index={2}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={HERO.primary.href} className="rounded-[6px] bg-[#111] px-5 py-2.5 text-white transition-[background-color,transform] hover:bg-[#333] active:scale-[0.98]">
                {HERO.primary.label}
              </Link>
              <Link href={HERO.secondary.href} className="rounded-[6px] border border-[#EAEAEA] bg-white px-5 py-2.5 transition-transform hover:bg-[#FBFBFA] active:scale-[0.98]">
                {HERO.secondary.label}
              </Link>
              <span className="ml-1 text-[13px] text-[#787774]">
                or press <Kbd>O</Kbd>
              </span>
            </div>
          </FadeIn>
        </section>

        {lead && (
          <FadeIn index={3}>
            <Window title={lead.title}>
              <div className="relative aspect-[16/8]">
                <Image src={lead.image} alt={lead.title} fill priority sizes="(min-width: 1024px) 1000px, 100vw" className="object-cover saturate-[.8] sepia-[.08]" />
              </div>
            </Window>
          </FadeIn>
        )}

        {/* Цифры и страны — bento из трёх клеток. */}
        <section aria-label="In numbers" className="grid gap-3 py-24 md:grid-cols-3 md:py-32">
          {stats.map((stat, i) => (
            <FadeIn key={stat.id} index={i}>
              <div className="h-full rounded-[12px] border border-[#EAEAEA] bg-white p-8 transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <p className={`${serif} text-5xl`}>{stat.value}{stat.suffix}</p>
                <p className="mt-2 text-[#787774]">{stat.label}</p>
              </div>
            </FadeIn>
          ))}
          <FadeIn index={3} className="md:col-span-3">
            <div className="rounded-[12px] border border-[#EAEAEA] bg-white p-8">
              <p className="text-[#787774]">Clients from ten countries</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {COUNTRIES.map((c, i) => (
                  <li key={c.id} className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.05em] ${TAG[i % TAG.length]}`}>
                    <Image src={c.src} alt="" width={14} height={14} className="rounded-full" />
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        </section>

        {/* Работы — асимметричное bento: широкая + узкая, узкая + широкая. */}
        <section aria-labelledby="m-work" className="py-24 md:py-32">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="m-work" className={`${serif} text-[clamp(2rem,4vw,3rem)] leading-[1.1]`}>Recent builds</h2>
            <Link href={HERO.secondary.href} className="text-[#787774] underline decoration-[#EAEAEA] underline-offset-4 hover:text-[#2F3437]">
              {HERO.secondary.label}
            </Link>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-5">
            {work.map((p, i) => (
              <FadeIn key={p.slug} index={i} className={i === 0 || i === 3 ? "md:col-span-3" : "md:col-span-2"}>
                <Link href={`/portfolio/${p.slug}`} className="group block h-full rounded-[12px] border border-[#EAEAEA] bg-white p-3 transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[8px]">
                    <Image src={p.image} alt={p.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover saturate-[.85]" />
                  </div>
                  <div className="p-3 pt-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{p.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-[0.05em] ${TAG[i % TAG.length]}`}>{p.tag}</span>
                    </div>
                    <p className="mt-2 text-[15px] text-[#787774]">{noDash(p.summary)}</p>
                    <p className={`${mono} mt-4 text-[12px] text-[#787774]`}>
                      {p.size} / {p.deadline} / {p.price}
                    </p>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* Отзывы — две колонки, разделённые линиями, цитаты сериф-курсивом. */}
        <section aria-labelledby="m-reviews" className="py-24 md:py-32">
          <h2 id="m-reviews" className={`${serif} text-[clamp(2rem,4vw,3rem)] leading-[1.1]`}>What clients said</h2>
          <div className="mt-10 grid border-t border-[#EAEAEA] md:grid-cols-2">
            {reviews.map((r, i) => (
              <FadeIn key={r.slug} index={i % 2}>
                <figure className={`h-full border-b border-[#EAEAEA] py-8 ${i % 2 === 0 ? "md:border-r md:pr-8" : "md:pl-8"}`}>
                  <blockquote className={`${serif} text-[22px] italic leading-[1.45] tracking-[-0.01em]`}>“{noDash(r.text)}”</blockquote>
                  <figcaption className="mt-4 text-[14px] text-[#787774]">
                    {r.flag} <span className="text-[#2F3437]">{r.name}</span>, {r.role}
                  </figcaption>
                </figure>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* Шаги — аккордеон. <details> работает без JS и с клавиатуры. */}
        <section aria-labelledby="m-steps" className="py-24 md:py-32">
          <h2 id="m-steps" className={`${serif} text-[clamp(2rem,4vw,3rem)] leading-[1.1]`}>How an order goes</h2>
          <div className="mt-10 border-t border-[#EAEAEA]">
            {STEPS.map((step, i) => (
              <details key={step.title} className="group border-b border-[#EAEAEA]" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-baseline gap-4">
                    <span className={`${mono} text-[12px] text-[#787774]`}>{i + 1}</span>
                    <span className="text-lg font-medium">{step.title}</span>
                  </span>
                  <span aria-hidden="true" className={`${mono} text-lg text-[#787774] group-open:hidden`}>+</span>
                  <span aria-hidden="true" className={`${mono} hidden text-lg text-[#787774] group-open:inline`}>−</span>
                </summary>
                <p className="max-w-xl pb-6 pl-8 text-[#787774]">{step.text}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Тарифы — bento 2+3. */}
        <section aria-labelledby="m-plans" className="py-24 md:py-32">
          <h2 id="m-plans" className={`${serif} text-[clamp(2rem,4vw,3rem)] leading-[1.1]`}>The build library</h2>
          <p className="mt-3 text-[#787774]">{PLANS_NOTE}</p>
          <div className="mt-10 grid gap-3 md:grid-cols-6">
            {PLANS.map((plan, i) => (
              <FadeIn key={plan.name} index={i} className={i < 2 ? "md:col-span-3" : "md:col-span-2"}>
                <div className={`flex h-full flex-col justify-between gap-8 rounded-[12px] border p-7 ${plan.name === "Lifetime" ? "border-[#111] bg-[#111] text-white" : "border-[#EAEAEA] bg-white"}`}>
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium">{plan.name}</p>
                    <p className={`${mono} text-[13px] ${plan.name === "Lifetime" ? "text-white/70" : "text-[#787774]"}`}>{plan.price}</p>
                  </div>
                  <p className={plan.name === "Lifetime" ? "text-white/75" : "text-[#787774]"}>{plan.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        <section className="border-t border-[#EAEAEA] py-24 md:py-32">
          <h2 className={`${serif} max-w-2xl text-[clamp(2.5rem,5vw,4rem)] leading-[1.05]`}>Tell me what you want built.</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={HERO.primary.href} className="rounded-[6px] bg-[#111] px-5 py-2.5 text-white hover:bg-[#333] active:scale-[0.98]">
              {HERO.primary.label}
            </Link>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="rounded-[6px] border border-[#EAEAEA] bg-white px-5 py-2.5 hover:bg-[#FBFBFA]">
              Discord
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#EAEAEA]">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-4 px-5 py-8 text-[14px] text-[#787774]">
          <span>SouCampus builds</span>
          <ul className="flex flex-wrap gap-5">
            {SOCIALS.map((l) => (
              <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer" className="hover:text-[#2F3437]">{l.label}</a></li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 rounded-[4px] border border-[#EAEAEA] bg-[#F7F6F3] px-1.5 py-0.5 font-[family-name:var(--m-sans)] text-[12px] font-medium text-[#2F3437]">
      {children}
    </kbd>
  );
}

/** «Окно ОС» вокруг картинки: белая полоса и три серые точки. */
function Window({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <figure className="overflow-hidden rounded-[12px] border border-[#EAEAEA] bg-white">
      <div className="flex items-center gap-3 border-b border-[#EAEAEA] px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#E3E2DE]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#E3E2DE]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#E3E2DE]" />
        </span>
        <figcaption className="font-[family-name:var(--m-mono)] text-[12px] text-[#787774]">{title}</figcaption>
      </div>
      {children}
    </figure>
  );
}
