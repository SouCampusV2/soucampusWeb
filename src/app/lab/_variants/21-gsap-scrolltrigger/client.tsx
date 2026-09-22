"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Header } from "./chrome";
import s from "./styles.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Build = { slug: string; title: string; tag: string; image: string; size: string };
type Props = {
  hero: { title: string; lede: string; primary: { label: string; href: string }; secondary: { label: string; href: string } };
  heroImage: string;
  stats: { id: string; value: number; suffix: string; label: string }[];
  builds: Build[];
  steps: { title: string; text: string }[];
  reviews: { slug: string; name: string; role: string; text: string }[];
  plans: { name: string; price: string; text: string }[];
  plansNote: string;
  countries: { id: string; label: string; src: string }[];
  socials: { label: string; href: string }[];
  discord: string;
};

// Вся страница — одна зона useGSAP со scope на корень: селекторы вида
// ".x" ищутся только внутри, а при уходе со страницы (смена варианта)
// хук сам откатывает ВСЕ твины и ScrollTrigger'ы, вместе с пин-спейсерами.
//
// Правила официального скилла, которые здесь соблюдены:
//   • ScrollTrigger висит только на верхнеуровневых таймлайнах/твинах;
//   • горизонтальная лента — ease: "none", вложенные триггеры через
//     containerAnimation, без pin/snap у них;
//   • триггеры создаются в порядке страницы сверху вниз;
//   • scrub и toggleActions не смешиваются на одном триггере;
//   • всё движение — внутри gsap.matchMedia: при «меньше движения»
//     ничего не закрепляется и не скрабится, контент просто стоит;
//   • markers выключены.
export function ScrollPage(p: Props) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", wide: "(min-width: 900px)" },
        (ctx) => {
          const { motion, wide } = ctx.conditions as { motion: boolean; wide: boolean };
          if (!motion) return;

          // 1. Hero: закреплён, картинка раскрывается из окошка на весь
          //    экран, слова заголовка расходятся в стороны.
          gsap
            .timeline({
              scrollTrigger: { trigger: ".s-hero", start: "top top", end: "+=140%", scrub: 0.6, pin: true },
            })
            .fromTo(".s-mask", { clipPath: "inset(28% 34% 28% 34% round 24px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none" }, 0)
            .fromTo(".s-mask img", { scale: 1.35 }, { scale: 1, ease: "none" }, 0)
            .to(".s-word-l", { xPercent: -60, opacity: 0, ease: "none" }, 0)
            .to(".s-word-r", { xPercent: 60, opacity: 0, ease: "none" }, 0)
            .fromTo(".s-hero-end", { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: "none" }, 0.6);

          // 2. Цифры досчитывают, когда блок въезжает (один раз).
          gsap.utils.toArray<HTMLElement>(".s-num").forEach((el) => {
            const to = Number(el.dataset.value);
            const counter = { v: 0 };
            gsap.to(counter, {
              v: to,
              duration: 1.6,
              ease: "power3.out",
              onUpdate: () => (el.textContent = `${Math.round(counter.v)}`),
              scrollTrigger: { trigger: el, start: "top 85%", once: true },
            });
          });

          // 3. Горизонтальная лента работ (только широкие экраны).
          if (wide) {
            const track = root.current?.querySelector<HTMLElement>(".s-track");
            if (track) {
              const scrollTween = gsap.to(track, {
                x: () => -(track.scrollWidth - window.innerWidth),
                ease: "none",
                scrollTrigger: {
                  trigger: ".s-hscroll",
                  pin: true,
                  scrub: 1,
                  start: "top top",
                  end: () => `+=${track.scrollWidth - window.innerWidth}`,
                  invalidateOnRefresh: true,
                },
              });
              // Внутри каждой карточки картинка едет медленнее ленты — параллакс.
              gsap.utils.toArray<HTMLElement>(".s-card-img").forEach((img) => {
                gsap.fromTo(
                  img,
                  { xPercent: -12 },
                  {
                    xPercent: 12,
                    ease: "none",
                    scrollTrigger: { trigger: img.parentElement, containerAnimation: scrollTween, start: "left right", end: "right left", scrub: true },
                  }
                );
              });
            }
          }

          // 4. Шаги: секция закреплена, полоса прогресса растёт, шаги
          //    загораются по очереди.
          gsap
            .timeline({
              scrollTrigger: { trigger: ".s-steps", start: "top top", end: "+=120%", scrub: 0.5, pin: true },
            })
            .fromTo(".s-progress", { scaleX: 0 }, { scaleX: 1, ease: "none", duration: 1 }, 0)
            .fromTo(".s-step", { opacity: 0.15 }, { opacity: 1, stagger: 0.2, duration: 0.2, ease: "none" }, 0);

          // 5. Отзывы — батчем: сколько въехало вместе, столько и появляется,
          //    с маленьким шагом между ними.
          gsap.set(".s-review", { opacity: 0, y: 40 });
          ScrollTrigger.batch(".s-review", {
            start: "top 88%",
            onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, stagger: 0.08, duration: 0.7, ease: "power3.out", overwrite: true }),
          });

          // 6. Финал: фраза «заливается» цветом по мере прокрутки.
          gsap.fromTo(
            ".s-fill",
            { backgroundSize: "0% 100%" },
            { backgroundSize: "100% 100%", ease: "none", scrollTrigger: { trigger: ".s-final", start: "top 75%", end: "top 25%", scrub: true } }
          );
        }
      );
    },
    { scope: root }
  );

  const [first, ...rest] = p.hero.title.split(" crafts ");

  return (
    <div ref={root} className={s.page}>
      <Header page="home" />

      <section className={`s-hero ${s.hero}`}>
        <div className={`s-mask ${s.mask}`}>
          <Image src={p.heroImage} alt="" fill priority sizes="100vw" />
        </div>
        <h1 className={s.heroTitle}>
          <span className={`s-word-l ${s.wordL}`}>{first}</span>
          <span className={`s-word-r ${s.wordR}`}>crafts {rest.join(" crafts ")}</span>
        </h1>
        <div className={`s-hero-end ${s.heroEnd}`}>
          <p>{p.hero.lede}</p>
          <div className={s.actions}>
            <Link href={p.hero.primary.href} className={s.pill}>{p.hero.primary.label}</Link>
            <Link href={p.hero.secondary.href} className={s.pillGhost}>{p.hero.secondary.label}</Link>
          </div>
        </div>
      </section>

      <section aria-label="In numbers" className={s.stats}>
        {p.stats.map((st) => (
          <div key={st.id}>
            <p className={s.statValue}>
              <span className="s-num" data-value={st.value}>{st.value}</span>
              {st.suffix}
            </p>
            <p className={s.muted}>{st.label}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="s-work" className={`s-hscroll ${s.hscroll}`}>
        <h2 id="s-work" className={s.h2}>Recent builds</h2>
        <div className={`s-track ${s.track}`}>
          {p.builds.map((b) => (
            <Link key={b.slug} href={`/portfolio/${b.slug}`} className={s.card}>
              <span className={s.cardFrame}>
                <span className={`s-card-img ${s.cardImg}`}>
                  <Image src={b.image} alt={b.title} fill sizes="(min-width: 900px) 42vw, 90vw" />
                </span>
              </span>
              <span className={s.cardTitle}>{b.title}</span>
              <span className={s.muted}>{b.tag}, {b.size}</span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="s-steps-t" className={`s-steps ${s.steps}`}>
        <h2 id="s-steps-t" className={s.h2}>How an order goes</h2>
        <div className={s.progressTrack}>
          <div className={`s-progress ${s.progress}`} />
        </div>
        <ol className={s.stepList}>
          {p.steps.map((st, i) => (
            <li key={st.title} className="s-step">
              <span className={s.stepNum}>{String(i + 1).padStart(2, "0")}</span>
              <h3>{st.title}</h3>
              <p className={s.muted}>{st.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="s-reviews" className={s.section}>
        <h2 id="s-reviews" className={s.h2}>What clients say</h2>
        <div className={s.reviews}>
          {p.reviews.map((r) => (
            <figure key={r.slug} className={`s-review ${s.review}`}>
              <blockquote>{r.text}</blockquote>
              <figcaption className={s.muted}>{r.name}, {r.role}</figcaption>
            </figure>
          ))}
        </div>
        <ul className={s.countries}>
          {p.countries.map((c) => (
            <li key={c.id}>
              <Image src={c.src} alt="" width={18} height={18} className="rounded-full" />
              {c.label}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="s-plans" className={s.section}>
        <h2 id="s-plans" className={s.h2}>The build library</h2>
        <p className={s.muted}>{p.plansNote}</p>
        <ul className={s.plans}>
          {p.plans.map((pl) => (
            <li key={pl.name} data-strong={pl.name === "Lifetime"}>
              <b>{pl.name}</b>
              <span className={s.planPrice}>{pl.price}</span>
              <span className={s.muted}>{pl.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={`s-final ${s.final}`}>
        <h2 className={`s-fill ${s.fill}`}>Tell me what you want built</h2>
        <div className={s.actions}>
          <Link href={p.hero.primary.href} className={s.pill}>{p.hero.primary.label}</Link>
          <a href={p.discord} target="_blank" rel="noreferrer" className={s.pillGhost}>Discord</a>
        </div>
        <ul className={s.socials}>
          {p.socials.map((l) => (
            <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
