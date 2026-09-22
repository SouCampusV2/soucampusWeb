import Image from "next/image";
import Link from "next/link";
import { Manrope } from "next/font/google";
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
import { AuditRoot, CopyInvite, Estimate, Pin, StaggerGrid, Steps } from "./client";
import s from "./styles.module.css";

// Вариант 19 — find-animation-opportunities (Эмиль Ковальски).
//
// Скилл — фильтр, а не генератор: «ожидай, что отвергнешь большую часть
// кандидатов». Каждую анимацию он пропускает через четыре вопроса:
// частота → цель → бюджет длительности → помогает ли функции. Здесь
// прошли пять из одиннадцати, и страница построена ровно на них.
// Кнопка «Show the audit» показывает номерные метки у каждой прошедшей
// анимации и панель с отчётом: что одобрено, что отвергнуто и почему.
const manrope = Manrope({ subsets: ["latin"], variable: "--r-sans", preload: false });

export function FindAnimationOpportunities({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 6);

  return (
    <div className={`${manrope.variable} ${s.root}`}>
      <AuditRoot>
        <header className={s.header}>
          <Link href="/" className={s.brand}>SouCampus</Link>
          <nav aria-label="Main" className={s.nav}>
            <Link href="/portfolio">Portfolio</Link>
            <Link href="/marketplace">Marketplace</Link>
          </nav>
        </header>

        <main className={s.main}>
          <section className={s.hero}>
            <h1 className={s.h1}>{HERO.title}</h1>
            <p className={s.lede}>{HERO.lede}</p>
            <div className={s.actions}>
              <span className={s.pinWrap}>
                <Link href={HERO.primary.href} className={`${s.btn} ${s.btnDark} ${s.press}`}>{HERO.primary.label}</Link>
                <Pin n={1} />
              </span>
              <Link href={HERO.secondary.href} className={`${s.btn} ${s.btnGhost} ${s.press}`}>{HERO.secondary.label}</Link>
            </div>
          </section>

          <section aria-label="In numbers" className={s.statsRow}>
            {stats.map((stat) => (
              <p key={stat.id}>
                <b className={s.num}>{stat.value}{stat.suffix}</b> {stat.label.toLowerCase()}
              </p>
            ))}
            <p className={s.muted}>
              Clients from {COUNTRIES.map((c) => c.label).join(", ")}.
            </p>
          </section>

          <section aria-labelledby="r-work" className={s.section}>
            <div className={s.pinWrap}>
              <h2 id="r-work" className={s.h2}>Recent builds</h2>
              <Pin n={2} />
            </div>
            <StaggerGrid>
              {work.map((p, i) => (
                <Link key={p.slug} href={`/portfolio/${p.slug}`} className={s.card} style={{ ["--i" as string]: i }}>
                  <span className={s.cardImg}>
                    <Image src={p.image} alt="" fill sizes="(min-width: 900px) 30vw, 100vw" />
                  </span>
                  <span className={s.cardTitle}>{p.title}</span>
                  <span className={s.muted}>{p.tag}, {p.size}</span>
                </Link>
              ))}
            </StaggerGrid>
          </section>

          <section aria-labelledby="r-steps" className={s.section}>
            <div className={s.pinWrap}>
              <h2 id="r-steps" className={s.h2}>How an order goes</h2>
              <Pin n={3} />
            </div>
            <Steps steps={STEPS.map((x) => ({ ...x }))} />
          </section>

          <section aria-labelledby="r-est" className={s.section}>
            <div className={s.pinWrap}>
              <h2 id="r-est" className={s.h2}>Rough estimate</h2>
              <Pin n={4} />
            </div>
            <Estimate />
          </section>

          <section aria-labelledby="r-reviews" className={s.section}>
            <h2 id="r-reviews" className={s.h2}>What clients say</h2>
            <div className={s.reviews}>
              {reviews.slice(0, 6).map((r) => (
                <figure key={r.slug}>
                  <blockquote>{noDash(r.text)}</blockquote>
                  <figcaption className={s.muted}>{r.name}, {r.role}</figcaption>
                </figure>
              ))}
            </div>
          </section>

          <section aria-labelledby="r-plans" className={s.section}>
            <h2 id="r-plans" className={s.h2}>The build library</h2>
            <p className={s.muted}>{PLANS_NOTE}</p>
            <table className={s.table}>
              <tbody>
                {PLANS.map((p) => (
                  <tr key={p.name}>
                    <th scope="row">{p.name}</th>
                    <td className={s.num}>{p.price}</td>
                    <td className={s.muted}>{p.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className={`${s.section} ${s.final}`}>
            <h2 className={s.h1}>Tell me what you want built</h2>
            <div className={s.actions}>
              <Link href={HERO.primary.href} className={`${s.btn} ${s.btnDark} ${s.press}`}>{HERO.primary.label}</Link>
              <span className={s.pinWrap}>
                <CopyInvite />
                <Pin n={5} />
              </span>
            </div>
          </section>
        </main>

        <footer className={s.footer}>
          <a href={DISCORD_INVITE} target="_blank" rel="noreferrer">Discord</a>
          {SOCIALS.slice(1).map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
          ))}
        </footer>
      </AuditRoot>
    </div>
  );
}
