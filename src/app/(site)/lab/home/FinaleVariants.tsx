"use client";

// Финал страниц вместо «Choose your plan», круг 3 (24.11). Замечания
// владельца к кругу 2: квадратные кнопки (ошибка Button, исправлена во
// всём сайте), плоские домики, гладкий градиент, работает только в тёмной
// теме, текст плохо читается, у орбиты логотип в центре и соцсети на
// кольцах «ни к чему», стекло и свечение хуже, чем на скрине.

import Image from "next/image";
import Link from "next/link";
import { DiscordLogo, CastleTurret as Castle, Sword, MapTrifold, Mountains, Tree, Island, Buildings, Cube } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { PixelFlower } from "@/components/brand/PixelArt";
import { DISCORD_INVITE } from "@/lib/site";
import { Sparkles } from "@/components/Sparkles";

const ORDER_TEXT = "Tell me the size, the style and the deadline. I'll come back with a price and a plan, usually the same day.";

function Actions() {
  return (
    <div className="mt-7 flex flex-wrap justify-center gap-3">
      <Button href="/contact" size="lg">Order a map</Button>
      <Button
        href={DISCORD_INVITE}
        target="_blank"
        rel="noopener noreferrer"
        size="lg"
        colorClassName="bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        <DiscordLogo size={20} weight="fill" /> Join Discord
      </Button>
    </div>
  );
}

/** Стеклянная карточка с текстом — читается на любом небе. */
function GlassCopy() {
  return (
    <div className="relative mx-auto max-w-2xl rounded-[2rem] border border-white/60 bg-white/70 px-6 py-8 text-center shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/55 sm:px-10">
      <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white sm:text-5xl">Have a build in mind?</h2>
      <p className="mx-auto mt-4 max-w-lg text-base text-zinc-700 dark:text-zinc-200 sm:text-lg">{ORDER_TEXT}</p>
      <Actions />
    </div>
  );
}

// ---------- Ф4. Пиксельное небо: утро в светлой теме, ночь в тёмной ----------

/** Небо полосами, как в игре: без плавного градиента. */
const DAY = ["#7dd3fc", "#93dbfc", "#a8e2fb", "#bfe9f9", "#d6eff5", "#ecf2ea", "#fde9cf", "#fed7aa"];
const NIGHT = ["#0b1026", "#101633", "#161c40", "#1d214d", "#26265a", "#312a66", "#3d2d70", "#4c3079"];

function PixelSky() {
  return (
    <div aria-hidden className="absolute inset-0 flex flex-col">
      {DAY.map((day, i) => (
        <div key={i} className="flex-1">
          <div className="h-full dark:hidden" style={{ background: day }} />
          <div className="hidden h-full dark:block" style={{ background: NIGHT[i] }} />
        </div>
      ))}
    </div>
  );
}

/** Облако из блоков (утро). */
function PixelCloud({ className, scale = 1 }: { className: string; scale?: number }) {
  const rows = ["..XXX....", ".XXXXXX..", "XXXXXXXXX"];
  const s = 10 * scale;
  return (
    <div aria-hidden className={`absolute dark:hidden ${className}`} style={{ width: 9 * s, height: 3 * s }}>
      {rows.map((r, y) =>
        [...r].map((c, x) =>
          c === "X" ? <span key={`${x}-${y}`} className="absolute bg-white/90" style={{ left: x * s, top: y * s, width: s, height: s }} /> : null
        )
      )}
    </div>
  );
}

/**
 * Холмы из блоков: высота каждой колонки задана числом. Три слоя — дальний
 * голубоватый, средний, передний с травой и землёй. Ступени по колонкам —
 * силуэт читается как Minecraft, а не как ровная гора.
 */
function Hills({ heights, color, top, dark, className = "" }: { heights: number[]; color: string; top?: string; dark: string; className?: string }) {
  const cols = heights.length;
  return (
    <div aria-hidden className={`absolute inset-x-0 bottom-0 flex items-end ${className}`}>
      {heights.map((h, i) => (
        <div key={i} className="relative" style={{ width: `${100 / cols}%`, height: `${h}%` }}>
          <div className="absolute inset-0 dark:hidden" style={{ background: color }} />
          <div className="absolute inset-0 hidden dark:block" style={{ background: dark }} />
          {top && <div className="absolute inset-x-0 top-0 h-[10px] dark:opacity-60" style={{ background: top }} />}
        </div>
      ))}
    </div>
  );
}

