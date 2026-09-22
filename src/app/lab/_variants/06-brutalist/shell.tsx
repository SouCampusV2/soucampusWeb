import Link from "next/link";
import type { ReactNode } from "react";
import { Archivo_Black, JetBrains_Mono } from "next/font/google";
import { SOCIALS } from "../../_shared/content";
import { labHref, type LabPage } from "../../_shared/pages";
import s from "./styles.module.css";

// Оболочка варианта Blueprint (brutalist-skill) — общая для лендинга и
// трёх страниц студии: бумага, шум, шапка-линейка, подвал. Вынесена из
// index.tsx, когда у варианта стало четыре страницы. Всё серверное: JS в
// браузер не уходит ни на одной из них.
const macro = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--b-macro", preload: false });
const micro = JetBrains_Mono({ subsets: ["latin"], variable: "--b-micro", preload: false });

export const SLUG = "blueprint";

const NAV: { page: LabPage; label: string }[] = [
  { page: "portfolio", label: "PORTFOLIO" },
  { page: "about", label: "ABOUT" },
];

export function Shell({ page, children }: { page: LabPage; children: ReactNode }) {
  return (
    <div className={`${macro.variable} ${micro.variable} ${s.root}`}>
      <div className={s.noise} aria-hidden="true" />

      <header className={s.bar}>
        <Link href={labHref(SLUG, "home")} className={s.macroSm}>SOUCAMPUS®</Link>
        <nav aria-label="Main" className={s.nav}>
          {NAV.map((item) => (
            <Link key={item.page} href={labHref(SLUG, item.page)} aria-current={page === item.page ? "page" : undefined}>
              [ {item.label} ]
            </Link>
          ))}
          <Link href="/marketplace">[ MARKETPLACE ]</Link>
        </nav>
        <Link href={labHref(SLUG, "contact")} aria-current={page === "contact" ? "page" : undefined} className={s.redBtn}>
          ORDER A MAP &gt;&gt;&gt;
        </Link>
      </header>

      {children}

      <footer className={s.footer}>
        <span>© SOUCAMPUS BUILDS</span>
        <ul>
          {SOCIALS.map((l) => (
            <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer">{l.label.toUpperCase()}</a></li>
          ))}
        </ul>
      </footer>
    </div>
  );
}
