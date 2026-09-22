import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import { Big_Shoulders, Instrument_Sans } from "next/font/google";
import {
  COUNTRIES,
  DISCORD_INVITE,
  PLANS,
  SOCIALS,
  pickWork,
  type LabData,
} from "../../_shared/content";
import { BuildReveal } from "./_components/BuildReveal";
import { WorkPan } from "./_components/WorkPan";
import { ReviewIndex } from "./_components/ReviewIndex";
import { ProcessTower } from "./_components/ProcessTower";
import { Estimator } from "./_components/Estimator";
import s from "./styles.module.css";

// Вариант 1 — скилл frontend-design (Anthropic). Ветка design-lab.
//
// ⚠️ Страница лежит ВНЕ группы (site) намеренно: без навбара, футера,
// волны перехода и CartProvider. Владелец попросил не использовать
// нашу дизайн-систему вообще — значит и оболочку тоже. Всё своё:
// шрифты, цвета (токены в styles.module.css), компоненты в _components.
//
// Общее с сайтом только ДАННЫЕ и логика: проекты, отзывы, цифры из
// базы теми же функциями, формула цены из pricing.ts. Макет, который
// хорошо выглядит на выдуманных подписях, рассыпается на настоящих.
//
// Дизайн-план (frontend-design: «сначала план, потом код»):
//   Тема     — оверворлд днём: бледное небо, тёмно-синие «чернила»,
//              трава и земля как акценты. Ночью — та же палитра ночью.
//   Шрифты   — Big Shoulders (узкий, заголовки стоят «башнями»),
//              Instrument Sans для текста. Не Jakarta и не Unbounded.
//   Смелость — в ОДНОМ месте: картинка в hero строится блоками снизу
//              вверх. Остальное тихое.
//   Движение — только там, где отвечает на действие: скролл двигает
//              ленту работ и растит башню шагов, ползунки меняют план
//              участка. Никаких «появлений» на каждой секции.
//   Запреты  — без надписей над заголовками, без длинных тире, без
//              трёх одинаковых карточек, без моноширинных «ярлыков».
const display = Big_Shoulders({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--f-display",
  preload: false,
});

const text = Instrument_Sans({
  subsets: ["latin"],
  variable: "--f-text",
  preload: false,
});

export function FrontendDesign({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects);
  const heroProject = work[0] ?? projects[0];
  const countries = COUNTRIES.map((c) => ({
    src: c.src,
    label: c.id === "eur" || c.id === "usd" || c.id === "nl" || c.id === "gbp" ? `the ${c.label}` : c.label,
  }));

  return (
    <div className={`${display.variable} ${text.variable} ${s.page}`}>
      <header className={s.top}>
        <Link href="/" className={s.wordmark}>
          SouCampus
        </Link>
        <nav aria-label="Main" className={s.topNav}>
          <Link href="/portfolio">Portfolio</Link>
          <Link href="/marketplace">Maps for sale</Link>
          <Link href="/about">About</Link>
        </nav>
        <Link href="/contact" className={`${s.btn} ${s.btnGrass} ${s.btnSmall}`}>
          Order a map
        </Link>
      </header>

      <main className={s.main}>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className={s.hero}>
          <h1 className={s.heroTitle}>SouCampus crafts your ideas and dreams</h1>
          <div className={s.heroAside}>
            <p className={s.lede}>
              I create custom maps, structures and entire worlds in Minecraft,
              from scratch to a breathtaking masterpiece.
            </p>
            <div className={s.actions}>
              <Link href="/contact" className={`${s.btn} ${s.btnGrass}`}>
                Order a map
              </Link>
              <Link href="/portfolio" className={`${s.btn} ${s.btnLine}`}>
                See what I&apos;ve built
              </Link>
            </div>
          </div>

          {heroProject && (
            <figure className={s.heroFigure}>
              <BuildReveal src={heroProject.image} alt={heroProject.title} />
              <figcaption className={s.heroCaption}>
                <Link href={`/portfolio/${heroProject.slug}`}>{heroProject.title}</Link>
                <span>{heroProject.size}</span>
              </figcaption>
            </figure>
          )}
        </section>

        {/* ── Proof: цифры фразой, а не плитками ──────────────── */}
        <section className={s.proof} aria-label="In numbers">
          <p className={s.proofText}>
            {stats.map((stat) => (
              <span key={stat.id}>
                <strong>
                  {stat.value}
                  {stat.suffix}
                </strong>{" "}
                {stat.label.toLowerCase()}
                {". "}
              </span>
            ))}
            Clients from{" "}
            {countries.map((c, i) => (
              <Fragment key={c.src}>
                <span className={s.country}>
                  <Image src={c.src} alt="" width={28} height={20} className={s.flag} />
                  {c.label}
                </span>
                {i < countries.length - 2 ? ", " : i === countries.length - 2 ? " and " : "."}
              </Fragment>
            ))}
          </p>
        </section>

        {/* ── Работы: лента, которую двигает скролл ─────────────── */}
        <WorkPan
          projects={work.map((p) => ({
            slug: p.slug,
            title: p.title,
            tag: p.tag,
            summary: p.summary,
            size: p.size,
            deadline: p.deadline,
            price: p.price,
            image: p.image,
          }))}
        />

        {/* ── Отзывы ──────────────────────────────────────────── */}
        <section className={s.section}>
          <h2 className={s.h2}>What clients said afterwards</h2>
          <ReviewIndex
            reviews={reviews.map((r) => ({
              slug: r.slug,
              name: r.name,
              role: r.role,
              flag: r.flag,
              text: r.text,
            }))}
          />
        </section>

        {/* ── Как идёт заказ ──────────────────────────────────── */}
        <ProcessTower />

        {/* ── Калькулятор ─────────────────────────────────────── */}
        <Estimator />

        {/* ── Библиотека построек ─────────────────────────────── */}
        <section className={s.section}>
          <div className={s.plansHead}>
            <h2 className={s.h2}>Or take builds from the library</h2>
            <p className={s.muted}>
              Subscribe to the build library, or order something of your own.
            </p>
          </div>
          <ul className={s.plans}>
            {PLANS.map((plan) => (
              <li
                key={plan.name}
                className={`${s.plan} ${plan.name === "Lifetime" ? s.planStrong : ""}`}
              >
                <span className={s.planName}>{plan.name}</span>
                <span className={s.planPrice}>{plan.price}</span>
                <span className={s.planText}>{plan.text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Финал ───────────────────────────────────────────── */}
        <section className={s.finale}>
          <h2 className={s.finaleTitle}>Tell me what you want built</h2>
          <div className={s.actions}>
            <Link href="/contact" className={`${s.btn} ${s.btnGrass} ${s.btnBig}`}>
              Order a map
            </Link>
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noreferrer"
              className={`${s.btn} ${s.btnLine} ${s.btnBig}`}
            >
              Talk on Discord
            </a>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <span className={s.wordmark}>SouCampus</span>
        <ul className={s.socials}>
          {SOCIALS.map((link) => (
            <li key={link.label}>
              <a href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <ul className={s.legal}>
          <li><Link href="/wiki">Wiki</Link></li>
          <li><Link href="/privacy">Privacy</Link></li>
          <li><Link href="/terms">Terms</Link></li>
        </ul>
      </footer>
    </div>
  );
}
