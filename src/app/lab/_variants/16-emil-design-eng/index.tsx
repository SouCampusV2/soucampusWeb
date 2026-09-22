import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import {
  COUNTRIES,
  HERO,
  PLANS,
  PLANS_NOTE,
  SOCIALS,
  STEPS,
  noDash,
  pickWork,
  type LabData,
} from "../../_shared/content";
import { ClipTabs, Compare, CopyDiscord, Reveal, StepsAccordion, Toasts } from "./client";
import s from "./styles.module.css";

// Вариант 16 — emil-design-eng (Эмиль Ковальски). Ветка design-lab.
//
// Скилл — не стиль, а ремесло «невидимых деталей». Страница нарочно
// спокойная (Inter, светлая, без акцентного цвета), а всё, что в ней
// есть, — его конкретные приёмы, каждый с правилом из скилла:
//   • кнопки отвечают на нажатие scale(0.97) за 160ms ease-out;
//   • картинки открываются снизу вверх через clip-path, один раз;
//   • слайдер сравнения — clip-path по положению пальца, без лишних
//     узлов («Comparison sliders»);
//   • вкладки отзывов — ДВЕ копии списка, активная обрезана clip-path'ом,
//     поэтому цвет «перетекает» между вкладками («Tabs with perfect color
//     transitions»);
//   • шаги — аккордеон на height+opacity, ease-out, до 300ms;
//   • копирование Discord подтверждается тостом Sonner — это библиотека
//     самого Эмиля;
//   • кривые — его: --ease-out cubic-bezier(0.23,1,0.32,1). Никакого
//     ease-in и ничего из scale(0).
// Чего нет намеренно: появлений на каждой секции и счётчиков цифр —
// «should this animate at all?» → на лендинге, который видят раз, нет.
const inter = Inter({ subsets: ["latin"], variable: "--e-sans", preload: false });

export function EmilDesignEng({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 4);
  const compare = projects.find((p) => p.gallery && p.gallery.length > 0);

  return (
    <div className={`${inter.variable} ${s.root}`}>
      <Toasts />
      <header className={s.header}>
        <Link href="/" className={s.brand}>SouCampus</Link>
        <nav aria-label="Main" className={s.nav}>
          <Link href="/portfolio">Portfolio</Link>
          <Link href="/marketplace">Marketplace</Link>
          <Link href={HERO.primary.href} className={`${s.btn} ${s.btnDark}`}>{HERO.primary.label}</Link>
        </nav>
      </header>

      <main className={s.main}>
        <section className={s.hero}>
          <h1 className={s.h1}>{HERO.title}</h1>
          <p className={s.lede}>{HERO.lede}</p>
          <div className={s.actions}>
            <Link href={HERO.primary.href} className={`${s.btn} ${s.btnDark}`}>{HERO.primary.label}</Link>
            <Link href={HERO.secondary.href} className={`${s.btn} ${s.btnLight}`}>{HERO.secondary.label}</Link>
          </div>
          <ul className={s.stats}>
            {stats.map((stat) => (
              <li key={stat.id}>
                <span className={s.statValue}>{stat.value}{stat.suffix}</span>
                <span className={s.muted}>{stat.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="e-work" className={s.section}>
          <h2 id="e-work" className={s.h2}>Recent builds</h2>
          <div className={s.work}>
            {work.map((p) => (
              <Link key={p.slug} href={`/portfolio/${p.slug}`} className={s.workItem}>
                <Reveal className={s.workImg}>
                  <Image src={p.image} alt={p.title} fill sizes="(min-width: 800px) 45vw, 100vw" />
                </Reveal>
                <span className={s.workTitle}>{p.title}</span>
                <span className={s.muted}>{p.tag}, {p.size}</span>
              </Link>
            ))}
          </div>
        </section>

        {compare && compare.gallery && (
          <section aria-labelledby="e-compare" className={s.section}>
            <h2 id="e-compare" className={s.h2}>Two angles of {compare.title}</h2>
            <p className={s.muted}>Drag the handle, or focus it and use the arrow keys.</p>
            <Compare a={compare.image} b={compare.gallery[0]} title={compare.title} />
          </section>
        )}

        <section aria-labelledby="e-reviews" className={s.section}>
          <h2 id="e-reviews" className={s.h2}>What clients say</h2>
          <ClipTabs reviews={reviews.slice(0, 5).map((r) => ({ slug: r.slug, name: r.name, role: r.role, text: noDash(r.text) }))} />
          <p className={s.countries}>
            Clients from{" "}
            {COUNTRIES.map((c, i) => (
              <span key={c.id}>
                <Image src={c.src} alt="" width={14} height={14} className={s.flag} />
                {c.label}
                {i < COUNTRIES.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        </section>

        <section aria-labelledby="e-steps" className={s.section}>
          <h2 id="e-steps" className={s.h2}>How an order goes</h2>
          <StepsAccordion steps={STEPS.map((x) => ({ ...x }))} />
        </section>

        <section aria-labelledby="e-plans" className={s.section}>
          <h2 id="e-plans" className={s.h2}>The build library</h2>
          <p className={s.muted}>{PLANS_NOTE}</p>
          <ul className={s.plans}>
            {PLANS.map((plan) => (
              <li key={plan.name}>
                <span className={s.planName}>{plan.name}</span>
                <span className={s.planPrice}>{plan.price}</span>
                <span className={s.muted}>{plan.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${s.section} ${s.final}`}>
          <h2 className={s.h1}>Tell me what you want built</h2>
          <div className={s.actions}>
            <Link href={HERO.primary.href} className={`${s.btn} ${s.btnDark}`}>{HERO.primary.label}</Link>
            <CopyDiscord className={`${s.btn} ${s.btnLight}`} />
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        {SOCIALS.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
        ))}
      </footer>
    </div>
  );
}
