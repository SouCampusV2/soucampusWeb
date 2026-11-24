"use client";

// Финал страниц, круг 4 (24.11). Владелец: нарисованные пейзажи не
// зашли — предложены настоящие материалы: рендер построек (А), две карточки
// «заказ + Discord» с живыми цифрами (Б), свежее со студии (В) и А+Б.

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { DiscordLogo, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { DISCORD_INVITE } from "@/lib/site";
import { estimatePrice, estimateDeadlineDays, formatDeadline } from "@/lib/pricing";

export type Shot = { image: string; title: string; slug: string };
export type DiscordStats = { members: number; online: number; icon: string | null } | null;

const LINE = "Custom Minecraft maps, built to your size, style and deadline.";

function OrderButtons({ onDark = true }: { onDark?: boolean }) {
  return (
    <div className="mt-7 flex flex-wrap gap-3">
      <Button href="/contact" size="lg">Order a map</Button>
      <Button
        href={DISCORD_INVITE}
        target="_blank"
        rel="noopener noreferrer"
        size="lg"
        colorClassName={onDark ? "bg-white/15 text-white backdrop-blur-md hover:bg-white/25" : "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"}
      >
        Join Discord <DiscordLogo size={20} weight="fill" />
      </Button>
    </div>
  );
}

function Credit({ shot }: { shot: Shot }) {
  return (
    <Link href={`/portfolio/${shot.slug}`} className="absolute bottom-4 right-5 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md hover:bg-black/60">
      On the photo: {shot.title}
    </Link>
  );
}

// ---------------- А. Рендер ----------------

/** А1. Рендер во всю ширину, текст снизу слева на тёмном градиенте. */
export function RenderBottom({ shot }: { shot: Shot }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] sm:aspect-[21/9]">
        <Image src={shot.image} alt={shot.title} fill quality={90} sizes="(min-width:1152px) 1100px, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-8 sm:p-12">
          <h2 className="max-w-xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl">Let&apos;s build your world</h2>
          <p className="mt-3 max-w-md text-lg text-white/85">{LINE}</p>
          <OrderButtons />
        </div>
        <Credit shot={shot} />
      </div>
    </section>
  );
}

/** А2. Рендер, по центру стеклянная карточка. */
export function RenderGlass({ shot }: { shot: Shot }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6">
      <div className="relative flex min-h-[30rem] items-center justify-center overflow-hidden rounded-[2.5rem] p-6 sm:min-h-[34rem]">
        <Image src={shot.image} alt={shot.title} fill quality={90} sizes="(min-width:1152px) 1100px, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-xl rounded-[2rem] border border-white/25 bg-white/15 p-8 text-center text-white shadow-2xl backdrop-blur-xl sm:p-10">
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Let&apos;s build your world</h2>
          <p className="mt-3 text-lg text-white/90">{LINE}</p>
          <div className="flex justify-center"><OrderButtons /></div>
        </div>
        <Credit shot={shot} />
      </div>
    </section>
  );
}

/** А3. Раскладка: рендер слева, текст справа на фоне страницы. Обе темы. */
export function RenderSplit({ shot }: { shot: Shot }) {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 lg:grid-cols-[3fr_2fr]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2.5rem]">
        <Image src={shot.image} alt={shot.title} fill quality={90} sizes="(min-width:1024px) 60vw, 100vw" className="object-cover" />
        <Credit shot={shot} />
      </div>
      <div>
        <span className="text-sm font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">Next step</span>
        <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">Let&apos;s build your world</h2>
        <p className="mt-3 text-lg text-zinc-700 dark:text-zinc-300">{LINE}</p>
        <OrderButtons onDark={false} />
      </div>
    </section>
  );
}

