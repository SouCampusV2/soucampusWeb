import Image from "next/image";
import Link from "next/link";
import { Anton, IBM_Plex_Sans } from "next/font/google";
import {
  COUNTRIES,
  DISCORD_INVITE,
  HERO,
  PLANS,
  SOCIALS,
  STEPS,
  noDash,
  pickWork,
  type LabData,
} from "../../_shared/content";
import s from "./styles.module.css";

// ============================================================
// Вариант 12 — canvas-design (Anthropic). Ветка design-lab.
//
// Философия «Chromatic Strata».
// Мир Minecraft — это прежде всего вертикаль: небо, трава, земля,
// камень, глубинный сланец, бедрок. Каждый игрок знает этот разрез
// телом — он копал его. Страница и есть этот разрез: читая её сверху
// вниз, спускаешься под землю. Цвет слоя — единственный носитель
// смысла; слова — редкие, короткие, как подписи на музейной табличке.
// Масштаб решает иерархию: одно огромное слово на слой и мелкие
// подписи, между ними — пустота. Границы слоёв — ступенчатые, по
// блокам, потому что в этом мире нет кривых. Работа должна выглядеть
// как вещь, над которой сидели долго и тщательно: каждое расстояние
// выверено, каждая граница ровно по шагу блока.
// ============================================================
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--c-poster", preload: false });
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--c-label", preload: false });

/** Ступенчатая верхняя кромка слоя: детерминированная, из номера слоя. */
function edge(seed: number, cols = 40, step = 3) {
  const pts: string[] = [];
  let x = seed * 7919;
  for (let i = 0; i <= cols; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    const h = (x % 4) * step;
    const left = (i / cols) * 100;
    const right = ((i + 1) / cols) * 100;
    pts.push(`${left}% ${h}px`, `${Math.min(100, right)}% ${h}px`);
  }
  return `polygon(${pts.join(",")}, 100% 100%, 0% 100%)`;
}

const ORES = ["#f0c93b", "#d8a88a", "#5ee1e6", "#d8352a"];

export function CanvasDesign({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 3);
  const hero = work[0];

  return (
    <div className={`${anton.variable} ${plex.variable} ${s.root}`}>
      {/* SKY */}
      <section className={s.sky}>
        <header className={s.top}>
          <Link href="/" className={s.label}>SouCampus builds</Link>
          <Link href={HERO.primary.href} className={s.labelLink}>{HERO.primary.label}</Link>
        </header>
        <div className={s.skyGrid}>
          <h1 className={s.poster}>
            <span className="sr-only">{HERO.title}</span>
            <span aria-hidden="true">Ideas</span>
            <span aria-hidden="true" className={s.posterSmall}>and dreams, crafted</span>
          </h1>
          {hero && (
            <figure className={s.plate}>
              <div className={s.plateImg}>
                <Image src={hero.image} alt={hero.title} fill priority sizes="(min-width: 900px) 40vw, 90vw" />
              </div>
              <figcaption className={s.label}>{hero.title}, {hero.size}</figcaption>
            </figure>
          )}
          <div className={s.skyText}>
            <p>{HERO.lede}</p>
            <Link href={HERO.secondary.href} className={s.labelLink}>{HERO.secondary.label}</Link>
          </div>
        </div>
      </section>

      {/* GRASS → DIRT: работы */}
      <section className={s.dirt} style={{ clipPath: edge(1) }}>
        <div className={s.grassLip} />
        <div className={s.inner}>
          <h2 className={s.posterMd}>Built</h2>
          <div className={s.plates}>
            {work.map((p) => (
              <Link key={p.slug} href={`/portfolio/${p.slug}`} className={s.plateSmall}>
                <div className={s.plateImg}>
                  <Image src={p.image} alt={p.title} fill sizes="(min-width: 900px) 30vw, 90vw" />
                </div>
                <span className={s.label}>{p.title}</span>
                <span className={s.labelDim}>{noDash(p.summary)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* STONE + ORES: цифры и страны */}
      <section className={s.stone} style={{ clipPath: edge(2) }}>
        <div className={s.inner}>
          <h2 className={s.posterMd}>Proven</h2>
          <dl className={s.ores}>
            {stats.map((stat, i) => (
              <div key={stat.id}>
                <span className={s.ore} style={{ ["--ore" as string]: ORES[i % ORES.length] }} aria-hidden="true" />
                <dd className={s.oreValue}>{stat.value}{stat.suffix}</dd>
                <dt className={s.label}>{stat.label}</dt>
              </div>
            ))}
          </dl>
          <ul className={s.countries}>
            {COUNTRIES.map((c) => (
              <li key={c.id} className={s.label}>
                <Image src={c.src} alt="" width={14} height={14} />
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* DEEPSLATE: отзывы */}
      <section className={s.deep} style={{ clipPath: edge(3) }}>
        <div className={s.inner}>
          <h2 className={s.posterMd}>Heard</h2>
          <div className={s.quotes}>
            {reviews.slice(0, 6).map((r) => (
              <figure key={r.slug}>
                <blockquote>{noDash(r.text)}</blockquote>
                <figcaption className={s.labelDim}>{r.name}, {r.role}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Шаги как шкала глубины */}
      <section className={s.depth} style={{ clipPath: edge(4) }}>
        <div className={s.inner}>
          <h2 className={s.posterMd}>Dug</h2>
          <ol className={s.scale}>
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className={s.depthMark} aria-hidden="true">Y {64 - i * 32}</span>
                <span className={s.stepName}>{step.title}</span>
                <span className={s.labelDim}>{step.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* BEDROCK: тарифы и финал */}
      <section className={s.bedrock} style={{ clipPath: edge(5) }}>
        <div className={s.inner}>
          <ul className={s.plans}>
            {PLANS.map((plan) => (
              <li key={plan.name} className={plan.name === "Lifetime" ? s.planLava : undefined}>
                <span className={s.label}>{plan.name}</span>
                <span className={s.planPrice}>{plan.price}</span>
                <span className={s.labelDim}>{plan.text}</span>
              </li>
            ))}
          </ul>
          <h2 className={s.poster}>Order</h2>
          <div className={s.final}>
            <Link href={HERO.primary.href} className={s.lavaBtn}>{HERO.primary.label}</Link>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={s.labelLink}>Discord</a>
          </div>
          <ul className={s.socials}>
            {SOCIALS.map((l) => (
              <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer" className={s.labelDim}>{l.label}</a></li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