/** Ёлка из блоков на переднем холме. */
function PixelTree({ left, bottom }: { left: string; bottom: string }) {
  const leaves = ["..X..", ".XXX.", "XXXXX", ".XXX.", "XXXXX"];
  const s = 9;
  return (
    <div aria-hidden className="absolute" style={{ left, bottom, width: 5 * s, height: 7 * s }}>
      {leaves.map((r, y) =>
        [...r].map((c, x) =>
          c === "X" ? <span key={`${x}-${y}`} className="absolute bg-[#166534] dark:bg-[#14532d]" style={{ left: x * s, top: y * s, width: s, height: s }} /> : null
        )
      )}
      <span className="absolute bg-[#78350f]" style={{ left: 2 * s, top: 5 * s, width: s, height: 2 * s }} />
    </div>
  );
}

const FAR = [38, 40, 44, 44, 48, 52, 52, 50, 46, 46, 42, 40, 40, 44, 48, 54, 58, 58, 56, 52, 48, 46, 44, 44, 46, 50, 54, 54, 50, 46, 42, 40];
const MID = [24, 26, 26, 30, 32, 32, 30, 28, 28, 30, 34, 36, 36, 34, 30, 28, 26, 26, 28, 30, 30, 32, 34, 34, 32, 30, 28, 26, 26, 28, 30, 30];
const NEAR = [14, 14, 16, 16, 16, 18, 18, 16, 14, 14, 14, 16, 18, 20, 20, 18, 16, 16, 14, 14, 16, 16, 18, 18, 16, 16, 14, 14, 16, 18, 18, 16];

export function FinalePixelSky() {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="relative overflow-hidden rounded-[2.5rem] px-6 pb-56 pt-16 sm:pb-64 sm:pt-20">
        <PixelSky />
        {/* Солнце утром, луна ночью — тот же цветок, разной палитрой. */}
        <PixelFlower palette="cream" colors={{ C: "#facc15", c: "#eab308" }} className="absolute right-[10%] top-[10%] size-24 dark:hidden sm:size-32" />
        <PixelFlower palette="cream" className="absolute right-[10%] top-[10%] hidden size-20 opacity-90 drop-shadow-[0_0_24px_rgba(255,255,255,0.6)] dark:block sm:size-28" />
        <div className="hidden dark:block"><Sparkles /></div>
        <PixelCloud className="left-[6%] top-[14%]" scale={1.2} />
        <PixelCloud className="left-[58%] top-[8%]" scale={0.8} />
        <PixelCloud className="left-[30%] top-[30%]" scale={0.6} />

        <div className="absolute inset-x-0 bottom-0 h-56 sm:h-64">
          <Hills heights={FAR} color="#a5c9b0" dark="#1e2a4a" />
          <Hills heights={MID} color="#6ea85a" top="#86c06c" dark="#1c3326" />
          <Hills heights={NEAR} color="#7c4a1e" top="#5da130" dark="#2a1a0c" />
          <PixelTree left="8%" bottom="17%" />
          <PixelTree left="84%" bottom="19%" />
          <PixelFlower palette="orange" className="absolute bottom-[17%] left-[22%] size-9" />
          <PixelFlower palette="lime" className="absolute bottom-[19%] left-[66%] size-8" />
          <PixelFlower palette="peach" className="absolute bottom-[15%] left-[44%] size-7" />
        </div>

        <GlassCopy />
      </div>
    </section>
  );
}

// ---------- Ф5. Орбита, переделанная ----------

const INNER = [
  { label: "Spawns", icon: Castle },
  { label: "Lobbies", icon: Buildings },
  { label: "Arenas", icon: Sword },
  { label: "Islands", icon: Island },
];
const OUTER = [
  { label: "RPG cities", icon: MapTrifold },
  { label: "Custom terrain", icon: Mountains },
  { label: "Survival worlds", icon: Tree },
  { label: "Schematics", icon: Cube },
  { label: "Minigames", icon: Sword },
  { label: "Hubs", icon: Castle },
];

