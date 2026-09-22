import Link from "next/link";
import { DISCORD_INVITE, SOCIALS } from "../../_shared/content";
import { labHref, type LabPage } from "../../_shared/pages";
import s from "./styles.module.css";

// Шапка и финал варианта Scroll — общие для лендинга и страниц студии.
// Шапка фиксированная с mix-blend-mode: difference: она едет поверх
// закреплённых сцен любого цвета и остаётся читаемой без подложки.

export const SLUG = "scroll";

const NAV: { page: LabPage; label: string }[] = [
  { page: "portfolio", label: "Work" },
  { page: "about", label: "About" },
];

export function Header({ page }: { page: LabPage }) {
  return (
    <header className={s.header}>
      <Link href={labHref(SLUG, "home")} className={s.brand}>SouCampus</Link>
      <nav aria-label="Main" className={s.nav}>
        {NAV.map((item) => (
          <Link key={item.page} href={labHref(SLUG, item.page)} aria-current={page === item.page ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
        <Link href={labHref(SLUG, "contact")} aria-current={page === "contact" ? "page" : undefined} className={s.pill}>
          Order a map
        </Link>
      </nav>
    </header>
  );
}

/** Финал с фразой, которая заливается цветом по скроллу (класс s-fill). */
export function Final({ title, secondary }: { title: string; secondary: { label: string; href: string } }) {
  return (
    <section className={`s-final ${s.final}`}>
      <h2 className={`s-fill ${s.fill}`}>{title}</h2>
      <div className={s.actions}>
        <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={s.pill}>Join Discord</a>
        <Link href={secondary.href} className={s.pillGhost}>{secondary.label}</Link>
      </div>
      <ul className={s.socials}>
        {SOCIALS.map((l) => (
          <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>
        ))}
      </ul>
    </section>
  );
}
