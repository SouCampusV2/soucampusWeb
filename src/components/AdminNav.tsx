"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  CaretDown,
  ChatCircleText,
  DiscordLogo,
  DownloadSimple,
  Gift,
  Hourglass,
  List,
  Megaphone,
  PlusCircle,
  ShieldCheck,
  GearSix,
  Storefront,
  Tray,
  UserPlus,
  X,
  XCircle,
  type Icon,
} from "@phosphor-icons/react";
import { useDismiss } from "@/lib/useDismiss";

// Разделы админки — ГРУППАМИ (2026-10-27, просьба владельца).
//
// До 27.10 здесь было девять ссылок в строку, и по названию нельзя было
// понять, где что: «Queue» и «Creators» — это проверка, «Portfolio» и
// «Announce» — публикация, а стояли вперемешку. Теперь три группы по
// смыслу действия, у каждой свой цвет (тот же, что у трёх акцентов
// сайта):
//
//   Publish (оранжевый) — что выкладываю: на сайт и в Discord.
//   Review  (зелёный)   — что жду решения: очередь, отказы, заявки.
//   Records (синий)     — что уже случилось: журнал скачиваний.
//
// Выпадашка по образцу владельца: подпись группы мелкими капсом, пункты
// «иконка + название + строка пояснения + стрелка», текущий — с цветной
// чертой слева. Открывается КЛИКОМ, а не наведением: на тач-экране
// hover не наступает никогда (26.08).
//
// ⚠️ Пункты с параметром в адресе (?channel=premade, ?to=discord,
// ?state=rejected) — не украшение: страницы их читают и открываются на
// нужном. Новый такой пункт — проверь, что страница параметр понимает.
//
// Список один на обе раскладки — правило от 1 сентября: две копии
// пунктов расходятся при первой же правке.

type Item = { href: string; label: string; hint: string; icon: Icon };
type Column = { title?: string; items: Item[] };
type Group = { key: string; label: string; accent: Accent; columns: Column[] };
type Accent = "orange" | "lime" | "blue";

const ACCENTS: Record<Accent, { dot: string; bar: string; icon: string }> = {
  orange: { dot: "bg-orange-500", bar: "border-orange-500", icon: "text-orange-600 dark:text-orange-400" },
  lime: { dot: "bg-lime-500", bar: "border-lime-500", icon: "text-lime-700 dark:text-lime-400" },
  blue: { dot: "bg-blue-500", bar: "border-blue-500", icon: "text-blue-600 dark:text-blue-400" },
};

const OVERVIEW = { href: "/admin", label: "Overview" };

const GROUPS: Group[] = [
  {
    key: "publish",
    label: "Publish",
    accent: "orange",
    columns: [
      {
        title: "On the site",
        items: [
          { href: "/admin/portfolio", label: "Portfolio", hint: "Studio works on the site", icon: Briefcase },
          { href: "/admin/products", label: "Maps", hint: "Every map, whatever its state", icon: Storefront },
          { href: "/admin/products/new", label: "Add a map", hint: "Upload a new map", icon: PlusCircle },
          { href: "/admin/announce?to=site", label: "Announcement", hint: "Bell for every account", icon: Megaphone },
        ],
      },
      {
        title: "In Discord",
        items: [
          { href: "/admin/discord?tab=showcase&channel=portfolio", label: "Portfolio", hint: "Posts about studio works", icon: Briefcase },
          { href: "/admin/discord?tab=showcase&channel=premade", label: "Premade builds", hint: "Posts about paid maps", icon: Storefront },
          { href: "/admin/discord?tab=showcase&channel=free", label: "Free builds", hint: "Posts about free maps", icon: Gift },
          { href: "/admin/announce?to=discord", label: "Announcement", hint: "Announcements channel", icon: Megaphone },
          { href: "/admin/discord?tab=inbox", label: "Inbox", hint: "What the bot sent in", icon: Tray },
        ],
      },
    ],
  },
  {
    key: "review",
    label: "Review",
    accent: "lime",
    columns: [
      {
        items: [
          { href: "/admin/moderation", label: "Queue", hint: "Maps waiting for a decision", icon: Hourglass },
          { href: "/admin/products?state=rejected", label: "Rejected", hint: "Maps sent back to the author", icon: XCircle },
          { href: "/admin/applications", label: "Creators", hint: "Applications for creator status", icon: UserPlus },
          { href: "/admin/comments", label: "Comments", hint: "Everything under the maps", icon: ChatCircleText },
        ],
      },
    ],
  },
  {
    key: "records",
    label: "Records",
    accent: "blue",
    columns: [
      {
        items: [
          { href: "/admin/downloads", label: "Downloads", hint: "Proof for payment disputes", icon: DownloadSimple },
          // Двухшаговый вход (аудит 2026-11, S-25). В «Records», а не
          // отдельной группой: один пункт группу не оправдывает, а по
          // смыслу это тоже служебное, не про карты и не про Discord.
          { href: "/admin/security", label: "Two-step sign-in", hint: "A code from your phone for this admin", icon: ShieldCheck },
          // Пароль, почта, другие устройства (просьба владельца 17.11).
          { href: "/admin/account", label: "Settings", hint: "Password, email, other devices", icon: GearSix },
        ],
      },
    ],
  },
];

/**
 * Какой пункт сейчас открыт. Совпадение пути и ВСЕХ параметров пункта;
 * из нескольких — самый точный (у «Maps» параметров нет, у «Rejected» —
 * ?state=rejected, и на отказах гореть должен второй).
 */
