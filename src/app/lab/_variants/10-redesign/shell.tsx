import Link from "next/link";
import type { ReactNode } from "react";
import { Unbounded } from "next/font/google";
import { DISCORD_INVITE, HERO, SOCIALS } from "../../_shared/content";
import { labHref, type LabPage } from "../../_shared/pages";
import s from "./styles.module.css";

// Оболочка варианта Evolved (redesign-skill) — общая для лендинга и трёх
// страниц студии. Вынесена из index.tsx, когда у варианта стало четыре
// страницы: шапка с текущим пунктом и подвал в трёх колонках, как на
// живом сайте, только с одним акцентом.
const unbounded = Unbounded({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--r-display", preload: false });

export const SLUG = "evolved";

const NAV: { page: LabPage; label: string }[] = [
  { page: "portfolio", label: "Portfolio" },
  { page: "about", label: "About me" },
  { page: "contact", label: "Contact" },
];

export function Shell({ page, children }: { page: LabPage; children: ReactNode }) {
  return (
    <div className={`${unbounded.variable} ${s.root}`}>
      <header className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5">
        <Link href={labHref(SLUG, "home")} className={`${s.display} text-lg font-bold`}>SouCampus</Link>
        <nav aria-label="Main" className="hidden gap-7 text-[15px] text-[var(--muted)] md:flex">
          {NAV.map((item) => (
            <Link
              key={item.page}
              href={labHref(SLUG, item.page)}
              aria-current={page === item.page ? "page" : undefined}
              className={`hover:text-[var(--ink)] ${s.navLink}`}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/marketplace" className="hover:text-[var(--ink)]">Marketplace</Link>
        </nav>
        <Link href={labHref(SLUG, "contact")} className={`${s.btn} ${s.btnAccent} h-10 px-4 text-sm`}>{HERO.primary.label}</Link>
      </header>

      {children}

      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className={`${s.display} text-xl font-bold`}>SouCampus</p>
            <p className="mt-3 max-w-xs text-[var(--muted)]">Custom Minecraft builds on order: castles, spawns, cities, and everything in between.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={labHref(SLUG, "contact")} className={`${s.btn} ${s.btnAccent} h-11 px-5`}>{HERO.primary.label}</Link>
              <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={`${s.btn} ${s.btnLine} h-11 px-5`}>Discord</a>
            </div>
          </div>
          <ul className="flex flex-col gap-2 text-[var(--muted)]">
            <li className="font-semibold text-[var(--ink)]">Studio</li>
            {NAV.map((item) => (
              <li key={item.page}><Link href={labHref(SLUG, item.page)} className="hover:text-[var(--ink)]">{item.label}</Link></li>
            ))}
          </ul>
          <ul className="flex flex-col gap-2 text-[var(--muted)]">
            <li className="font-semibold text-[var(--ink)]">Follow</li>
            {SOCIALS.slice(1, 5).map((l) => (
              <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer" className="hover:text-[var(--ink)]">{l.label}</a></li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}
