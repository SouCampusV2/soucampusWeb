import Image from "next/image";
import Link from "next/link";
import { Onest } from "next/font/google";
import {
  COUNTRIES,
  DISCORD_INVITE,
  HERO,
  PLANS,
  PLANS_NOTE,
  SOCIALS,
  STEPS,
  noDash,
  type LabData,
} from "../../_shared/content";
import { DragReviews, Fan, FlipGrid, HeroIntro, Magnetic, Numbers } from "./client";
import s from "./styles.module.css";

// Вариант 22 — gsap-react (официальный скилл GreenSock). Ветка design-lab.
//
// Если 21 — «скролл-режиссёр», то этот — про GSAP в React без скролла:
//   • вход hero — одна временная шкала: SplitText режет заголовок на
//     буквы в масках, дальше абзац, кнопки и веер картинок;
//   • кнопки магнитные: quickTo/to в обработчиках через contextSafe;
//   • фильтр работ на Flip: карточки перелетают на новые места;
//   • отзывы — Draggable с инерцией и прилипанием к карточке.
// Плагины SplitText, Flip, Draggable, Inertia с 3.13 бесплатны и
// лежат в том же пакете gsap.
const onest = Onest({ subsets: ["latin"], variable: "--t-sans", preload: false });

export function GsapReact({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const fan = projects.slice(0, 3).map((p) => p.image);

  return (
    <div className={`${onest.variable} ${s.root}`}>
      <header className={s.header}>
        <Link href="/" className={s.brand}>SouCampus</Link>
        <nav aria-label="Main" className={s.nav}>
          <Link href="/portfolio">Portfolio</Link>
          <Link href="/marketplace">Marketplace</Link>
        </nav>
      </header>

      <section className={s.heroWrap}>
        <HeroIntro title={HERO.title} lede={HERO.lede} side={<Fan images={fan} />}>
          <Magnetic href={HERO.primary.href} variant="solid">{HERO.primary.label}</Magnetic>
          <Magnetic href={HERO.secondary.href} variant="ghost">{HERO.secondary.label}</Magnetic>
        </HeroIntro>
      </section>

      <section aria-label="In numbers" className={s.section}>
        <Numbers stats={stats.map((x) => ({ id: x.id, value: x.value, suffix: x.suffix, label: x.label }))} />
      </section>

      <section aria-labelledby="t-work" className={s.section}>
        <h2 id="t-work" className={s.h2}>Every build, filtered</h2>
        <FlipGrid builds={projects.map((p) => ({ slug: p.slug, title: p.title, tag: p.tag, image: p.image, size: p.size }))} />
      </section>

      <section aria-labelledby="t-reviews" className={s.section}>
        <h2 id="t-reviews" className={s.h2}>Drag through the reviews</h2>
        <DragReviews reviews={reviews.map((r) => ({ slug: r.slug, name: r.name, role: r.role, text: noDash(r.text) }))} />
        <ul className={s.countries}>
          {COUNTRIES.map((c) => (
            <li key={c.id}>
              <Image src={c.src} alt="" width={18} height={18} className="rounded-full" />
              {c.label}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="t-steps" className={s.section}>
        <h2 id="t-steps" className={s.h2}>How an order goes</h2>
        <ol className={s.steps}>
          {STEPS.map((st, i) => (
            <li key={st.title}>
              <span className={s.stepNum}>{i + 1}</span>
              <h3>{st.title}</h3>
              <p className={s.muted}>{st.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="t-plans" className={s.section}>
        <h2 id="t-plans" className={s.h2}>The build library</h2>
        <p className={s.muted}>{PLANS_NOTE}</p>
        <ul className={s.plans}>
          {PLANS.map((p) => (
            <li key={p.name} data-strong={p.name === "Lifetime"}>
              <b>{p.name}</b>
              <span className={s.planPrice}>{p.price}</span>
              <span>{p.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${s.section} ${s.final}`}>
        <h2 className={s.h1}>Tell me what you want built</h2>
        <div className={s.actions}>
          <Magnetic href={HERO.primary.href} variant="solid">{HERO.primary.label}</Magnetic>
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
