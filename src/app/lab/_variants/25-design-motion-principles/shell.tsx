import Link from "next/link";
import type { ReactNode } from "react";
import { Albert_Sans } from "next/font/google";
import { SOCIALS } from "../../_shared/content";
import { labHref, type LabPage } from "../../_shared/pages";
import { Lenses } from "./client";
import s from "./styles.module.css";

// Оболочка варианта Lenses (design-motion-principles) — общая для лендинга
// и трёх страниц студии. Вынесена из index.tsx, когда страниц стало четыре.
// Шапка — линза Emil: навигация — самое частое действие, в ней движения нет.
const albert = Albert_Sans({ subsets: ["latin"], variable: "--l-sans", preload: false });

export const SLUG = "lenses";

const NAV: { page: LabPage; label: string }[] = [
  { page: "portfolio", label: "Portfolio" },
  { page: "about", label: "About" },
  { page: "contact", label: "Contact" },
];

export function Shell({ page, children }: { page: LabPage; children: ReactNode }) {
  return (
    <Lenses>
      <div className={`${albert.variable} ${s.root}`}>
        <header className={s.header}>
          <Link href={labHref(SLUG, "home")} className={s.brand}>SouCampus</Link>
          <nav aria-label="Main" className={s.nav}>
            {NAV.map((item) => (
              <Link key={item.page} href={labHref(SLUG, item.page)} aria-current={page === item.page ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
            <Link href="/marketplace">Marketplace</Link>
          </nav>
        </header>

        {children}

        <footer className={s.section} style={{ paddingTop: 0, paddingBottom: 48 }}>
          <ul className={s.socials}>
            {SOCIALS.map((l) => (
              <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>
            ))}
          </ul>
        </footer>
      </div>
    </Lenses>
  );
}
