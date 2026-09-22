import Image from "next/image";
import Link from "next/link";
import {
  COUNTRIES,
  DISCORD_INVITE,
  HERO,
  PLANS,
  PLANS_NOTE,
  STEPS,
  noDash,
  pickWork,
  type LabData,
} from "../../_shared/content";
import { labLink } from "../../_shared/pages";
import { SLUG, Shell } from "./shell";
import s from "./styles.module.css";

// Вариант 6 — brutalist-skill «Industrial Brutalism» (Leonxlnx).
//
// Архетип выбран ОДИН, как требует скилл (§2): Swiss Industrial Print.
//   • подложка — небелёная бумага #F4F4F0, чернила #111, единственный
//     акцент — аварийный красный #E61919 (§4);
//   • макро-шрифт Archivo Black, только заглавные, сжатый трекинг и
//     интерлиньяж 0.85; микро — JetBrains Mono 11–13px с разрядкой (§3);
//   • сетка видна: gap 1px на тёмном родителе даёт линии толщиной ровно
//     в пиксель (§8.1); углы строго 90° (§5);
//   • ASCII-рамки, «®» как геометрия, штрихкоды, предупреждающая полоса,
//     перекрестья на пересечениях (§6);
//   • фото — в растр: серые, с точечной сеткой поверх (§7);
//   • семантика: <data>, <dl>, <output> для цифр (§8.2).
// JS в браузер не уходит: вариант целиком серверный.

export function Brutalist({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 6);

  return (
    <Shell page="home">
      {/* Hero: огромный текст, справа — колонка телеметрии. */}
      <section className={s.hero}>
        <h1 className={s.mega}>SouCampus crafts your ideas and dreams</h1>
        <aside className={s.heroSide}>
          <p className={s.micro}>UNIT / SC-01 &nbsp; REV 2026.09</p>
          <p className={s.lede}>{HERO.lede}</p>
          <div className={s.barcode} aria-hidden="true" />
          <div className={s.heroActions}>
            <Link href={labLink(SLUG, HERO.primary.href)} className={s.redBtn}>{HERO.primary.label.toUpperCase()} &gt;&gt;&gt;</Link>
            <Link href={labLink(SLUG, HERO.secondary.href)} className={s.inkBtn}>{HERO.secondary.label.toUpperCase()}</Link>
          </div>
        </aside>
      </section>

      <div className={s.stripes} aria-hidden="true" />

      {/* Цифры — числа во всю ширину, вылезающие за край. */}
      <section aria-label="In numbers" className={s.grid3}>
        {stats.map((stat, i) => (
          <div key={stat.id} className={s.cell}>
            <p className={s.micro}>[ {String(i + 1).padStart(2, "0")} ] {stat.label.toUpperCase()}</p>
            <data value={stat.value} className={s.numeral}>
              {stat.value}
              <span className={s.red}>{stat.suffix}</span>
            </data>
          </div>
        ))}
      </section>

      <section aria-label="Clients from ten countries" className={s.countries}>
        <p className={s.micro}>{"/// CLIENT ORIGIN / 10 REGIONS"}</p>
        <ul>
          {COUNTRIES.map((c) => (
            <li key={c.id}>
              <Image src={c.src} alt="" width={16} height={16} className={s.flag} />
              {c.label.toUpperCase()}
            </li>
          ))}
        </ul>
      </section>

      {/* Работы — лист спецификаций. */}
      <section aria-labelledby="b-work">
        <div className={s.sectionHead}>
          <h2 id="b-work" className={s.macro}>RECENT BUILDS</h2>
          <Link href={labLink(SLUG, HERO.secondary.href)} className={s.micro}>&lt; FULL INDEX &gt;</Link>
        </div>
        <div className={s.workGrid}>
          {work.map((p, i) => (
            <article key={p.slug} className={s.cell}>
              <Link href={`/portfolio/${p.slug}`} className={s.halftone}>
                <Image src={p.image} alt={p.title} fill sizes="(min-width: 900px) 33vw, 100vw" />
              </Link>
              <p className={s.micro}>
                FIG. {String(i + 1).padStart(2, "0")} &nbsp;/&nbsp; {p.tag.toUpperCase()}
              </p>
              <h3 className={s.macroMd}>
                <Link href={`/portfolio/${p.slug}`}>{p.title.toUpperCase()}</Link>
              </h3>
              <p className={s.body}>{noDash(p.summary)}</p>
              <dl className={s.spec}>
                <dt>SIZE</dt><dd>{p.size}</dd>
                <dt>TIME</dt><dd>{p.deadline}</dd>
                <dt>COST</dt><dd>{p.price}</dd>
              </dl>
            </article>
          ))}
        </div>
      </section>

      {/* Отзывы — плотная стенограмма. */}
      <section aria-labelledby="b-reviews">
        <div className={s.sectionHead}>
          <h2 id="b-reviews" className={s.macro}>CLIENT TRANSCRIPTS</h2>
          <p className={s.micro}>{reviews.length} RECORDS</p>
        </div>
        <div className={s.reviewGrid}>
          {reviews.map((r, i) => (
            <figure key={r.slug} className={s.cell}>
              <p className={s.micro}>
                REC-{String(i + 1).padStart(3, "0")} &nbsp; {r.flag} {r.name.toUpperCase()} &nbsp; <span className={s.dim}>{r.role.toUpperCase()}</span>
              </p>
              <blockquote className={s.body}>{noDash(r.text)}</blockquote>
            </figure>
          ))}
        </div>
      </section>

      {/* Шаги — пять агрегатов процесса. */}
      <section aria-labelledby="b-steps">
        <div className={s.sectionHead}>
          <h2 id="b-steps" className={s.macro}>PROCEDURE</h2>
          <p className={s.micro}>5 STAGES &nbsp; &gt;&gt;&gt;</p>
        </div>
        <ol className={s.steps}>
          {STEPS.map((step, i) => (
            <li key={step.title} className={s.cell}>
              <span className={s.stepNum}>{i + 1}</span>
              <h3 className={s.macroMd}>{step.title.toUpperCase()}</h3>
              <p className={s.body}>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Тарифы — таблица. */}
      <section aria-labelledby="b-plans">
        <div className={s.sectionHead}>
          <h2 id="b-plans" className={s.macro}>LIBRARY ACCESS</h2>
          <p className={s.micro}>{PLANS_NOTE.toUpperCase()}</p>
        </div>
        <table className={s.table}>
          <thead>
            <tr><th scope="col">TIER</th><th scope="col">RATE</th><th scope="col">SCOPE</th></tr>
          </thead>
          <tbody>
            {PLANS.map((plan) => (
              <tr key={plan.name} className={plan.name === "Lifetime" ? s.rowRed : undefined}>
                <th scope="row">{plan.name.toUpperCase()}</th>
                <td>{plan.price}</td>
                <td>{plan.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={s.final}>
        <h2 className={s.mega}>TELL ME WHAT YOU WANT BUILT</h2>
        <div className={s.heroActions}>
          <Link href={labLink(SLUG, HERO.primary.href)} className={s.redBtn}>ORDER A MAP &gt;&gt;&gt;</Link>
          <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={s.inkBtn}>DISCORD</a>
        </div>
      </section>
    </Shell>
  );
}
