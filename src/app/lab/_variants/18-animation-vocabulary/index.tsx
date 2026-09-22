import Image from "next/image";
import Link from "next/link";
import { Bricolage_Grotesque, DM_Mono } from "next/font/google";
import {
  COUNTRIES,
  HERO,
  PLANS,
  SOCIALS,
  STEPS,
  noDash,
  pickWork,
  type LabData,
} from "../../_shared/content";
import {
  DirectionalReviews,
  DrawnLine,
  GlossaryRoot,
  LayoutPlans,
  ParallaxImage,
  RippleLink,
  StaggerTitle,
  Term,
  Ticker,
  TiltCard,
} from "./client";
import s from "./styles.module.css";

// Вариант 18 — animation-vocabulary (Эмиль Ковальски). Ветка design-lab.
//
// Скилл — словарь: переводит «ну та штука, что пружинит» в точное
// название приёма. Страница делает обратное: каждый блок исполняет один
// приём, и рядом стоит его имя с определением из глоссария. Кнопка
// сверху прячет подписи — тогда это обычный лендинг.
//
// Зачем так: владелец учится формулировать задачи ИИ и дизайнерам.
// Здесь можно увидеть термин и приём одновременно, а не читать список.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--g-display", preload: false });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--g-mono", preload: false });

export function AnimationVocabulary({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 3);

  return (
    <div className={`${display.variable} ${mono.variable} ${s.root}`}>
      <GlossaryRoot>
        <header className={s.header}>
          <Link href="/" className={s.brand}>SouCampus</Link>
          <Link href={HERO.primary.href} className={s.headerLink}>{HERO.primary.label}</Link>
        </header>

        <section className={s.hero}>
          <div>
            <Term name="Stagger" />
            <StaggerTitle text={HERO.title} />
            <p className={s.lede}>{HERO.lede}</p>
            <div className={s.actions}>
              <RippleLink href={HERO.primary.href}>{HERO.primary.label}</RippleLink>
              <Term name="Ripple" />
            </div>
          </div>
          {work[0] && (
            <div className={s.heroImage}>
              <Term name="Parallax" align="right" />
              <Term name="Float" align="right" />
              <ParallaxImage src={work[0].image} alt={work[0].title} />
            </div>
          )}
        </section>

        <section aria-label="In numbers" className={s.section}>
          <Term name="Number ticker" />
          <ul className={s.stats}>
            {stats.map((stat) => (
              <li key={stat.id}>
                <Ticker value={stat.value} suffix={stat.suffix} />
                <span>{stat.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Clients from ten countries" className={s.marqueeWrap}>
          <div className={s.pad}><Term name="Marquee" /></div>
          <div className={s.marquee}>
            <div className={s.track}>
              {[0, 1].map((copy) => (
                <ul key={copy} aria-hidden={copy === 1}>
                  {COUNTRIES.map((c) => (
                    <li key={c.id}>
                      <Image src={c.src} alt="" width={34} height={34} className="rounded-full" />
                      {c.label}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="g-work" className={s.section}>
          <h2 id="g-work" className={s.h2}>Recent builds</h2>
          <Term name="3D tilt" />
          <div className={s.work}>
            {work.map((p) => (
              <Link key={p.slug} href={`/portfolio/${p.slug}`}>
                <TiltCard>
                  <div className={s.workImg}>
                    <Image src={p.image} alt={p.title} fill sizes="(min-width: 900px) 30vw, 100vw" />
                  </div>
                  <p className={s.workTitle}>{p.title}</p>
                  <p className={s.muted}>{noDash(p.summary)}</p>
                </TiltCard>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="g-steps" className={s.section}>
          <h2 id="g-steps" className={s.h2}>How an order goes</h2>
          <Term name="Line drawing" />
          <DrawnLine />
          <ol className={s.steps}>
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className={s.stepNum}>{i + 1}</span>
                <h3>{step.title}</h3>
                <p className={s.muted}>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="g-reviews" className={s.section}>
          <h2 id="g-reviews" className={s.h2}>What clients say</h2>
          <Term name="Direction-aware transition" />
          <DirectionalReviews reviews={reviews.map((r) => ({ slug: r.slug, name: r.name, role: r.role, text: noDash(r.text) }))} />
        </section>

        <section aria-labelledby="g-plans" className={s.section}>
          <h2 id="g-plans" className={s.h2}>The build library</h2>
          <Term name="Layout animation" />
          <LayoutPlans plans={PLANS.map((p) => ({ ...p }))} />
        </section>

        <section className={`${s.section} ${s.final}`}>
          <h2 className={s.h1}>Tell me what you want built</h2>
          <div className={s.actions}>
            <RippleLink href={HERO.primary.href}>{HERO.primary.label}</RippleLink>
            <Term name="Press feedback" />
          </div>
          <ul className={s.socials}>
            {SOCIALS.map((l) => (
              <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>
            ))}
          </ul>
        </section>
      </GlossaryRoot>
    </div>
  );
}
