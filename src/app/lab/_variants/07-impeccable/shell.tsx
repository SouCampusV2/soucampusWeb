import Link from "next/link";
import type { ReactNode } from "react";
import { Pixelify_Sans } from "next/font/google";
import { SOCIALS } from "../../_shared/content";
import { labHref, type LabPage } from "../../_shared/pages";
import s from "./styles.module.css";

// Шрифт и оболочка варианта Inventory (impeccable). Лендинг — титульный
// экран игры, у него своей шапки нет и не должно быть. Остальные страницы —
// ВНУТРЕННИЕ экраны, и у игры для них одна грамматика: земляной фон,
// заголовок экрана по центру сверху, вкладки (как в «Create New World»),
// а внизу кнопка «Done», возвращающая на титульный экран.
export const pixel = Pixelify_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--i-pixel", preload: false });

export const SLUG = "inventory";

const TABS: { page: LabPage; label: string }[] = [
  { page: "portfolio", label: "Worlds" },
  { page: "contact", label: "Multiplayer" },
  { page: "about", label: "Advancements" },
];

export function Screen({ page, title, children }: { page: LabPage; title: string; children: ReactNode }) {
  return (
    <div className={`${pixel.variable} ${s.root}`}>
      <main className={`${s.dirt} ${s.screen}`}>
        <header className={s.screenHead}>
          <h1 className={s.screenTitle}>{title}</h1>
          <nav aria-label="Screens" className={s.tabs}>
            {TABS.map((tab) => (
              <Link
                key={tab.page}
                href={labHref(SLUG, tab.page)}
                aria-current={page === tab.page ? "page" : undefined}
                className={`${s.btn} ${s.tab}`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </header>

        {children}

        <div className={s.done}>
          <Link href={labHref(SLUG, "home")} className={`${s.btn} ${s.btnWide}`}>Done</Link>
        </div>

        <footer className={s.footer}>
          {SOCIALS.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
          ))}
        </footer>
      </main>
    </div>
  );
}
