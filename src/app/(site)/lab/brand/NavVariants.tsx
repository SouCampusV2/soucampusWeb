"use client";

// ⚠️ ЛАБОРАТОРИЯ бренда, круг 2 (16.11). Владелец выбрал Н1 (надпись +
// знак слева, группы панелью) с размером знака как в Н2. Здесь — какой
// знак (цветок с жёлтой серединкой, с тенью блока или без, или веер) и
// пункты панели как в админке, иконки справа. Это макеты: корзина,
// колокольчик, сообщения и аккаунт — картинки, без данных.
import Link from "next/link";
import { useRef, useState } from "react";
import {
  House,
  Briefcase,
  User,
  EnvelopeSimple,
  Storefront,
  Sparkle,
  BookOpen,
  Lifebuoy,
  ChatCircleText,
  ShoppingCart,
  Bell,
  ChatsCircle,
  CaretDown,
  ArrowRight,
  type Icon,
} from "@phosphor-icons/react";
import { Unbounded } from "next/font/google";
import { BUTTON_COLORS, BUTTON_PILL } from "@/components/Button";
import { PixelFanMark, PixelFlower } from "@/components/brand/PixelArt";
import { useDismiss } from "@/lib/useDismiss";

const display = Unbounded({ weight: "800", subsets: ["latin"] });

type Item = { href: string; label: string; hint: string; icon: Icon };
type Group = { key: string; label: string; dot: string; icon: string; bar: string; items: Item[] };

const GROUPS: Group[] = [
  {
    key: "studio",
    label: "Studio",
    dot: "bg-lime-500",
    icon: "text-lime-700 dark:text-lime-400",
    bar: "border-lime-500",
    items: [
      { href: "/", label: "Home", hint: "The studio at a glance", icon: House },
      { href: "/portfolio", label: "Portfolio", hint: "Builds made to order", icon: Briefcase },
      { href: "/about", label: "About me", hint: "Who builds them", icon: User },
      { href: "/contact", label: "Contact", hint: "Order a custom build", icon: EnvelopeSimple },
    ],
  },
  {
    key: "market",
    label: "Marketplace",
    dot: "bg-orange-500",
    icon: "text-orange-600 dark:text-orange-400",
    bar: "border-orange-500",
    items: [
      { href: "/marketplace", label: "Maps", hint: "Ready maps to download", icon: Storefront },
      { href: "/updates", label: "What's new", hint: "Latest changes on the site", icon: Sparkle },
      { href: "/wiki", label: "Wiki", hint: "How to install a map", icon: BookOpen },
      { href: "/support", label: "Support", hint: "Help with a purchase", icon: Lifebuoy },
      { href: "/contact", label: "Contact", hint: "Ask about a map", icon: ChatCircleText },
    ],
  },
];

const PILL =
  "relative rounded-full border border-zinc-950/[0.06] bg-[#fbfbff]/60 backdrop-blur-xl dark:border-zinc-50/[0.08] dark:bg-zinc-950/60";
const GLASS =
  "rounded-3xl border border-white/60 bg-[#fbfbff]/95 shadow-xl shadow-zinc-950/10 backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-zinc-900/95";
const ICON_BTN =
  "grid size-10 place-items-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-950/[0.05] dark:text-zinc-300 dark:hover:bg-zinc-50/[0.06]";

/**
 * Панель группы — как в админке: заголовок капсом с точкой, у пункта
 * название и пояснение, иконка СПРАВА (просьба владельца 16.11), стрелка
 * без движения (анимация в админке ему не нравится). Активный пункт —
 * цветная черта слева.
 */
function Panel({ group, onPick, arrow }: { group: Group; onPick: () => void; arrow: boolean }) {
  const active = group.items[0].href;
  return (
    <div className={`absolute left-0 top-[calc(100%+10px)] z-50 w-80 p-3 ${GLASS}`}>
      <p className="flex items-center gap-2 px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
        <span className={`size-1.5 rounded-full ${group.dot}`} aria-hidden />
        {group.label}
      </p>
      <ul className="space-y-1">
        {group.items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              onClick={onPick}
              className={`flex items-center gap-3 rounded-2xl border-l-2 px-3 py-2.5 transition-colors ${
                item.href === active
                  ? `${group.bar} bg-zinc-950/[0.05] dark:bg-zinc-50/[0.06]`
                  : "border-transparent hover:bg-zinc-950/[0.04] dark:hover:bg-zinc-50/[0.05]"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-zinc-950 dark:text-zinc-50">{item.label}</span>
                <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{item.hint}</span>
              </span>
              <item.icon size={20} className={`shrink-0 ${group.icon}`} aria-hidden />
              {arrow && <ArrowRight size={14} className="shrink-0 text-zinc-400" aria-hidden />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Actions() {
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" aria-label="Cart" className={`${ICON_BTN} relative`}>
        <ShoppingCart size={20} />
        <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-orange-500 text-[10px] font-bold text-zinc-950">
          2
        </span>
      </button>
      <button type="button" aria-label="Notifications" className={ICON_BTN}>
        <Bell size={20} />
      </button>
      <button type="button" aria-label="Messages" className={ICON_BTN}>
        <ChatsCircle size={20} />
      </button>
      <span className="mx-1 size-8 rounded-full bg-gradient-to-br from-lime-400 to-orange-400" aria-label="Account" />
      <Link href="/contact" className={`${BUTTON_PILL} ${BUTTON_COLORS.primary} ml-1`}>
        Order now
      </Link>
    </div>
  );
}

// Жёлтая серединка (просьба владельца 16.11) — краситель yellow из игры.
const YELLOW_CENTER = { C: "#fed83d", c: "#c6a830" };

export type Mark = "flower" | "flower-shadow" | "fan";

function Logo({ mark }: { mark: Mark }) {
  if (mark === "fan") return <PixelFanMark petals="#ff6900" sun="#fed83d" shadow="#c23a0055" className="size-10" />;
  return (
    <PixelFlower colors={YELLOW_CENTER} shadow={mark === "flower-shadow" ? "#7c2d1266" : undefined} className="size-10" />
  );
}

/** Н1 с размером знака как в Н2. */
export function Nav({ mark, arrow }: { mark: Mark; arrow: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  useDismiss(ref, () => setOpen(null), { enabled: open !== null });
  return (
    <div ref={ref} className={`${PILL} flex items-center justify-between gap-4 px-3 py-1.5`}>
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 pl-1">
          <Logo mark={mark} />
          <span className={`${display.className} text-lg text-zinc-950 dark:text-zinc-50`}>SouCampus</span>
        </Link>
        <nav className="flex items-center gap-1">
          {GROUPS.map((g) => (
            <div key={g.key} className="relative">
              <button
                type="button"
                onClick={() => setOpen(open === g.key ? null : g.key)}
                aria-expanded={open === g.key}
                className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  open === g.key
                    ? "bg-zinc-950/[0.06] text-zinc-950 dark:bg-zinc-50/[0.08] dark:text-zinc-50"
                    : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
                }`}
              >
                <span className={`size-2 rounded-full ${g.dot}`} aria-hidden />
                {g.label}
                <CaretDown size={12} weight="bold" className={open === g.key ? "rotate-180" : ""} />
              </button>
              {open === g.key && <Panel group={g} arrow={arrow} onPick={() => setOpen(null)} />}
            </div>
          ))}
        </nav>
      </div>
      <Actions />
    </div>
  );
}
