"use client";

// Финальная секция вместо «Choose your plan», круг 2 (24.11). Владелец
// выбрал П1 (призыв к заказу), просит добавить Discord, кнопки-таблетки
// и «композицию, а не просто цветочек». Плюс орбита по скрину legko.

import { DiscordLogo, BookOpen, Storefront, Images, PencilRuler, YoutubeLogo, TiktokLogo, Planet, ShoppingBag } from "@phosphor-icons/react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { PixelFlower } from "@/components/brand/PixelArt";
import { DISCORD_INVITE } from "@/lib/site";
import { Sparkles } from "./Sparkles";

const ORDER_TEXT = "Tell me the size, the style and the deadline. I'll come back with a price and a plan, usually the same day.";

function Buttons({ dark = true }: { dark?: boolean }) {
  return (
    <div className="relative mt-8 flex flex-wrap justify-center gap-3">
      <Button href="/contact" size="lg">Order a map</Button>
      <Button
        href={DISCORD_INVITE}
        target="_blank"
        rel="noopener noreferrer"
        size="lg"
        colorClassName={dark ? "bg-white text-zinc-950 hover:bg-zinc-200" : "bg-zinc-950 text-white hover:bg-zinc-800"}
      >
        <DiscordLogo size={20} weight="fill" /> Join Discord
      </Button>
    </div>
  );
}

/** Пиксельная земля: ряд травы и два ряда земли из квадратов-блоков. */
function PixelGround() {
  const cols = 48;
  const grass = ["#65a30d", "#4d7c0f", "#84cc16"];
  const dirt = ["#78350f", "#92400e", "#713f12"];
  const cell = (palette: string[], i: number, r: number) => palette[(i * 7 + r * 3 + ((i * i) % 5)) % palette.length];
  return (
    <div aria-hidden className="absolute inset-x-0 bottom-0 grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {[0, 1, 2].map((r) =>
        Array.from({ length: cols }, (_, i) => (
          <span key={`${r}-${i}`} className="aspect-square" style={{ background: cell(r === 0 ? grass : dirt, i, r) }} />
        ))
      )}
    </div>
  );
}

/** Ф1. Ночное небо с искрами, земля из блоков, на ней растут цветы-знаки
 *  разных размеров и цветов — как в мире на главной. По центру призыв. */
