import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Outfit } from "next/font/google";
import { HERO, SOCIALS } from "../../_shared/content";
import { labHref, type LabPage } from "../../_shared/pages";
import s from "./styles.module.css";

// Оболочка варианта Cinema — общая для лендинга и трёх страниц студии:
// тёмная сцена, зерно, плавающая стеклянная пилюля сверху, подвал.
// Вынесена из index.tsx, когда страниц стало четыре: копия шапки в
// каждой разъехалась бы, как разъезжались копии галереи в формах.
const outfit = Outfit({ subsets: ["latin"], variable: "--g-sans", preload: false });

export const SLUG = "cinema";

const NAV: { page: LabPage; label: string }[] = [
  { page: "portfolio", label: "Portfolio" },
  { page: "about", label: "About" },
];

export function Shell({ page, children }: { page: LabPage; children: ReactNode }) {
  return (
    <main className={`${outfit.variable} ${s.root} w-full max-w-full overflow-x-hidden`}>
      <div className={s.grain} aria-hidden="true" />

      {/* Плавающая стеклянная пилюля — единственный элемент с blur,
          потому что он fixed (§6 performance из soft-skill тоже). */}
      <header className="fixed inset-x-0 top-5 z-40 flex justify-center px-4">
        <nav aria-label="Main" className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] p-1.5 pl-5 text-[14px] text-white/80 backdrop-blur-xl">
          <Link href={labHref(SLUG, "home")} className="mr-3 font-semibold text-white">SouCampus</Link>
          {NAV.map((item) => (
            <Link
              key={item.page}
              href={labHref(SLUG, item.page)}
              aria-current={page === item.page ? "page" : undefined}
              className="hidden rounded-full px-3 py-2 hover:bg-white/10 aria-[current=page]:bg-white/10 aria-[current=page]:text-white sm:block"
            >
              {item.label}
            </Link>
          ))}
          <Link href="/marketplace" className="hidden rounded-full px-3 py-2 hover:bg-white/10 md:block">Marketplace</Link>
          <Link
            href={labHref(SLUG, "contact")}
            aria-current={page === "contact" ? "page" : undefined}
            className="rounded-full bg-white px-4 py-2 font-medium text-black transition-transform active:scale-[0.97]"
          >
            {HERO.primary.label}
          </Link>
        </nav>
      </header>

      {children}

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 border-t border-white/10 px-5 py-10 text-sm text-white/50">
        <span>SouCampus builds</span>
        <ul className="flex flex-wrap gap-6">
          {SOCIALS.map((l) => (
            <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer" className="hover:text-white">{l.label}</a></li>
          ))}
        </ul>
      </footer>
    </main>
  );
}

/** Картинка-пилюля внутри заголовка (§6 Inline Typography Images). */
export function Pill({ src }: { src: string }) {
  return (
    <span className="relative mx-[0.2em] inline-block h-[0.78em] w-[1.9em] translate-y-[0.06em] overflow-hidden rounded-full align-baseline">
      <Image src={src} alt="" fill sizes="160px" className="object-cover" />
    </span>
  );
}