/** А4. Лента из трёх рендеров веером, текст под ними по центру. */
export function RenderFan({ shots }: { shots: Shot[] }) {
  const [a, b, c] = shots;
  return (
    <section className="mx-auto w-full max-w-6xl px-6 text-center">
      <div className="relative mx-auto flex h-64 max-w-3xl items-end justify-center sm:h-80">
        {[a, b, c].filter(Boolean).map((s, i) => (
          <Link key={s.slug} href={`/portfolio/${s.slug}`} className={`absolute bottom-0 block aspect-[4/3] w-1/2 overflow-hidden rounded-3xl border-4 border-[#fbfbff] shadow-2xl transition-transform duration-300 hover:z-10 hover:-translate-y-3 dark:border-zinc-950 ${["-translate-x-[55%] -rotate-6", "z-[1]", "translate-x-[55%] rotate-6"][i]}`}>
            <Image src={s.image} alt={s.title} fill sizes="30vw" className="object-cover" />
          </Link>
        ))}
      </div>
      <h2 className="mt-12 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">Let&apos;s build your world</h2>
      <p className="mx-auto mt-3 max-w-md text-lg text-zinc-700 dark:text-zinc-300">{LINE}</p>
      <div className="flex justify-center"><OrderButtons onDark={false} /></div>
    </section>
  );
}

// ---------------- Б. Две карточки ----------------

function Estimator({ tone }: { tone: "light" | "dark" }) {
  const [side, setSide] = useState(250);
  const sub = tone === "dark" ? "text-white/70" : "text-zinc-600 dark:text-zinc-400";
  return (
    <div className="mt-6">
      <input type="range" min={100} max={800} step={50} value={side} onChange={(e) => setSide(Number(e.target.value))} className="w-full accent-orange-500" aria-label="Map side in blocks" />
      <div className="mt-3 flex items-end justify-between gap-4">
        <span className={`text-sm ${sub}`}>{side}×{side} blocks</span>
        <span className="text-right">
          <span className="block text-3xl font-extrabold">€{estimatePrice(side, side)}</span>
          <span className={`text-sm ${sub}`}>ready in {formatDeadline(estimateDeadlineDays(side, side))}</span>
        </span>
      </div>
    </div>
  );
}

function DiscordCount({ stats, showTotal }: { stats: DiscordStats; showTotal: boolean }) {
  if (!stats) return null;
  return (
    <p className="mt-4 flex items-center gap-2 text-sm font-semibold">
      <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-lime-400 opacity-75" /><span className="relative inline-flex size-2.5 rounded-full bg-lime-400" /></span>
      {stats.online} online now{showTotal ? ` · ${stats.members} members` : ""}
    </p>
  );
}

/** Б1. Оранжевая карточка заказа с ползунком + синяя Discord с живыми цифрами. */
export function CardsBold({ stats, showTotal }: { stats: DiscordStats; showTotal: boolean }) {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-6 lg:grid-cols-2">
      <div className="rounded-[2.5rem] bg-[radial-gradient(120%_90%_at_0%_0%,#fdba74,#f97316_50%,#c2410c)] p-8 text-white sm:p-10">
        <h2 className="text-3xl font-extrabold tracking-tight">Order a custom map</h2>
        <p className="mt-2 text-white/85">Drag to your size for a first estimate.</p>
        <Estimator tone="dark" />
        <div className="mt-6"><Button href="/contact" size="lg" colorClassName="bg-white text-zinc-950 hover:bg-zinc-100">Get an exact quote <ArrowRight size={20} weight="bold" /></Button></div>
      </div>
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#5865f2] p-8 text-white sm:p-10">
        <DiscordLogo size={180} weight="fill" className="absolute -bottom-8 -right-8 text-white/10" aria-hidden />
        <h2 className="text-3xl font-extrabold tracking-tight">Join the Discord</h2>
        <p className="mt-2 max-w-sm text-white/85">New builds show up there first. Orders go through tickets, with a real person on the other side.</p>
        <DiscordCount stats={stats} showTotal={showTotal} />
        <div className="mt-6"><Button href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" size="lg" colorClassName="bg-white text-[#3c45c5] hover:bg-zinc-100">Join the server <DiscordLogo size={20} weight="fill" /></Button></div>
      </div>
    </section>
  );
}