export function FinaleMeadow() {
  const flowers: { left: string; size: string; palette: "orange" | "lime" | "cream" }[] = [
    { left: "4%", size: "size-20", palette: "orange" },
    { left: "14%", size: "size-12", palette: "cream" },
    { left: "22%", size: "size-16", palette: "lime" },
    { left: "71%", size: "size-14", palette: "lime" },
    { left: "80%", size: "size-24", palette: "orange" },
    { left: "92%", size: "size-12", palette: "cream" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[linear-gradient(180deg,#0b1020_0%,#1e1b4b_55%,#4c1d95_100%)] px-6 pb-40 pt-20 text-center sm:pb-48 sm:pt-24">
        <Sparkles />
        <div aria-hidden className="absolute left-1/2 top-1/3 size-96 -translate-x-1/2 rounded-full bg-orange-500/20 blur-[100px]" />
        <h2 className="relative text-3xl font-extrabold tracking-tight text-white sm:text-5xl">Have a build in mind?</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-zinc-300">{ORDER_TEXT}</p>
        <Buttons />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 sm:h-48">
          {flowers.map((f) => (
            <PixelFlower key={f.left} palette={f.palette} className={`absolute bottom-[6.2%] ${f.size} sm:bottom-[8%]`} style={{ left: f.left }} />
          ))}
          <PixelGround />
        </div>
      </div>
    </section>
  );
}

// ---------- Ф2. Орбита ----------

const INNER = [
  { label: "Discord", icon: DiscordLogo, color: "text-indigo-300" },
  { label: "Marketplace", icon: Storefront, color: "text-lime-300" },
  { label: "Portfolio", icon: Images, color: "text-orange-300" },
  { label: "Wiki", icon: BookOpen, color: "text-sky-300" },
];
const OUTER = [
  { label: "Commissions", icon: PencilRuler, color: "text-orange-300" },
  { label: "YouTube", icon: YoutubeLogo, color: "text-red-400" },
  { label: "Planet Minecraft", icon: Planet, color: "text-emerald-300" },
  { label: "TikTok", icon: TiktokLogo, color: "text-pink-300" },
  { label: "BuiltByBit", icon: ShoppingBag, color: "text-sky-300" },
];

function Ring({ items, radius, duration, reverse }: { items: typeof INNER; radius: number; duration: number; reverse?: boolean }) {
  return (
    <div
      className="absolute left-1/2 top-1/2 motion-safe:animate-[orbit_linear_infinite]"
      style={{ width: radius * 2, height: radius * 2, marginLeft: -radius, marginTop: -radius, animationDuration: `${duration}s`, animationDirection: reverse ? "reverse" : "normal" }}
    >
      <div className="absolute inset-0 rounded-full border border-white/10" />
      {items.map((it, i) => {
        const a = (i / items.length) * Math.PI * 2;
        const Icon = it.icon;
        return (
          <div key={it.label} className="absolute" style={{ left: radius + Math.cos(a) * radius, top: radius + Math.sin(a) * radius }}>
            <div
              className="-translate-x-1/2 -translate-y-1/2 motion-safe:animate-[orbit_linear_infinite]"
              style={{ animationDuration: `${duration}s`, animationDirection: reverse ? "normal" : "reverse" }}
            >
              <span className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur-md">
                <Icon size={18} weight="fill" className={it.color} /> {it.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const CARDS = [
  { title: "Order a map", text: "A custom build to your size, style and deadline.", href: "/contact" },
  { title: "Ready-made maps", text: "Download a finished map the moment you pay.", href: "/marketplace" },
  { title: "Join Discord", text: "New builds first, free maps, a real person on tickets.", href: DISCORD_INVITE },
  { title: "Read the Wiki", text: "Install a map, paste a schematic, fix what went wrong.", href: "/wiki" },
];

/** Ф2. Орбита: цветок в свечении, вокруг на кольцах вращаются места, где
 *  живёт студия; снизу четыре карточки-действия. По скрину legko.company. */
export function FinaleOrbit() {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-950 px-6 pb-10 pt-16 text-center sm:px-10">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px]" />
        <Sparkles className="text-white/80" />
        <span className="relative inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-semibold text-zinc-200">
          ✦ SouCampus studio
        </span>
        <h2 className="relative mx-auto mt-5 max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
          Your next world starts with one message
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">{ORDER_TEXT}</p>

        <div className="relative mx-auto mt-6 h-[26rem] max-w-3xl sm:h-[30rem]">
          <div aria-hidden className="absolute left-1/2 top-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.55)_0%,rgba(132,204,22,0.18)_45%,transparent_70%)] blur-2xl" />
          <Ring items={OUTER} radius={200} duration={90} reverse />
          <Ring items={INNER} radius={120} duration={60} />
          <div className="absolute left-1/2 top-1/2 flex size-36 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#fdba74,#f97316_55%,#9a3412)] shadow-[0_0_80px_rgba(249,115,22,0.6)]">
            <PixelFlower palette="cream" className="size-16" />
            <span className="mt-1 text-xs font-bold text-white">SouCampus</span>
          </div>
        </div>

        <div className="relative mt-2 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((c) => (
            <Link key={c.title} href={c.href} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-colors hover:border-orange-400/60 hover:bg-white/10">
              <h3 className="font-bold text-white">{c.title}</h3>
              <p className="mt-1 text-sm text-zinc-400">{c.text}</p>
            </Link>
          ))}
        </div>
        <style>{`@keyframes orbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </section>
  );
}

/** Ф3. Закат: тёплое небо, большой цветок вместо солнца, силуэт островов. */
export function FinaleSunset() {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[linear-gradient(180deg,#fde68a_0%,#fb923c_45%,#be185d_100%)] px-6 pb-36 pt-16 text-center">
        <PixelFlower palette="cream" className="absolute left-1/2 top-[48%] size-56 -translate-x-1/2 opacity-90 sm:size-72" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-28 bg-[#3b0764]" style={{ clipPath: "polygon(0 60%,8% 60%,8% 40%,16% 40%,16% 55%,30% 55%,30% 25%,38% 25%,38% 45%,52% 45%,52% 65%,64% 65%,64% 30%,74% 30%,74% 50%,88% 50%,88% 35%,100% 35%,100% 100%,0 100%)" }} />
        <h2 className="relative text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">Have a build in mind?</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-zinc-900/80">{ORDER_TEXT}</p>
        <Buttons dark={false} />
      </div>
    </section>
  );
}
