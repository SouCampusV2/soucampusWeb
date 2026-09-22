import Image from "next/image";
import Link from "next/link";
import { estimateDeadlineDays, estimatePrice, formatDeadline } from "@/lib/pricing";
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
import s from "./styles.module.css";

// Вариант 15 — react-best-practices (Vercel). Ветка design-lab.
//
// Скилл — 70 правил скорости. Вариант доводит их до предела, и это
// видно, а не только измеряется:
//   bundle-*     ни одного "use client" в варианте: в браузер не уходит
//                ни байта JS этой страницы (переключатель лаборатории —
//                не часть варианта);
//   server-*     все вычисления на сервере, включая калькулятор: вместо
//                ползунков — таблица цен для ходовых размеров, посчитанная
//                ТОЙ ЖЕ формулой из pricing.ts;
//   rendering-*  content-visibility: auto у секций ниже сгиба — браузер
//                не раскладывает то, чего не видно;
//   шрифты       системные: ни одного запроса за шрифтом, ни одного
//                сдвига вёрстки из-за его подмены;
//   картинки     hero — priority, остальные ленивые, у всех sizes;
//   движение     CSS scroll-driven animations (animation-timeline: view())
//                под @supports: где их нет, страница просто статична.
const SIZES: [number, number][] = [
  [100, 100],
  [200, 200],
  [300, 300],
  [500, 500],
  [1000, 1000],
];

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function BestPractices({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 6);
  const [lead, ...rest] = work;

  return (
    <div className={s.root}>
      <header className={s.header}>
        <Link href="/" className={s.brand}>SouCampus</Link>
        <nav aria-label="Main" className={s.nav}>
          <Link href="/portfolio">Portfolio</Link>
          <Link href="/marketplace">Marketplace</Link>
          <Link href={HERO.primary.href} className={s.btn}>{HERO.primary.label}</Link>
        </nav>
      </header>

      <main>
        <section className={s.hero}>
          <h1 className={s.h1}>{HERO.title}</h1>
          <div className={s.heroRow}>
            <p className={s.lede}>{HERO.lede}</p>
            <div className={s.actions}>
              <Link href={HERO.primary.href} className={s.btn}>{HERO.primary.label}</Link>
              <Link href={HERO.secondary.href} className={s.btnGhost}>{HERO.secondary.label}</Link>
            </div>
          </div>
          {lead && (
            <Link href={`/portfolio/${lead.slug}`} className={s.heroImg}>
              <Image src={lead.image} alt={lead.title} fill priority sizes="(min-width: 1200px) 1160px, 100vw" />
            </Link>
          )}
        </section>

        <section aria-label="In numbers" className={`${s.section} ${s.cv}`}>
          <dl className={s.stats}>
            {stats.map((stat) => (
              <div key={stat.id} className={s.reveal}>
                <dd>{stat.value}{stat.suffix}</dd>
                <dt>{stat.label}</dt>
              </div>
            ))}
          </dl>
          <p className={s.countries}>
            Clients from{" "}
            {COUNTRIES.map((c, i) => (
              <span key={c.id} className={s.country}>
                <Image src={c.src} alt="" width={16} height={16} loading="lazy" />
                {c.label}
                {i < COUNTRIES.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        </section>

        <section aria-labelledby="z-work" className={`${s.section} ${s.cv}`}>
          <h2 id="z-work" className={`${s.h2} ${s.reveal}`}>Recent builds</h2>
          <ul className={s.work}>
            {rest.map((p) => (
              <li key={p.slug} className={s.reveal}>
                <Link href={`/portfolio/${p.slug}`} className={s.workLink}>
                  <span className={s.workImg}>
                    <Image src={p.image} alt="" fill loading="lazy" sizes="(min-width: 900px) 30vw, 90vw" />
                  </span>
                  <span className={s.workTitle}>{p.title}</span>
                  <span className={s.muted}>{p.tag}, {p.size}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href={HERO.secondary.href} className={s.more}>{HERO.secondary.label}</Link>
        </section>

        <section aria-labelledby="z-price" className={`${s.section} ${s.cv}`}>
          <h2 id="z-price" className={`${s.h2} ${s.reveal}`}>What a build costs</h2>
          <p className={s.muted}>Rough estimates from size alone, calculated on the server. The exact price is agreed after we talk.</p>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr><th scope="col">Footprint</th><th scope="col">From</th><th scope="col">Ready in</th></tr>
              </thead>
              <tbody>
                {SIZES.map(([w, l]) => (
                  <tr key={w}>
                    <th scope="row">{w} × {l} blocks</th>
                    <td>{eur.format(estimatePrice(w, l))}</td>
                    <td>{formatDeadline(estimateDeadlineDays(w, l))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="z-steps" className={`${s.section} ${s.cv}`}>
          <h2 id="z-steps" className={`${s.h2} ${s.reveal}`}>How an order goes</h2>
          <ol className={s.steps}>
            {STEPS.map((step) => (
              <li key={step.title} className={s.reveal}>
                <strong>{step.title}.</strong> {step.text}
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="z-reviews" className={`${s.section} ${s.cv}`}>
          <h2 id="z-reviews" className={`${s.h2} ${s.reveal}`}>What clients say</h2>
          <ul className={s.reviews}>
            {reviews.map((r) => (
              <li key={r.slug}>
                <blockquote>{noDash(r.text)}</blockquote>
                <p className={s.muted}>{r.flag} {r.name}, {r.role}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="z-plans" className={`${s.section} ${s.cv}`}>
          <h2 id="z-plans" className={`${s.h2} ${s.reveal}`}>The build library</h2>
          <p className={s.muted}>{PLANS_NOTE}</p>
          <ul className={s.plans}>
            {PLANS.map((plan) => (
              <li key={plan.name} className={plan.name === "Lifetime" ? s.planStrong : undefined}>
                <span className={s.planName}>{plan.name}</span>
                <span className={s.planPrice}>{plan.price}</span>
                <span>{plan.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${s.section} ${s.final}`}>
          <h2 className={s.h1}>Tell me what you want built</h2>
          <div className={s.actions}>
            <Link href={HERO.primary.href} className={s.btn}>{HERO.primary.label}</Link>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={s.btnGhost}>Discord</a>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <ul>
          {SOCIALS.map((l) => (
            <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>
          ))}
        </ul>
        <p className={s.muted}>This page ships no JavaScript of its own and loads no web fonts.</p>
      </footer>
    </div>
  );
}
