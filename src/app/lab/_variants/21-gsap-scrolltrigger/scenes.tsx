"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SIZE_MAX, SIZE_MIN, useEstimate } from "../../_shared/useEstimate";
import { ABOUT, CONTACT, FAQ, PORTFOLIO, SKILLS, STUDIOS, TIMELINE, labHref } from "../../_shared/pages";
import { Final, Header, SLUG } from "./chrome";
import s from "./styles.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Страницы студии варианта Scroll. Правила — те же, что у лендинга
// (client.tsx): одна зона useGSAP со scope на корень страницы, всё
// движение внутри gsap.matchMedia, при «меньше движения» ничего не
// закрепляется и не скрабится, ScrollTrigger только на верхнеуровневых
// твинах, горизонтальные ленты — ease: "none", триггеры в порядке страницы.
// У каждой страницы свой приём, не повторяющий лендинг:
//
//   Portfolio → отъезд камеры: кадр во весь экран становится клеткой 3×3;
//               потом стопка карточек, потом партии плиток (batch)
//   Contact   → закреплённый калькулятор: скролл растит квадрат карты
//   About     → горизонтальная лента этапов с прогрессом, строки
//               инструментов навстречу друг другу, слова от скролла

const MOTION = "(prefers-reduced-motion: no-preference)";
const WIDE = "(min-width: 900px)";

type Build = { slug: string; title: string; tag: string; image: string; size: string; deadline: string; summary: string };

/** Финальная фраза заливается цветом — общий приём всех страниц варианта. */
function fillFinal() {
  gsap.fromTo(
    ".s-fill",
    { backgroundSize: "0% 100%" },
    { backgroundSize: "100% 100%", ease: "none", scrollTrigger: { trigger: ".s-final", start: "top 75%", end: "top 25%", scrub: true } }
  );
}

// ── Portfolio ───────────────────────────────────────────────────────────

export function ScrollPortfolio({ grid, featured, rest }: { grid: Build[]; featured: Build[]; rest: Build[] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION, () => {
        // 1. Отъезд камеры. Центральная клетка в начале увеличена так,
        //    чтобы закрыть весь экран; скролл сводит её масштаб к 1, а
        //    восемь соседних проявляются вокруг по очереди.
        const center = root.current?.querySelector<HTMLElement>(".s-zoom-center");
        if (center) {
          const cover = () => Math.max(window.innerWidth / center.offsetWidth, window.innerHeight / center.offsetHeight) * 1.02;
          gsap
            .timeline({
              scrollTrigger: { trigger: ".s-zoom", start: "top top", end: "+=130%", scrub: 0.6, pin: true, invalidateOnRefresh: true },
            })
            .fromTo(center, { scale: cover, borderRadius: 0 }, { scale: 1, borderRadius: 14, ease: "none" }, 0)
            .fromTo(".s-zoom-cell", { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, stagger: 0.05, ease: "none" }, 0.35)
            .to(".s-zoom-title", { opacity: 0, y: -40, ease: "none" }, 0);
        }

        // 2. Стопка: карточка уменьшается и темнеет, пока следующая
        //    наезжает на неё. Триггер — СЛЕДУЮЩАЯ карточка.
        const cards = gsap.utils.toArray<HTMLElement>(".s-stack-card");
        cards.forEach((card, i) => {
          const next = cards[i + 1];
          if (!next) return;
          gsap.to(card, {
            scale: 0.92,
            filter: "brightness(0.94)",
            ease: "none",
            scrollTrigger: { trigger: next, start: "top bottom", end: "top 90px", scrub: true },
          });
        });

        // 3. Плитки — партиями: сколько въехало вместе, столько и появляется.
        gsap.set(".s-tile", { opacity: 0, y: 40 });
        ScrollTrigger.batch(".s-tile", {
          start: "top 90%",
          onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, stagger: 0.07, duration: 0.7, ease: "power3.out", overwrite: true }),
        });

        fillFinal();
      });
    },
    { scope: root }
  );

  return (
    <div ref={root} className={s.page}>
      <Header page="portfolio" />

      <section className={`s-zoom ${s.zoom}`} aria-label={PORTFOLIO.title}>
        <div className={s.zoomGrid}>
          {grid.map((b, i) => (
            <Link
              key={b.slug}
              href={`/portfolio/${b.slug}`}
              className={`${s.zoomCell} ${i === 4 ? `s-zoom-center ${s.zoomCenter}` : "s-zoom-cell"}`}
              aria-label={b.title}
            >
              <Image src={b.image} alt="" fill priority={i === 4} sizes={i === 4 ? "100vw" : "33vw"} />
            </Link>
          ))}
        </div>
        <h1 className={`s-zoom-title ${s.zoomTitle}`}>{PORTFOLIO.title}</h1>
      </section>

      <section aria-labelledby="st-featured" className={s.stack}>
        <h2 id="st-featured" className={s.h2}>Featured</h2>
        {featured.map((b) => (
          <article key={b.slug} className={`s-stack-card ${s.stackCard}`}>
            <Link href={`/portfolio/${b.slug}`} className={s.stackImg}>
              <Image src={b.image} alt={b.title} fill sizes="(min-width: 800px) 55vw, 100vw" />
            </Link>
            <div>
              <p className={s.muted}>{b.tag}</p>
              <h3>{b.title}</h3>
              <p className={s.muted}>{b.summary}</p>
              <p><b>{b.size}</b> · built in {b.deadline}</p>
            </div>
          </article>
        ))}
      </section>

      <section aria-labelledby="st-more" className={s.section}>
        <h2 id="st-more" className={s.h2}>{PORTFOLIO.more}</h2>
        <p className={s.muted} style={{ margin: "0 0 32px" }}>{PORTFOLIO.lede}</p>
        <div className={s.grid}>
          {rest.map((b) => (
            <Link key={b.slug} href={`/portfolio/${b.slug}`} className={`s-tile ${s.tile}`}>
              <span className={s.tileImg}>
                <Image src={b.image} alt={b.title} fill sizes="(min-width: 900px) 33vw, (min-width: 560px) 50vw, 100vw" />
              </span>
              <b>{b.title}</b>
              <span className={s.muted}>{b.tag}, {b.size}</span>
            </Link>
          ))}
        </div>
      </section>

      <Final title="Tell me what you want built" secondary={{ label: "About me", href: labHref(SLUG, "about") }} />
    </div>
  );
}

