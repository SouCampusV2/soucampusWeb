import Image from "next/image";
import Link from "next/link";
import { Schibsted_Grotesk } from "next/font/google";
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
import { FlipBuilds, FpsHud, Marquee } from "./client";
import s from "./styles.module.css";

// Вариант 24 — fixing-motion-performance (ibelick). Ветка design-lab.
//
// Скилл чинит дёрганую анимацию. Вариант делает обратное упражнение:
// страница, где движения МНОГО, но каждое выбрано так, чтобы не
// дёргаться, — и кнопка «Show FPS», чтобы проверить это глазами.
//   • hero-картинка и заголовки секций едут от скролла через CSS
//     animation-timeline: view() — на композиторе, без JS (§4);
//   • бегущая строка ставится на паузу, когда её не видно (§4);
//   • раскрытие работы — FLIP: один замер, дальше только transform
//     через WAAPI, will-change только на время анимации (§3, §6);
//   • размытие только одно, ≤ 8px, разовое — на входе hero (§7);
//   • никаких scroll-слушателей, никаких анимаций width/top (§1).
const grotesk = Schibsted_Grotesk({ subsets: ["latin"], variable: "--m-sans", preload: false });

export function FixingMotionPerformance({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 6);
  const lead = work[0];

  return (
    <div className={`${grotesk.variable} ${s.root}`}>
      <FpsHud />
      <header className={s.header}>
        <Link href="/" className={s.brand}>SouCampus</Link>
        <Link href={HERO.primary.href} className={s.btn}>{HERO.primary.label}</Link>
      </header>

      <section className={s.hero}>
        <h1 className={s.h1}>{HERO.title}</h1>
        <p className={s.lede}>{HERO.lede}</p>
        <div className={s.actions}>
          <Link href={HERO.primary.href} className={s.btn}>{HERO.primary.label}</Link>
          <Link href={HERO.secondary.href} className={s.btnGhost}>{HERO.secondary.label}</Link>
        </div>
      </section>

      {lead && (
        <div className={s.heroImgWrap}>
          <div className={s.heroImg}>
            <Image src={lead.image} alt={lead.title} fill priority sizes="100vw" />
          </div>
        </div>
      )}

      <section aria-label="In numbers" className={s.stats}>
        {stats.map((st) => (
          <div key={st.id} className={s.reveal}>
            <b>{st.value}{st.suffix}</b>
            <span>{st.label}</span>
          </div>
        ))}
      </section>

      <Marquee>
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1}>
            {COUNTRIES.map((c) => (
              <li key={c.id}>
                <Image src={c.src} alt="" width={26} height={26} className="rounded-full" />
                {c.label}
              </li>
            ))}
          </ul>
        ))}
      </Marquee>

      <section aria-labelledby="m-work" className={s.section}>
        <h2 id="m-work" className={`${s.h2} ${s.reveal}`}>Recent builds</h2>
        <p className={s.muted}>Tap a build to expand it. The grid re-flows with FLIP.</p>
        <FlipBuilds builds={work.map((p) => ({ slug: p.slug, title: p.title, tag: p.tag, image: p.image, summary: noDash(p.summary), size: p.size }))} />
      </section>

      <section aria-labelledby="m-steps" className={s.section}>
        <h2 id="m-steps" className={`${s.h2} ${s.reveal}`}>How an order goes</h2>
        <ol className={s.steps}>
          {STEPS.map((st, i) => (
            <li key={st.title} className={s.reveal}>
              <span className={s.stepNum}>{i + 1}</span>
              <h3>{st.title}</h3>
              <p className={s.muted}>{st.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="m-reviews" className={s.section}>
        <h2 id="m-reviews" className={`${s.h2} ${s.reveal}`}>What clients say</h2>
        <div className={s.reviews}>
          {reviews.slice(0, 6).map((r) => (
            <figure key={r.slug} className={s.reveal}>
              <blockquote>{noDash(r.text)}</blockquote>
              <figcaption className={s.muted}>{r.name}, {r.role}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section aria-labelledby="m-plans" className={s.section}>
        <h2 id="m-plans" className={`${s.h2} ${s.reveal}`}>The build library</h2>
        <p className={s.muted}>{PLANS_NOTE}</p>
        <ul className={s.plans}>
          {PLANS.map((p) => (
            <li key={p.name} className={s.reveal} data-strong={p.name === "Lifetime"}>
              <b>{p.name}</b>
              <span className={s.planPrice}>{p.price}</span>
              <span className={s.muted}>{p.text}</span>
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
        <ul className={s.socials}>
          {SOCIALS.map((l) => (
            <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
