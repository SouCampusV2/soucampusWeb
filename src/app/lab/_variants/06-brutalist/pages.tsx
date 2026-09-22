import Image from "next/image";
import Link from "next/link";
import { DISCORD_INVITE, HERO, noDash, type LabData } from "../../_shared/content";
import { ABOUT, CONTACT, FAQ, PORTFOLIO, SKILLS, STUDIOS, TIMELINE, estimate, formatEuro, labHref } from "../../_shared/pages";
import { SLUG, Shell } from "./shell";
import s from "./styles.module.css";

// Страницы студии в варианте Blueprint (brutalist-skill, Swiss Industrial
// Print). Правила те же, что у лендинга: заглавный макро-шрифт, микро-моно
// с разрядкой, сетка видна (линии в пиксель), углы 90°, один аварийный
// красный. И то же ограничение, что делает вариант собой: НИ ОДНОЙ строки
// JS в браузер. Поэтому FAQ на <details>, а калькулятор — печатная таблица.

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

// ── Portfolio ───────────────────────────────────────────────────────────

export function BlueprintPortfolio({ data }: { data: LabData }) {
  const { projects } = data;
  const featured = projects.filter((p) => p.isFeatured);

  return (
    <Shell page="portfolio">
      <section className={s.hero}>
        <h1 className={s.mega}>{PORTFOLIO.title}</h1>
        <aside className={s.heroSide}>
          <p className={s.micro}>INDEX / SC-02 &nbsp; {pad(projects.length)} ENTRIES</p>
          <p className={s.lede}>{PORTFOLIO.lede}</p>
          <div className={s.barcode} aria-hidden="true" />
          <div className={s.heroActions}>
            <Link href={labHref(SLUG, "contact")} className={s.redBtn}>ORDER A MAP &gt;&gt;&gt;</Link>
            <a href="#index" className={s.inkBtn}>FULL INDEX</a>
          </div>
        </aside>
      </section>

      <div className={s.stripes} aria-hidden="true" />

      {/* Избранное — растровые таблицы-«фигуры», как «Recent builds». */}
      <section aria-labelledby="b-plates">
        <div className={s.sectionHead}>
          <h2 id="b-plates" className={s.macro}>PLATES</h2>
          <p className={s.micro}>{pad(featured.length)} FEATURED &nbsp; / &nbsp; HOVER TO DEVELOP</p>
        </div>
        {/* Сетка по числу работ: у линий в пиксель пустая ячейка —
            чёрный прямоугольник, «дыру» здесь видно сразу. */}
        <div className={featured.length % 3 !== 0 && featured.length % 2 === 0 ? s.grid2 : s.workGrid}>
          {featured.map((p, i) => (
            <article key={p.slug} className={s.cell}>
              <Link href={`/portfolio/${p.slug}`} className={s.halftone}>
                <Image src={p.image} alt={p.title} fill sizes="(min-width: 900px) 33vw, 100vw" />
              </Link>
              <p className={s.micro}>FIG. {pad(i + 1)} &nbsp;/&nbsp; {p.tag.toUpperCase()}</p>
              <h3 className={s.macroMd}>
                <Link href={`/portfolio/${p.slug}`}>{p.title.toUpperCase()}</Link>
              </h3>
              <p className={s.body}>{noDash(p.summary)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Полный указатель — таблица, а не сетка: в ней можно сравнивать
          размер, срок и цену построек построчно, ради этого и пришли. */}
      <section id="index" aria-labelledby="b-index">
        <div className={s.sectionHead}>
          <h2 id="b-index" className={s.macro}>FULL INDEX</h2>
          <p className={s.micro}>SORTED AS LISTED &nbsp; &gt;&gt;&gt;</p>
        </div>
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col">NO.</th>
              <th scope="col">BUILD</th>
              <th scope="col" className={s.hideSm}>TYPE</th>
              <th scope="col" className={s.hideSm}>SIZE</th>
              <th scope="col">TIME</th>
              <th scope="col" className={s.hideSm}>COST</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => (
              <tr key={p.slug}>
                <td className={s.num}>{pad(i + 1, 3)}</td>
                <th scope="row">
                  <Link href={`/portfolio/${p.slug}`}>{p.title.toUpperCase()}</Link>
                </th>
                <td className={s.hideSm}>{p.tag.toUpperCase()}</td>
                <td className={s.hideSm}>{p.size}</td>
                <td>{p.deadline}</td>
                <td className={s.hideSm}>{p.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <FinalCall title="YOUR WORLD IS ENTRY NO. " suffix={pad(projects.length + 1, 3)} />
    </Shell>
  );
}

// ── Contact ─────────────────────────────────────────────────────────────

// Типовые размеры для тарифной карты. Цена и срок — из общей формулы
// (src/lib/pricing.ts через _shared/pages), здесь только выбор строк.
const RATE_SIZES = [
  [100, 100],
  [150, 150],
  [200, 200],
  [300, 300],
  [400, 400],
  [600, 600],
] as const;

export function BlueprintContact() {
  return (
    <Shell page="contact">
      <section className={s.hero}>
        <h1 className={s.mega}>
          {CONTACT.titleStart} <span className={s.red}>{CONTACT.titleAccent}</span>
        </h1>
        <aside className={s.heroSide}>
          <p className={s.micro}>CHANNEL / SC-03 &nbsp; 7 DAYS A WEEK</p>
          <p className={s.lede}>{CONTACT.lede}</p>
          <div className={s.barcode} aria-hidden="true" />
          <div className={s.heroActions}>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={s.redBtn}>JOIN DISCORD &gt;&gt;&gt;</a>
            <a href="#faq" className={s.inkBtn}>FAQ</a>
          </div>
        </aside>
      </section>

      <div className={s.stripes} aria-hidden="true" />

      <section aria-label="Ways to start" className={s.grid2}>
        <div className={s.cell}>
          <p className={s.micro}>[ 01 ] DIRECT LINE</p>
          <h2 className={s.macroMd}>{CONTACT.chatTitle.toUpperCase()}</h2>
          <p className={s.body}>{CONTACT.chatText}</p>
          <div className={s.heroActions}>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={s.inkBtn}>{CONTACT.chatCta.toUpperCase()} &gt;&gt;&gt;</a>
          </div>
        </div>
        <div className={s.cell}>
          <p className={s.micro}>[ 02 ] REFERENCE</p>
          <h2 className={s.macroMd}>{CONTACT.answersTitle.toUpperCase()}</h2>
          <p className={s.body}>{CONTACT.answersText}</p>
          <div className={s.heroActions}>
            <a href="#faq" className={s.inkBtn}>SEE THE QUESTIONS</a>
          </div>
        </div>
      </section>

      {/* Тарифная карта вместо калькулятора: интерактив потребовал бы JS,
          а распечатанная таблица отвечает на тот же вопрос за один взгляд. */}
      <section aria-labelledby="b-rates">
        <div className={s.sectionHead}>
          <h2 id="b-rates" className={s.macro}>RATE CARD</h2>
          <p className={s.micro}>{CONTACT.estimateNote.toUpperCase()}</p>
        </div>
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col">FOOTPRINT</th>
              <th scope="col">FROM</th>
              <th scope="col">TIMELINE</th>
            </tr>
          </thead>
          <tbody>
            {RATE_SIZES.map(([w, h]) => {
              const e = estimate(w, h);
              return (
                <tr key={`${w}x${h}`} className={w === 150 ? s.rowRed : undefined}>
                  <th scope="row">{w}×{h}</th>
                  <td>{formatEuro(e.price)}</td>
                  <td>{e.deadline.toUpperCase()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section id="faq" aria-labelledby="b-faq">
        <div className={s.sectionHead}>
          <h2 id="b-faq" className={s.macro}>{CONTACT.faqTitle.toUpperCase()}</h2>
          <p className={s.micro}>{pad(FAQ.length)} RECORDS</p>
        </div>
        <ul className={s.faq}>
          {FAQ.map((item, i) => (
            <li key={item.question}>
              <details>
                <summary>
                  <span className={s.micro}>Q-{pad(i + 1, 3)}</span>
                  <span className={s.macroMd}>{item.question.toUpperCase()}</span>
                </summary>
                <p className={`${s.body} ${s.answer}`}>{item.answer}</p>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <FinalCall title="TELL ME WHAT YOU WANT BUILT" />
    </Shell>
  );
}

// ── About ───────────────────────────────────────────────────────────────

export function BlueprintAbout({ data }: { data: LabData }) {
  const cover = data.projects.find((p) => p.isFeatured) ?? data.projects[0];

  return (
    <Shell page="about">
      <section className={s.hero}>
        <h1 className={s.mega}>{ABOUT.title}</h1>
        <aside className={s.heroSide}>
          <p className={s.micro}>OPERATOR / SC-04 &nbsp; EST. AGE 6</p>
          <p className={s.lede}>
            <strong>{ABOUT.leadStrong}</strong> {ABOUT.lead}
          </p>
          <div className={s.barcode} aria-hidden="true" />
        </aside>
      </section>

      <div className={s.stripes} aria-hidden="true" />

      <section aria-label="In numbers" className={s.grid3}>
        {ABOUT.facts.map((fact, i) => (
          <div key={fact.label} className={s.cell}>
            <p className={s.micro}>[ {pad(i + 1)} ] {fact.label.toUpperCase()}</p>
            <data value={fact.value.replace(/\D/g, "")} className={s.numeral}>
              {fact.value.startsWith("~") ? <span className={s.red}>~</span> : null}
              {fact.value.replace("~", "")}
            </data>
          </div>
        ))}
      </section>

      <section aria-label="Studios" className={s.countries}>
        <p className={s.micro}>{"/// BUILT WITH / "}{pad(STUDIOS.length)} TEAMS</p>
        <ul>
          {STUDIOS.map((studio) => (
            <li key={studio}>{studio.toUpperCase()}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="b-log">
        <div className={s.sectionHead}>
          <h2 id="b-log" className={s.macro}>SERVICE LOG</h2>
          <p className={s.micro}>{ABOUT.eyebrow.toUpperCase()} &nbsp; / &nbsp; {pad(TIMELINE.length)} ENTRIES</p>
        </div>
        <ol className={s.log}>
          {TIMELINE.map((item) => (
            <li key={item.age}>
              <p className={s.age}>{item.age}</p>
              <h3 className={s.macroMd}>{item.title.toUpperCase()}</h3>
              <p className={s.body}>{item.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="b-skills">
        <div className={s.sectionHead}>
          <h2 id="b-skills" className={s.macro}>{ABOUT.skillsTitle.toUpperCase()}</h2>
          <p className={s.micro}>{ABOUT.skillsEyebrow.toUpperCase()}</p>
        </div>
        <div className={s.grid2}>
          <div className={s.cell}>
            <p className={s.micro}>[ A ] TOOLS &nbsp; / &nbsp; {pad(SKILLS.tools.length)}</p>
            <ul className={s.tagList}>
              {SKILLS.tools.map((tool) => (
                <li key={tool}>{tool.toUpperCase()}</li>
              ))}
            </ul>
            <p className={s.body}>{ABOUT.skillsLede}</p>
          </div>
          <div className={s.cell}>
            <p className={s.micro}>[ B ] CRAFT &nbsp; / &nbsp; {pad(SKILLS.craft.length)}</p>
            <ul className={s.tagList}>
              {SKILLS.craft.map((item) => (
                <li key={item}>{item.toUpperCase()}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <blockquote className={`${s.body} ${s.quote}`}>{ABOUT.closing[1]}</blockquote>

      <section aria-label="Notes" className={s.grid2}>
        <div className={s.cell}>
          <p className={s.micro}>NOTE / CLIENTS</p>
          <p className={s.body}>{ABOUT.closing[0]}</p>
        </div>
        {cover && (
          <div className={s.cell}>
            <p className={s.micro}>FIG. 01 &nbsp; / &nbsp; {cover.title.toUpperCase()}</p>
            <Link href={`/portfolio/${cover.slug}`} className={s.halftone}>
              <Image src={cover.image} alt={cover.title} fill sizes="(min-width: 900px) 50vw, 100vw" />
            </Link>
          </div>
        )}
      </section>

      <FinalCall title="LET'S BUILD YOURS NEXT" />
    </Shell>
  );
}

// ── Общий финал ─────────────────────────────────────────────────────────

function FinalCall({ title, suffix }: { title: string; suffix?: string }) {
  return (
    <section className={s.final}>
      <h2 className={s.mega}>
        {title}
        {suffix && <span className={s.red}>{suffix}</span>}
      </h2>
      <div className={s.heroActions}>
        <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={s.redBtn}>JOIN DISCORD &gt;&gt;&gt;</a>
        <Link href={labHref(SLUG, "portfolio")} className={s.inkBtn}>{HERO.secondary.label.toUpperCase()}</Link>
      </div>
    </section>
  );
}
