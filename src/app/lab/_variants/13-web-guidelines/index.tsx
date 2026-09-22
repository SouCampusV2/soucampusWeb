import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Public_Sans } from "next/font/google";
import {
  COUNTRIES,
  DISCORD_INVITE,
  HERO,
  PLANS_NOTE,
  SOCIALS,
  STEPS,
  noDash,
  type LabData,
} from "../../_shared/content";
import { BuildsTable, Estimator, ReviewTabs } from "./client";
import s from "./styles.module.css";

// Вариант 13 — web-design-guidelines (Vercel). Ветка design-lab.
//
// Скилл — это проверка по Web Interface Guidelines
// (raw.githubusercontent.com/vercel-labs/web-interface-guidelines,
// command.md, скачан 21.09). Вариант построен так, чтобы пройти её
// целиком. Что именно видно на странице:
//   Accessibility  ссылка «Skip to content», заголовки h1→h2→h3 без
//                  пропусков, scroll-margin-top у якорей, aria-live на
//                  калькуляторе, иконок без подписи нет
//   Focus          видимое :focus-visible у всего интерактивного
//   Forms          <label htmlFor>, type="number" + inputMode, name,
//                  autoComplete="off", ошибка рядом с полем
//   Navigation     сортировка таблицы и выбранный отзыв — в адресе
//                  (?sort=, ?review=), всё — настоящие <Link>
//   Typography     «…», типографские кавычки, tabular-nums, balance
//   Locale         цены через Intl.NumberFormat, бренд — translate="no"
//   Theming        color-scheme и <meta name="theme-color">
//   Touch          touch-action: manipulation, safe-area отступы
//   Images         width/height или fill с sizes, lazy ниже сгиба
//   Copy           Title Case у заголовков и кнопок
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--w-sans", preload: false });

// Цены как ЧИСЛА — чтобы форматировал Intl, а не строка в коде.
const PLAN_ROWS = [
  { name: "Free", amount: 0, period: "", note: "Access to part of the build library. See what's on offer before subscribing." },
  { name: "Builder", amount: 5.99, period: "month", note: "A lot of builds in the library so far, plus new ones each month. Builds are saved to your profile on the site." },
  { name: "Pro", amount: 9.99, period: "month", note: "Everything in Builder plus a commercial license for the builds and early access to new drops." },
  { name: "Support", amount: 25, period: "month", from: true, note: "For teams and servers: multiple members, shared library access and priority on custom orders." },
  { name: "Lifetime", amount: 300, period: "once", note: "One payment, lifetime access to the entire build library, including everything released in the future." },
];

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function WebGuidelines({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;

  return (
    <div className={`${publicSans.variable} ${s.root}`}>
      <meta name="theme-color" content="#f6f7f9" media="(prefers-color-scheme: light)" />
      <meta name="theme-color" content="#0f1115" media="(prefers-color-scheme: dark)" />

      <a href="#content" className={s.skip}>Skip to Content</a>

      <header className={s.header}>
        <Link href="/" className={s.brand} translate="no">SouCampus</Link>
        <nav aria-label="Main">
          <ul className={s.nav}>
            <li><Link href="/portfolio">Portfolio</Link></li>
            <li><Link href="/marketplace">Marketplace</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href={HERO.primary.href} className={s.btnPrimary}>Order a Map</Link></li>
          </ul>
        </nav>
      </header>

      <main id="content" className={s.main}>
        <section aria-labelledby="w-hero" className={s.hero}>
          <h1 id="w-hero" className={s.h1}>
            <span translate="no">SouCampus</span> Crafts Your Ideas and Dreams
          </h1>
          <p className={s.lede}>{HERO.lede}</p>
          <div className={s.actions}>
            <Link href={HERO.primary.href} className={s.btnPrimary}>Order a Map</Link>
            <Link href={HERO.secondary.href} className={s.btnSecondary}>See What I&rsquo;ve Built</Link>
          </div>
          <dl className={s.stats}>
            {stats.map((stat) => (
              <div key={stat.id}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}{stat.suffix}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="w-builds" className={s.section}>
          <h2 id="w-builds" className={s.h2}>Recent Builds</h2>
          <p className={s.muted}>Sort by any column. The order is kept in the address, so you can share it.</p>
          {/* useSearchParams внутри → граница Suspense обязательна.
              Запасной вариант — та же таблица без сортировки. */}
          <Suspense fallback={<BuildsTable projects={projects.map(toRow)} static />}>
            <BuildsTable projects={projects.map(toRow)} />
          </Suspense>
        </section>

        <section aria-labelledby="w-countries" className={s.section}>
          <h2 id="w-countries" className={s.h2}>Clients From 10 Countries</h2>
          <ul className={s.countries}>
            {COUNTRIES.map((c) => (
              <li key={c.id}>
                <Image src={c.src} alt="" width={20} height={20} loading="lazy" />
                {c.label}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="w-reviews" className={s.section}>
          <h2 id="w-reviews" className={s.h2}>What Clients Say</h2>
          <Suspense fallback={null}>
            <ReviewTabs reviews={reviews.map((r) => ({ slug: r.slug, name: r.name, role: r.role, text: noDash(r.text) }))} />
          </Suspense>
        </section>

        <section aria-labelledby="w-steps" className={s.section}>
          <h2 id="w-steps" className={s.h2}>How It Works</h2>
          <ol className={s.steps}>
            {STEPS.map((step) => (
              <li key={step.title}>
                <h3 className={s.h3}>{step.title}</h3>
                <p className={s.muted}>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="w-estimate" className={s.section}>
          <h2 id="w-estimate" className={s.h2}>Estimate Your Build</h2>
          <Estimator />
        </section>

        <section aria-labelledby="w-plans" className={s.section}>
          <h2 id="w-plans" className={s.h2}>Build Library Plans</h2>
          <p className={s.muted}>{PLANS_NOTE}</p>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <caption className="sr-only">Build library plans and prices</caption>
              <thead>
                <tr><th scope="col">Plan</th><th scope="col" className={s.num}>Price</th><th scope="col">What You Get</th></tr>
              </thead>
              <tbody>
                {PLAN_ROWS.map((p) => (
                  <tr key={p.name}>
                    <th scope="row">{p.name}</th>
                    <td className={s.num}>
                      {p.from ? "from " : ""}
                      {eur.format(p.amount)}
                      {p.period === "month" ? "/mo" : p.period === "once" ? " once" : ""}
                    </td>
                    <td>{p.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="w-order" className={s.section}>
          <h2 id="w-order" className={s.h2}>Tell Me What You Want Built</h2>
          <div className={s.actions}>
            <Link href={HERO.primary.href} className={s.btnPrimary}>Order a Map</Link>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={s.btnSecondary}>
              Join the Discord<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <p translate="no">SouCampus builds</p>
        <ul>
          {SOCIALS.map((l) => (
            <li key={l.label}>
              <a href={l.href} target="_blank" rel="noreferrer">{l.label}<span className="sr-only"> (opens in a new tab)</span></a>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}

function toRow(p: LabData["projects"][number]) {
  return { slug: p.slug, title: p.title, tag: p.tag, size: p.size, deadline: p.deadline, image: p.image };
}
