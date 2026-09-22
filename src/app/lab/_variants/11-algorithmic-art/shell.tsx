import Link from "next/link";
import type { ReactNode } from "react";
import { Sora } from "next/font/google";
import { DISCORD_INVITE, HERO, SOCIALS } from "../../_shared/content";
import { labHref, type LabPage } from "../../_shared/pages";

// Шрифт и оболочка варианта Seed (algorithmic-art). У лендинга шапки нет:
// первый экран целиком отдан карте. У страниц студии она есть и тихая —
// строка-легенда атласа: название листа слева, остальные листы справа.
export const sora = Sora({ subsets: ["latin"], variable: "--a-sans", preload: false });

export const SLUG = "seed";

export const ROOT =
  "min-h-[100dvh] overflow-x-clip bg-[#0d1210] font-[family-name:var(--a-sans)] text-[#e7eee8] selection:bg-[#e7d9a0] selection:text-[#0d1210]";

/** Палитра биомов с первого экрана: вода, мелководье, песок, лес, луг, камень, снег. */
export const LEGEND = ["#243f8a", "#3a6ebe", "#d6c88c", "#3a742e", "#6ca446", "#80807c", "#ecf0f4"];

/** Новое зерно на каждый запрос: «свой мир у каждого посетителя». */
export function newSeed() {
  return Math.floor(Math.random() * 99999);
}

const NAV: { page: LabPage; label: string }[] = [
  { page: "portfolio", label: "Atlas" },
  { page: "about", label: "About" },
  { page: "contact", label: "Contact" },
];

export function Shell({ page, children }: { page: LabPage; children: ReactNode }) {
  return (
    <div className={`${sora.variable} ${ROOT}`}>
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6">
        <Link href={labHref(SLUG, "home")} className="font-semibold">
          SouCampus <span className="text-[#e7d9a0]">builds</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          {NAV.map((item, i) => (
            <Link
              key={item.page}
              href={labHref(SLUG, item.page)}
              aria-current={page === item.page ? "page" : undefined}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-[#e7eee8]/70 hover:text-[#e7eee8] aria-[current=page]:bg-white/[0.08] aria-[current=page]:text-[#e7eee8]"
            >
              <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: LEGEND[i * 2 + 2] }} />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {children}

      <footer className="mx-auto max-w-6xl px-5 pb-16 pt-8">
        <ul className="flex flex-wrap gap-6 border-t border-[#e7eee8]/15 pt-8 text-sm text-[#e7eee8]/55">
          {SOCIALS.map((l) => (
            <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer" className="hover:text-[#e7eee8]">{l.label}</a></li>
          ))}
        </ul>
      </footer>
    </div>
  );
}

/** Общий финал: тот же, что у лендинга. */
export function FinalCall({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-24">
      <h2 className="max-w-3xl text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1] tracking-[-0.04em]">{title}</h2>
      <div className="mt-10 flex flex-wrap gap-3">
        <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="rounded-full bg-[#e7d9a0] px-7 py-3.5 font-semibold text-[#0d1210]">Join Discord</a>
        <Link href={labHref(SLUG, "portfolio")} className="rounded-full px-7 py-3.5 font-semibold ring-1 ring-[#e7eee8]/30 hover:bg-white/10">{HERO.secondary.label}</Link>
      </div>
    </section>
  );
}