// ── Contact ─────────────────────────────────────────────────────────────

// Размер, до которого скролл растит квадрат: 50 → 600 блоков. Выше —
// поле ввода: скролл показывает шкалу, точное число пишется руками.
const SCRUB_FROM = 50;
const SCRUB_TO = 600;
const SCRUB_STEP = 10;

export function ScrollContact({ discord }: { discord: string }) {
  const root = useRef<HTMLDivElement>(null);
  const e = useEstimate(SCRUB_FROM);
  // Колбэк ScrollTrigger создаётся один раз и держит сеттеры в замыкании.
  // Это безопасно: setWidth/setHeight — сеттеры useState, React не меняет
  // их между рендерами.
  const { setWidth, setHeight } = e;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION, () => {
        // Калькулятор закреплён, прогресс скролла — это размер карты.
        // Шаг 10 блоков: иначе React перерисовывал бы цифры на каждый пиксель.
        let last = -1;
        ScrollTrigger.create({
          trigger: ".s-sizer",
          start: "top top",
          end: "+=150%",
          pin: true,
          onUpdate: (self) => {
            const size = Math.round((SCRUB_FROM + self.progress * (SCRUB_TO - SCRUB_FROM)) / SCRUB_STEP) * SCRUB_STEP;
            if (size === last) return;
            last = size;
            setWidth(String(size));
            setHeight(String(size));
          },
        });

        gsap.set(".s-q", { opacity: 0, y: 30 });
        ScrollTrigger.batch(".s-q", {
          start: "top 92%",
          onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, stagger: 0.06, duration: 0.6, ease: "power3.out", overwrite: true }),
        });

        fillFinal();
      });
    },
    { scope: root }
  );

  const share = Math.max(e.w, e.h) / SIZE_MAX;

  return (
    <div ref={root} className={s.page}>
      <Header page="contact" />

      <section className={s.intro}>
        <h1 className={s.h2} style={{ fontSize: "clamp(2.8rem, 8vw, 7rem)" }}>
          {CONTACT.titleStart} <span style={{ color: "var(--accent)" }}>{CONTACT.titleAccent}</span>
        </h1>
        <p>{CONTACT.lede}</p>
        <div className={s.actions} style={{ marginTop: 28 }}>
          <a href={discord} target="_blank" rel="noreferrer" className={s.pill}>{CONTACT.primary}</a>
          <a href="#faq" className={s.pillGhost}>{CONTACT.answersTitle}</a>
        </div>
      </section>

      <section aria-labelledby="st-size" className={`s-sizer ${s.sizer}`}>
        <div>
          <h2 id="st-size" className={s.h2}>{CONTACT.estimateTitle}</h2>
          <p className={s.muted}>Keep scrolling and the map grows. Or type the exact size.</p>
          <div aria-live="polite" style={{ marginTop: 28 }}>
            <p className={s.muted} style={{ margin: 0 }}>Price from</p>
            <p className={s.bigNum}>{e.priceLabel}</p>
            <p className={s.muted} style={{ margin: "18px 0 0" }}>Timeline</p>
            <p className={s.bigNum} style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>{e.deadline}</p>
          </div>
          <div className={s.fields}>
            <label>
              Width, blocks
              <input type="number" inputMode="numeric" min={SIZE_MIN} max={SIZE_MAX} value={e.width} onChange={(ev) => e.setWidth(ev.target.value)} />
            </label>
            <label>
              Length, blocks
              <input type="number" inputMode="numeric" min={SIZE_MIN} max={SIZE_MAX} value={e.height} onChange={(ev) => e.setHeight(ev.target.value)} />
            </label>
          </div>
          <p className={s.muted} style={{ fontSize: 14, marginTop: 14 }}>{CONTACT.estimateNote}</p>
        </div>
        <div className={s.plot}>
          <span className={s.plotLabel}>{e.w} × {e.h}</span>
          {/* Сторона квадрата — доля от максимума 1000 блоков. Сетка фона —
              по 100 блоков на клетку. */}
          <span
            className={s.plotSquare}
            style={{ width: `${Math.max(4, (e.w / SIZE_MAX) * 100)}%`, height: `${Math.max(4, (e.h / SIZE_MAX) * 100)}%` }}
            aria-hidden="true"
          />
          <span className={s.muted} style={{ position: "absolute", bottom: 14, right: 18, fontSize: 13 }}>
            grid: 100 blocks · {Math.round(share * 100)}% of max
          </span>
        </div>
      </section>

      <section aria-label="Ways to start" className={s.section} style={{ paddingTop: 60 }}>
        <div className={s.twoUp}>
          <div>
            <h3>{CONTACT.chatTitle}</h3>
            <p className={s.muted}>{CONTACT.chatText}</p>
            <a href={discord} target="_blank" rel="noreferrer" className={s.pill}>{CONTACT.chatCta}</a>
          </div>
          <div>
            <h3>{CONTACT.answersTitle}</h3>
            <p className={s.muted}>{CONTACT.answersText}</p>
            <a href="#faq" className={s.pillGhost}>See the questions</a>
          </div>
        </div>
      </section>

      <section id="faq" aria-labelledby="st-faq" className={s.section} style={{ scrollMarginTop: 80 }}>
        <h2 id="st-faq" className={s.h2}>{CONTACT.faqTitle}</h2>
        <div className={s.faq}>
          {FAQ.map((item) => (
            <details key={item.question} className="s-q">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <Final title="Tell me what you want built" secondary={{ label: "See what I've built", href: labHref(SLUG, "portfolio") }} />
    </div>
  );
}

// ── About ───────────────────────────────────────────────────────────────

export function ScrollAbout() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ motion: MOTION, wide: WIDE }, (ctx) => {
        const { motion, wide } = ctx.conditions as { motion: boolean; wide: boolean };
        if (!motion) return;

        // 1. Цифры досчитывают один раз. «~10» — число с приставкой.
        gsap.utils.toArray<HTMLElement>(".s-num").forEach((el) => {
          const to = Number(el.dataset.value);
          const counter = { v: 0 };
          gsap.to(counter, {
            v: to,
            duration: 1.4,
            ease: "power3.out",
            onUpdate: () => (el.textContent = `${Math.round(counter.v)}`),
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          });
        });

        // 2. Путь — горизонтальная лента на широком экране, с полосой
        //    прогресса на ТОМ ЖЕ таймлайне: они не могут разойтись.
        if (wide) {
          const track = root.current?.querySelector<HTMLElement>(".s-path-track");
          if (track) {
            gsap
              .timeline({
                scrollTrigger: {
                  trigger: ".s-path",
                  pin: true,
                  scrub: 1,
                  start: "top top",
                  end: () => `+=${track.scrollWidth - window.innerWidth}`,
                  invalidateOnRefresh: true,
                },
              })
              .to(track, { x: () => -(track.scrollWidth - window.innerWidth), ease: "none" }, 0)
              .fromTo(".s-path-bar", { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0);
          }
        }

        // 3. Строки инструментов едут навстречу друг другу, пока секция
        //    проходит экран. Без закрепления — просто скраб.
        gsap.fromTo(".s-row-a", { xPercent: 0 }, { xPercent: -25, ease: "none", scrollTrigger: { trigger: ".s-rows", start: "top bottom", end: "bottom top", scrub: true } });
        gsap.fromTo(".s-row-b", { xPercent: -25 }, { xPercent: 0, ease: "none", scrollTrigger: { trigger: ".s-rows", start: "top bottom", end: "bottom top", scrub: true } });

        // 4. Слова проявляются от скролла, одно за другим.
        gsap.fromTo(
          ".s-word",
          { opacity: 0.12 },
          { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: ".s-words", start: "top 80%", end: "bottom 45%", scrub: true } }
        );

        fillFinal();
      });
    },
    { scope: root }
  );

  const words = ABOUT.closing[1].split(" ");

  return (
    <div ref={root} className={s.page}>
      <Header page="about" />

      <section className={s.intro}>
        <p style={{ margin: 0, color: "var(--accent)", fontWeight: 800 }}>{ABOUT.eyebrow}</p>
        <h1 className={s.h2} style={{ fontSize: "clamp(2.8rem, 8vw, 7rem)", marginTop: 12 }}>{ABOUT.title}</h1>
        <p>
          <b style={{ color: "var(--ink)" }}>{ABOUT.leadStrong}</b> {ABOUT.lead}
        </p>
      </section>

      <section aria-label="In numbers" className={s.stats}>
        {ABOUT.facts.map((fact) => {
          const num = Number(fact.value.replace(/\D/g, ""));
          const prefix = fact.value.startsWith("~") ? "~" : "";
          return (
            <div key={fact.label}>
              <p className={s.statValue}>
                {prefix}
                <span className="s-num" data-value={num}>{num}</span>
              </p>
              <p className={s.muted}>{fact.label}</p>
            </div>
          );
        })}
      </section>

      <section aria-labelledby="st-path" className={`s-path ${s.path}`}>
        <h2 id="st-path" className={s.h2}>From six to twenty-one</h2>
        <div className={s.pathBar}>
          <div className={`s-path-bar ${s.progress}`} />
        </div>
        <ol className={`s-path-track ${s.pathTrack}`} style={{ margin: 0, listStyle: "none" }}>
          {TIMELINE.map((item) => (
            <li key={item.age} className={s.stage}>
              <p className={s.stageAge}>{item.age}</p>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="st-tools" className={`s-rows ${s.rows}`}>
        <h2 id="st-tools" className={s.h2} style={{ padding: "0 clamp(16px, 4vw, 48px)" }}>{ABOUT.skillsTitle}</h2>
        <ul className={`s-row-a ${s.row}`}>
          {[...SKILLS.tools, ...SKILLS.tools].map((t, i) => (
            <li key={`${t}-${i}`} aria-hidden={i >= SKILLS.tools.length}>{t}</li>
          ))}
        </ul>
        <ul className={`s-row-b ${s.row}`}>
          {[...SKILLS.craft, ...SKILLS.craft].map((t, i) => (
            <li key={`${t}-${i}`} aria-hidden={i >= SKILLS.craft.length}>{t}</li>
          ))}
        </ul>
        <p className={s.muted} style={{ padding: "16px clamp(16px, 4vw, 48px) 0", maxWidth: 640 }}>
          {ABOUT.skillsLede} Studios: {STUDIOS.join(", ")}.
        </p>
      </section>

      <p className={`s-words ${s.words}`}>
        {words.map((w, i) => (
          <span key={i} className="s-word">
            {w}{" "}
          </span>
        ))}
      </p>

      <section className={s.section} style={{ paddingTop: 0 }}>
        <p className={s.muted} style={{ maxWidth: 720, fontSize: 19 }}>{ABOUT.closing[0]}</p>
      </section>

      <Final title="Let's build yours next" secondary={{ label: "See what I've built", href: labHref(SLUG, "portfolio") }} />
    </div>
  );
}
