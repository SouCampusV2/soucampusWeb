import Link from "next/link";
import type { ReactNode } from "react";
import { Hanken_Grotesk } from "next/font/google";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { SOCIALS } from "../../_shared/content";
import type { LabPage } from "../../_shared/pages";
import { IslandNav } from "./client";

// Оболочка варианта Agency (soft-skill) — общая для лендинга и трёх
// страниц студии: серебристый фон, остров-навбар, подвал, и две детали,
// без которых скилла нет, — двойная рамка и кнопка «button-in-button».
// Вынесены из index.tsx, когда у варианта стало четыре страницы.
const hanken = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "800"], variable: "--s-sans", preload: false });

export const SLUG = "agency";
export const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

export function Shell({ page, children }: { page: LabPage; children: ReactNode }) {
  return (
    <div className={`${hanken.variable} min-h-[100dvh] overflow-x-clip bg-[#eceef1] font-[family-name:var(--s-sans)] text-[#16181d] selection:bg-[#16181d] selection:text-white`}>
      <IslandNav page={page} />
      {children}
      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-6 px-6 py-10 text-sm text-[#5b606b] md:px-10">
        <span>SouCampus builds</span>
        <ul className="flex flex-wrap gap-5">
          {SOCIALS.map((l) => (
            <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer" className="hover:text-[#16181d]">{l.label}</a></li>
          ))}
        </ul>
      </footer>
    </div>
  );
}

/** Метка над заголовком — микро-пилюля скилла (§4, «eyebrow tags»). */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#5b606b] ring-1 ring-black/5">
      {children}
    </span>
  );
}

/** Двойная рамка: оправа (тонкий фон + волосяная линия + отступ) и ядро
 * со своим фоном, внутренним бликом и радиусом меньше на ширину отступа. */
export function Bezel({
  children,
  className = "",
  dark = false,
  shadow = false,
}: {
  children: ReactNode;
  className?: string;
  dark?: boolean;
  shadow?: boolean;
}) {
  return (
    <div
      className={`rounded-[2rem] p-2 ring-1 ${dark ? "bg-[#16181d]/10 ring-black/10" : "bg-black/[0.035] ring-black/5"} ${
        shadow ? "shadow-[0_40px_80px_-30px_rgba(30,36,50,0.25)]" : ""
      } ${className}`}
    >
      <div
        className={`h-full overflow-hidden rounded-[calc(2rem-0.5rem)] ${
          dark
            ? "bg-[#16181d] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]"
            : "bg-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_2px_rgba(30,36,50,0.04)]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/** Кнопка «button-in-button»: стрелка живёт в своём кружке. */
export function IslandButton({
  href,
  label,
  dark = false,
  light = false,
  ghostDark = false,
  external = false,
}: {
  href: string;
  label: string;
  dark?: boolean;
  light?: boolean;
  ghostDark?: boolean;
  external?: boolean;
}) {
  const skin = dark
    ? "bg-[#16181d] text-white"
    : light
      ? "bg-white text-[#16181d]"
      : ghostDark
        ? "text-white ring-1 ring-white/20"
        : "bg-white text-[#16181d] ring-1 ring-black/5";
  const circle = dark || ghostDark ? "bg-white/10" : "bg-black/5";
  const cls = `group inline-flex items-center gap-3 rounded-full py-2 pl-6 pr-2 font-medium transition-transform duration-500 ${EASE} active:scale-[0.98] ${skin}`;
  const inner = (
    <>
      {label}
      <span className={`grid h-9 w-9 place-items-center rounded-full transition-transform duration-500 ${EASE} group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105 ${circle}`}>
        <ArrowUpRight size={16} weight="light" />
      </span>
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
  ) : (
    <Link href={href} className={cls}>{inner}</Link>
  );
}