function Ring({ items, radius, duration, reverse }: { items: typeof INNER; radius: number; duration: number; reverse?: boolean }) {
  return (
    <div
      className="absolute left-1/2 top-1/2 motion-safe:animate-[orbit_linear_infinite]"
      style={{ width: radius * 2, height: radius * 2, marginLeft: -radius, marginTop: -radius, animationDuration: `${duration}s`, animationDirection: reverse ? "reverse" : "normal" }}
    >
      <div className="absolute inset-0 rounded-full border border-dashed border-zinc-950/10 dark:border-white/10" />
      {items.map((it, i) => {
        const a = (i / items.length) * Math.PI * 2;
        const Icon = it.icon;
        return (
          <div key={it.label} className="absolute" style={{ left: radius + Math.cos(a) * radius, top: radius + Math.sin(a) * radius }}>
            <div className="-translate-x-1/2 -translate-y-1/2 motion-safe:animate-[orbit_linear_infinite]" style={{ animationDuration: `${duration}s`, animationDirection: reverse ? "normal" : "reverse" }}>
              <span className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/70 bg-white/60 px-3.5 py-2 text-sm font-semibold text-zinc-900 shadow-lg shadow-orange-500/10 backdrop-blur-xl dark:border-white/15 dark:bg-white/10 dark:text-white">
                <Icon size={18} weight="duotone" className="text-orange-500 dark:text-orange-300" /> {it.label}
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

/** Ф5. Орбита про то, что строится: в центре настоящая работа в круге,
 *  на кольцах — виды построек. Свечение — несколько слоёв (оранжевый
 *  центр, лаймовый ореол, мягкий фиолетовый край). Обе темы. */
export function FinaleOrbit({ image, title }: { image: string; title: string }) {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-[#fbfbff] px-6 pb-10 pt-16 text-center dark:border-zinc-800 dark:bg-[#0c0d12] sm:px-10">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,0,0,0.05)_1px,transparent_1px)] [background-size:24px_24px] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)]" />
        <span className="relative inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-semibold text-orange-700 dark:text-orange-300">
          ✦ What I build
        </span>
        <h2 className="relative mx-auto mt-5 max-w-3xl text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white sm:text-5xl">
          Your next world starts with one message
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-zinc-700 dark:text-zinc-300">{ORDER_TEXT}</p>
        <div className="relative"><Actions /></div>

        <div className="relative mx-auto mt-4 h-[28rem] max-w-3xl sm:h-[32rem]">
          {/* Свечение слоями: ореол, кольцо, ядро. */}
          <div aria-hidden className="absolute left-1/2 top-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.25)_0%,transparent_65%)] blur-3xl" />
          <div aria-hidden className="absolute left-1/2 top-1/2 size-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(163,230,53,0.35)_0%,transparent_60%)] blur-2xl" />
          <div aria-hidden className="absolute left-1/2 top-1/2 size-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.85)_0%,rgba(249,115,22,0.25)_50%,transparent_72%)] blur-xl" />
          <Ring items={OUTER} radius={215} duration={110} reverse />
          <Ring items={INNER} radius={130} duration={70} />
          <div className="absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-4 border-white/80 shadow-[0_0_60px_rgba(249,115,22,0.55)] dark:border-white/20">
            <Image src={image} alt={title} fill sizes="160px" quality={90} className="object-cover" />
          </div>
        </div>

        <div className="relative mt-2 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((c) => (
            <Link key={c.title} href={c.href} className="rounded-2xl border border-white/70 bg-white/55 p-5 shadow-sm backdrop-blur-xl transition-colors hover:border-orange-400 dark:border-white/10 dark:bg-white/[0.06] dark:hover:border-orange-400/60">
              <h3 className="font-bold text-zinc-950 dark:text-white">{c.title}</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{c.text}</p>
            </Link>
          ))}
        </div>
        <style>{`@keyframes orbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </section>
  );
}
