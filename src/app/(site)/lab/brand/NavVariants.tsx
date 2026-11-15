"use client";

// ⚠️ ЛАБОРАТОРИЯ бренда (15.11): варианты навбара со структурой как в
// админке (группы → панель с пунктами) и цветком SouCampus. Это макеты:
// ссылки настоящие, но корзина, колокольчик, сообщения и аккаунт —
// картинки, без данных. Выбранный вариант переносится в Navbar.tsx.
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
  type Icon,
} from "@phosphor-icons/react";
import { Unbounded } from "next/font/google";
import { BUTTON_COLORS, BUTTON_PILL } from "@/components/Button";
import { PixelFlower } from "@/components/brand/PixelArt";
import { useDismiss } from "@/lib/useDismiss";

const display = Unbounded({ weight: "800", subsets: ["latin"] });

type Item = { href: string; label: string; hint: string; icon: Icon };
type Group = { key: string; label: string; dot: string; icon: string; items: Item[] };

const GROUPS: Group[] = [
  {
    key: "studio",
    label: "Studio",
    dot: "bg-lime-500",
    icon: "text-lime-700 dark:text-lime-400",
    items: [
      { href: "/", label: "Home", hint: "The studio at a glance", icon: House },
      { href: "/portfolio", label: "Portfolio", hint: "Builds made to order", icon: Briefcase },
      { href: "/about", label: "About me", hint: "Who builds them", icon: User },
      { href: "/contact", label: "Contact", hint: "Order a build", icon: EnvelopeSimple },
    ],
  },
  {
    key: "market",
    label: "Marketplace",
    dot: "bg-orange-500",
    icon: "text-orange-600 dark:text-orange-400",
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

function Panel({ group, onPick }: { group: Group; onPick: () => void }) {
  return (
    <div className={`absolute left-0 top-[calc(100%+10px)] z-50 w-80 p-2 ${GLASS}`}>
      {group.items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          onClick={onPick}
          className="flex items-start gap-3 rounded-2xl px-3 py-2.5 hover:bg-zinc-950/[0.05] dark:hover:bg-zinc-50/[0.06]"
        >
          <item.icon size={20} className={`mt-0.5 shrink-0 ${group.icon}`} />
          <span>
            <span className="block text-sm font-semibold text-zinc-950 dark:text-zinc-50">{item.label}</span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">{item.hint}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

/** Группы-кнопки с панелью, как в админке. */
function Groups({ withPanel = true, open, setOpen }: { withPanel?: boolean; open: string | null; setOpen: (k: string | null) => void }) {
  return (
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
            <CaretDown size={14} className={`transition-transform ${open === g.key ? "rotate-180" : ""}`} />
          </button>
          {withPanel && open === g.key && <Panel group={g} onPick={() => setOpen(null)} />}
        </div>
      ))}
    </nav>
  );
}

/** Правая часть: корзина, уведомления, сообщения, аккаунт и всегда последней — Order now. */
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

function useOpen() {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  useDismiss(ref, () => setOpen(null), { enabled: open !== null });
  return { ref, open, setOpen };
}

/** 1 — надпись SouCampus и цветок слева. */
export function Nav1() {
  const { ref, open, setOpen } = useOpen();
  return (
    <div ref={ref} className={`${PILL} flex items-center justify-between gap-4 px-3 py-2`}>
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 pl-2">
          <PixelFlower className="size-8" />
          <span className={`${display.className} text-lg text-zinc-950 dark:text-zinc-50`}>SouCampus</span>
        </Link>
        <Groups open={open} setOpen={setOpen} />
      </div>
      <Actions />
    </div>
  );
}

/** 2 — только крупный цветок слева, без надписи. */
export function Nav2() {
  const { ref, open, setOpen } = useOpen();
  return (
    <div ref={ref} className={`${PILL} flex items-center justify-between gap-4 px-3 py-1.5`}>
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="SouCampus — home" className="grid size-12 place-items-center rounded-full hover:bg-zinc-950/[0.04]">
          <PixelFlower className="size-10" />
        </Link>
        <Groups open={open} setOpen={setOpen} />
      </div>
      <Actions />
    </div>
  );
}

/** 3 — большой цветок по центру, как значок, выступает из шапки. */
export function Nav3() {
  const { ref, open, setOpen } = useOpen();
  return (
    <div ref={ref} className={`${PILL} grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2`}>
      <div className="justify-self-start">
        <Groups open={open} setOpen={setOpen} />
      </div>
      <Link
        href="/"
        aria-label="SouCampus — home"
        className="-my-6 grid size-20 place-items-center rounded-full border border-zinc-950/[0.06] bg-[#fbfbff] shadow-lg shadow-orange-500/20 transition-transform hover:scale-105 dark:border-zinc-50/[0.08] dark:bg-zinc-950"
      >
        <PixelFlower className="size-14" />
      </Link>
      <div className="justify-self-end">
        <Actions />
      </div>
    </div>
  );
}

/** 4 — группы как вкладки: под шапкой второй ряд со ссылками открытой группы. */
export function Nav4() {
  const { ref, open, setOpen } = useOpen();
  const group = GROUPS.find((g) => g.key === open);
  return (
    <div ref={ref}>
      <div className={`${PILL} flex items-center justify-between gap-4 px-3 py-2`}>
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 pl-2">
            <PixelFlower className="size-8" />
            <span className={`${display.className} text-lg text-zinc-950 dark:text-zinc-50`}>SouCampus</span>
          </Link>
          <Groups withPanel={false} open={open} setOpen={setOpen} />
        </div>
        <Actions />
      </div>
      {group && (
        <div className={`mx-auto mt-2 flex w-fit flex-wrap justify-center gap-1 px-2 py-1.5 ${PILL}`}>
          {group.items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-950/[0.05] dark:text-zinc-300 dark:hover:bg-zinc-50/[0.06]"
            >
              <item.icon size={16} className={group.icon} />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
