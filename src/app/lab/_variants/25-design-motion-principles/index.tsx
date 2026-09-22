import Image from "next/image";
import Link from "next/link";
import { Albert_Sans } from "next/font/google";
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
import { CopyInvite, Enter, Lenses, Plans } from "./client";
import s from "./styles.module.css";

// Вариант 25 — design-motion-principles (Kyle Zantos). Ветка design-lab.
//
// Скилл смотрит на движение через три линзы и взвешивает их по типу
// проекта. Для «Marketing / landing page» его таблица даёт:
//   Primary   Jakub Krehel — незаметная полировка: вход проявлением,
//             выход тише входа, тени вместо рамок, анимированная смена
//             иконок, общий layout при выборе;
//   Secondary Jhey Tompkins — игра на чистом CSS: 3D-блок травы «из
//             кубоидов» и рамка кнопки, переливающаяся через @property;
//   Selective Emil Kowalski — навигация и формы: там движения нет.
// Каждый приём подписан в коде той линзой, из которой он взят.
const albert = Albert_Sans({ subsets: ["latin"], variable: "--l-sans", preload: false });

export function DesignMotionPrinciples({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 6);

  return (
    <Lenses>
      <div className={`${albert.variable} ${s.root}`}>
        {/* Emil: навигация — самое частое действие, без анимации. */}
        <header className={s.header}>
          <Link href="/" className={s.brand}>SouCampus</Link>
          <nav aria-label="Main" className={s.nav}>
            <Link href="/portfolio">Portfolio</Link>
            <Link href="/marketplace">Marketplace</Link>
          </nav>
        </header>

        <section className={s.hero}>
          <div>
            <Enter>
              <h1 className={s.h1}>{HERO.title}</h1>
            </Enter>
            <Enter i={1}>
              <p className={s.lede}>{HERO.lede}</p>
            </Enter>
            <Enter i={2} className={s.actions}>
              {/* Jhey: рамка из conic-gradient, угол крутит @property. */}
              <Link href={HERO.primary.href} className={s.glow}>
                <span>{HERO.primary.label}</span>
              </Link>
              <Link href={HERO.secondary.href} className={s.ghost}>{HERO.secondary.label}</Link>
            </Enter>
          </div>

          {/* Jhey: «think in cuboids» — блок травы из шести граней. */}
          <div className={s.scene} aria-hidden="true">
            <div className={s.cube}>
              <span className={`${s.face} ${s.top}`} />
              <span className={`${s.face} ${s.bottom}`} />
              <span className={`${s.face} ${s.front}`} />
              <span className={`${s.face} ${s.back}`} />
              <span className={`${s.face} ${s.left}`} />
              <span className={`${s.face} ${s.right}`} />
            </div>
            <div className={s.shadow} />
          </div>
        </section>

        <section aria-label="In numbers" className={s.stats}>
          {stats.map((st, i) => (
            <Enter key={st.id} i={i} className={s.stat}>
              <b>{st.value}{st.suffix}</b>
              <span className={s.muted}>{st.label}</span>
            </Enter>
          ))}
        </section>

        <section aria-labelledby="l-work" className={s.section}>
          <Enter>
            <h2 id="l-work" className={s.h2}>Recent builds</h2>
          </Enter>
          <div className={s.grid}>
            {work.map((p, i) => (
              <Enter key={p.slug} i={i % 3}>
                {/* Jakub: карточка на многослойной тени, а не на рамке. */}
                <Link href={`/portfolio/${p.slug}`} className={s.card}>
                  <span className={s.cardImg}>
                    <Image src={p.image} alt="" fill sizes="(min-width: 900px) 30vw, 100vw" />
                  </span>
                  <span className={s.cardTitle}>{p.title}</span>
                  <span className={s.muted}>{p.tag}, {p.size}</span>
                </Link>
              </Enter>
            ))}
          </div>
        </section>

        <section aria-labelledby="l-steps" className={s.section}>
          <Enter>
            <h2 id="l-steps" className={s.h2}>How an order goes</h2>
          </Enter>
          <ol className={s.steps}>
            {STEPS.map((st, i) => (
              <li key={st.title}>
                <Enter i={i} className={s.step}>
                  <span className={s.stepNum}>{i + 1}</span>
                  <h3>{st.title}</h3>
                  <p className={s.muted}>{st.text}</p>
                </Enter>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="l-reviews" className={s.section}>
          <Enter>
            <h2 id="l-reviews" className={s.h2}>What clients say</h2>
          </Enter>
          <div className={s.reviews}>
            {reviews.slice(0, 6).map((r, i) => (
              <Enter key={r.slug} i={i % 3} className={s.review}>
                <blockquote>{noDash(r.text)}</blockquote>
                <p className={s.muted}>{r.name}, {r.role}</p>
              </Enter>
            ))}
          </div>
          <ul className={s.countries}>
            {COUNTRIES.map((c) => (
              <li key={c.id}>
                <Image src={c.src} alt="" width={16} height={16} className="rounded-full" />
                {c.label}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="l-plans" className={s.section}>
          <Enter>
            <h2 id="l-plans" className={s.h2}>The build library</h2>
            <p className={s.muted}>{PLANS_NOTE}</p>
          </Enter>
          <Plans plans={PLANS.map((p) => ({ ...p }))} />
        </section>

        <section className={`${s.section} ${s.final}`}>
          <Enter>
            <h2 className={s.h1}>Tell me what you want built</h2>
          </Enter>
          <Enter i={1} className={s.actions}>
            <Link href={HERO.primary.href} className={s.glow}>
              <span>{HERO.primary.label}</span>
            </Link>
            <CopyInvite />
          </Enter>
          <ul className={s.socials}>
            {SOCIALS.map((l) => (
              <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>
            ))}
          </ul>
        </section>
      </div>
    </Lenses>
  );
}