function useActiveHref(): string | null {
  const pathname = usePathname();
  const params = useSearchParams();
  let best: { href: string; score: number } | null = null;
  for (const item of GROUPS.flatMap((g) => g.columns.flatMap((c) => c.items))) {
    const url = new URL(item.href, "http://x");
    if (url.pathname !== pathname) continue;
    const wanted = [...url.searchParams.entries()];
    if (!wanted.every(([k, v]) => params.get(k) === v)) continue;
    if (!best || wanted.length > best.score) best = { href: item.href, score: wanted.length };
  }
  return best?.href ?? null;
}

const GLASS =
  "rounded-3xl border border-white/60 bg-[#fbfbff]/95 shadow-xl shadow-zinc-950/10 backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-zinc-900/95";

export function AdminNav() {
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const active = useActiveHref();
  const pathname = usePathname();

  // Тот же хук, что у всех выпадашек сайта (29.08): клик мимо и Escape.
  useDismiss(ref, () => setOpen(null), { enabled: open !== null });

  const close = () => setOpen(null);
  const toggle = (key: string) => setOpen((current) => (current === key ? null : key));

  return (
    <div ref={ref} className="relative">
      {/* Десктоп: Overview + три группы-кнопки. */}
      <nav className="hidden items-center gap-1 text-sm md:flex">
        <Link
          href={OVERVIEW.href}
          onClick={close}
          className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
            pathname === OVERVIEW.href
              ? "bg-zinc-950/[0.06] text-zinc-950 dark:bg-zinc-50/[0.08] dark:text-zinc-50"
              : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          }`}
        >
          {OVERVIEW.label}
        </Link>
        {GROUPS.map((group) => {
          const inGroup = group.columns.some((c) => c.items.some((i) => i.href === active));
          return (
            <div key={group.key} className="relative">
              <button
                type="button"
                onClick={() => toggle(group.key)}
                aria-expanded={open === group.key}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 font-medium transition-colors ${
                  inGroup || open === group.key
                    ? "bg-zinc-950/[0.06] text-zinc-950 dark:bg-zinc-50/[0.08] dark:text-zinc-50"
                    : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${ACCENTS[group.accent].dot}`} aria-hidden />
                {group.label}
                <CaretDown
                  size={12}
                  weight="bold"
                  className={`transition-transform ${open === group.key ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {open === group.key && (
                <div
                  className={`absolute left-0 top-[calc(100%+10px)] z-50 p-3 ${GLASS} ${
                    group.columns.length > 1 ? "w-[40rem] max-w-[calc(100vw-2rem)]" : "w-80"
                  }`}
                >
                  <div className={`grid gap-3 ${group.columns.length > 1 ? "lg:grid-cols-2" : ""}`}>
                    {group.columns.map((column, index) => (
                      <GroupColumn
                        key={index}
                        group={group}
                        column={column}
                        active={active}
                        onPick={close}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Телефон: одна кнопка, внутри — те же группы подряд. */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => toggle("mobile")}
          aria-expanded={open === "mobile"}
          aria-label={open === "mobile" ? "Close menu" : "Open menu"}
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-950/[0.05] dark:text-zinc-300 dark:hover:bg-zinc-50/[0.06]"
        >
          {open === "mobile" ? <X size={18} /> : <List size={18} />}
          Sections
        </button>
        {open === "mobile" && (
          <div className={`absolute left-0 z-50 mt-2 max-h-[75vh] w-[calc(100vw-3rem)] max-w-sm overflow-y-auto p-3 ${GLASS}`}>
            <Link
              href={OVERVIEW.href}
              onClick={close}
              className="block rounded-2xl px-3 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-950/[0.05] dark:text-zinc-50 dark:hover:bg-zinc-50/[0.06]"
            >
              {OVERVIEW.label}
            </Link>
            {GROUPS.map((group) =>
              group.columns.map((column, index) => (
                <div key={`${group.key}-${index}`} className="mt-2">
                  <GroupColumn group={group} column={column} active={active} onPick={close} compact />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupColumn({
  group,
  column,
  active,
  onPick,
  compact = false,
}: {
  group: Group;
  column: Column;
  active: string | null;
  onPick: () => void;
  /** На телефоне — без строки пояснения: экран узкий, пунктов много. */
  compact?: boolean;
}) {
  const accent = ACCENTS[group.accent];
  const heading = column.title ? `${group.label} · ${column.title}` : group.label;
  return (
    <div>
      <p className="flex items-center gap-2 px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
        <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} aria-hidden />
        {heading}
        {column.title === "In Discord" && <DiscordLogo size={13} className="ml-auto" aria-hidden />}
      </p>
      <ul className="space-y-1">
        {column.items.map((item) => {
          const on = item.href === active;
          const ItemIcon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onPick}
                aria-current={on ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-2xl border-l-2 px-3 transition-colors ${
                  compact ? "py-2" : "py-2.5"
                } ${
                  on
                    ? `${accent.bar} bg-zinc-950/[0.05] dark:bg-zinc-50/[0.06]`
                    : "border-transparent hover:bg-zinc-950/[0.04] dark:hover:bg-zinc-50/[0.05]"
                }`}
              >
                <ItemIcon size={20} className={`shrink-0 ${accent.icon}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    {item.label}
                  </span>
                  {!compact && (
                    <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {item.hint}
                    </span>
                  )}
                </span>
                <ArrowRight
                  size={14}
                  className="shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
