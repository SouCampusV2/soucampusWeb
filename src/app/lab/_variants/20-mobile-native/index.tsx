import Image from "next/image";
import { Figtree } from "next/font/google";
import {
  COUNTRIES,
  HERO,
  PLANS,
  PLANS_NOTE,
  SOCIALS,
  STEPS,
  noDash,
  type LabData,
} from "../../_shared/content";
import { BuildStrip, OrderSheet, TabBar } from "./client";
import s from "./styles.module.css";

// Вариант 20 — mobile-native (Эмиль Ковальски). Ветка design-lab.
//
// Скилл — про то, чтобы сайт в телефоне ощущался установленным
// приложением. Поэтому вариант спроектирован ОТ телефона: одна колонка
// шириной с телефон (на десктопе стоит по центру), нижняя панель
// вкладок, шторки вместо переходов. Применён его «Baseline» целиком:
//   • theme-color на обе темы (§10), viewport-fit=cover (в page.tsx) и
//     отступы env(safe-area-inset-*) у верха и нижней панели (§7);
//   • hover только под @media (hover:hover) and (pointer:fine) — на
//     тач-экране ничего не «залипает» после тапа (§1);
//   • без серой вспышки при тапе, touch-action: manipulation (§2, §5);
//   • у кнопок нельзя случайно выделить текст долгим нажатием (§8);
//   • hero — 100svh, а не 100vh/100dvh: не прыгает при скролле;
//   • overscroll-behavior: лента не тянет назад браузер (§6, §9).
// Смотреть по-настоящему — только на телефоне: скилл отдельно
// предупреждает, что эмуляции в DevTools верить нельзя (§11).
const figtree = Figtree({ subsets: ["latin"], variable: "--p-sans", preload: false });

export function MobileNative({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const builds = projects.slice(0, 8).map((p) => ({
    slug: p.slug,
    title: p.title,
    tag: p.tag,
    image: p.image,
    summary: noDash(p.summary),
    size: p.size,
    deadline: p.deadline,
    price: p.price,
  }));
  const steps = STEPS.map((x) => ({ ...x }));

  return (
    <div id="pocket-root" className={`${figtree.variable} ${s.root}`}>
      <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f2f1ee" />
      <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#121212" />

      <div className={s.app}>
        <header className={s.top}>
          <span className={s.brand}>SouCampus</span>
          <OrderSheet steps={steps}>
            <button type="button" className={s.topBtn}>Order</button>
          </OrderSheet>
        </header>

        <section id="home" className={s.hero}>
          {builds[0] && (
            <span className={s.heroImg}>
              <Image src={builds[0].image} alt="" fill priority sizes="480px" />
            </span>
          )}
          <div className={s.heroText}>
            <h1 className={s.h1}>{HERO.title}</h1>
            <p className={s.lede}>{HERO.lede}</p>
          </div>
        </section>

        <section aria-label="In numbers" className={s.stats}>
          {stats.map((stat) => (
            <div key={stat.id}>
              <b>{stat.value}{stat.suffix}</b>
              <span>{stat.label}</span>
            </div>
          ))}
        </section>

        <section id="builds" className={s.section}>
          <h2 className={s.h2}>Recent builds</h2>
          <p className={s.hint}>Swipe sideways, tap to open.</p>
          <BuildStrip builds={builds} />
        </section>

        <section className={s.section} aria-label="Clients from ten countries">
          <ul className={s.chips}>
            {COUNTRIES.map((c) => (
              <li key={c.id}>
                <Image src={c.src} alt="" width={16} height={16} className="rounded-full" />
                {c.label}
              </li>
            ))}
          </ul>
        </section>

        <section id="reviews" className={s.section}>
          <h2 className={s.h2}>What clients say</h2>
          <ul className={s.reviews}>
            {reviews.map((r) => (
              <li key={r.slug}>
                <p>{noDash(r.text)}</p>
                <span className={s.muted}>{r.name}, {r.role}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="library" className={s.section}>
          <h2 className={s.h2}>Build library</h2>
          <p className={s.hint}>{PLANS_NOTE}</p>
          <ul className={s.plans}>
            {PLANS.map((p) => (
              <li key={p.name}>
                <span className={s.planRow}>
                  <b>{p.name}</b>
                  <span>{p.price}</span>
                </span>
                <span className={s.muted}>{p.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <footer className={s.footer}>
          {SOCIALS.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
          ))}
        </footer>

        <TabBar steps={steps} />
      </div>
    </div>
  );
}