/** Б2. Те же две карточки, спокойные: обе на фоне страницы, цвет — в акцентах. */
export function CardsQuiet({ stats, showTotal }: { stats: DiscordStats; showTotal: boolean }) {
  const card = "rounded-[2.5rem] border border-zinc-200 bg-[#fbfbff] p-8 dark:border-zinc-800 dark:bg-zinc-950 sm:p-10";
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-6 lg:grid-cols-2">
      <div className={card}>
        <span className="text-sm font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">Commission</span>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">Order a custom map</h2>
        <div className="text-zinc-950 dark:text-zinc-50"><Estimator tone="light" /></div>
        <div className="mt-6"><Button href="/contact" size="lg">Get an exact quote <ArrowRight size={20} weight="bold" /></Button></div>
      </div>
      <div className={card}>
        <span className="text-sm font-semibold uppercase tracking-wide text-[#5865f2]">Community</span>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">Join the Discord</h2>
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">New builds show up there first. Orders go through tickets, with a real person on the other side.</p>
        <div className="text-zinc-900 dark:text-zinc-100"><DiscordCount stats={stats} showTotal={showTotal} /></div>
        <div className="mt-6"><Button href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" size="lg" colorClassName="bg-[#5865f2] text-white hover:bg-[#4752c4]">Join the server <DiscordLogo size={20} weight="fill" /></Button></div>
      </div>
    </section>
  );
}

// ---------------- В. Свежее со студии ----------------

export type Fresh = { label: string; title: string; href: string; image: string };

/** В1. Три карточки «свежее»: пост, карта, работа. */
export function FreshRow({ items }: { items: Fresh[] }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6">
      <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">Fresh from the studio</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="group relative block aspect-[4/5] overflow-hidden rounded-3xl">
            <Image src={it.image} alt="" fill sizes="(min-width:640px) 33vw, 100vw" className="object-cover brightness-90 transition-[filter] group-hover:brightness-100" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-5 pt-20">
              <span className="text-xs font-semibold uppercase tracking-wide text-orange-300">{it.label}</span>
              <h3 className="mt-1 text-lg font-bold text-white">{it.title}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------------- А+Б ----------------

/** АБ. Рендер фоном, поверх две стеклянные карточки: заказ и Discord. */
export function RenderWithCards({ shot, stats, showTotal }: { shot: Shot; stats: DiscordStats; showTotal: boolean }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6">
      <div className="relative overflow-hidden rounded-[2.5rem] p-6 sm:p-12">
        <Image src={shot.image} alt={shot.title} fill quality={90} sizes="(min-width:1152px) 1100px, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
        <h2 className="relative text-center text-4xl font-extrabold tracking-tight text-white sm:text-6xl">Let&apos;s build your world</h2>
        <div className="relative mt-10 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/20 bg-white/15 p-7 text-white backdrop-blur-xl">
            <h3 className="text-2xl font-extrabold">Order a custom map</h3>
            <Estimator tone="dark" />
            <div className="mt-6"><Button href="/contact" size="lg">Get an exact quote <ArrowRight size={20} weight="bold" /></Button></div>
          </div>
          <div className="rounded-[2rem] border border-white/20 bg-white/15 p-7 text-white backdrop-blur-xl">
            <h3 className="text-2xl font-extrabold">Join the Discord</h3>
            <p className="mt-2 text-white/85">New builds show up there first. Orders go through tickets.</p>
            <DiscordCount stats={stats} showTotal={showTotal} />
            <div className="mt-6"><Button href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" size="lg" colorClassName="bg-[#5865f2] text-white hover:bg-[#4752c4]">Join the server <DiscordLogo size={20} weight="fill" /></Button></div>
          </div>
        </div>
        <Credit shot={shot} />
      </div>
    </section>
  );
}
