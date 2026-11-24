"use client";

// Чем заменить «Choose your plan» внизу страниц (лаборатория 24.11).
// Тарифы обещали подписку, которой нет; на её место — секция, которая
// куда-то ведёт: заказ, Discord, свежее со студии или цена своей карты.

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { DiscordLogo } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { PixelFlower, PixelFanMark } from "@/components/brand/PixelArt";
import { DISCORD_INVITE } from "@/lib/site";
import { estimatePrice, estimateDeadlineDays, formatDeadline } from "@/lib/pricing";

/** П1. Большой призыв к заказу с пиксельными цветами по краям. */
export function EndOrder() {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-950 px-8 py-16 text-center dark:bg-zinc-900 sm:py-24">
        <PixelFlower palette="orange" className="absolute -left-10 -top-10 size-48 opacity-90" />
        <PixelFlower palette="lime" className="absolute -bottom-12 -right-8 size-56 opacity-90" />
        <h2 className="relative text-3xl font-extrabold tracking-tight text-white sm:text-5xl">Have a build in mind?</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-zinc-300">
          Tell me the size, the style and the deadline. I&apos;ll come back with a price and a plan, usually the same day.
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Button href="/contact" size="lg">Order a map</Button>
          <Button href="/marketplace" size="lg" variant="secondary" colorClassName="bg-white/10 text-white hover:bg-white/20">Browse ready maps</Button>
        </div>
      </div>
    </section>
  );
}

/** П2. Приглашение в Discord: лаймовая карточка, что там происходит. */
export function EndDiscord() {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="grid items-center gap-8 rounded-[2.5rem] bg-lime-300 p-8 text-zinc-950 sm:p-12 lg:grid-cols-[1fr_auto]">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Come say hi on Discord</h2>
          <ul className="mt-5 space-y-2 text-zinc-800">
            <li>New builds and maps show up there first.</li>
            <li>Free maps and giveaways for members.</li>
            <li>Orders go through tickets, with a real person on the other side.</li>
          </ul>
          <div className="mt-7">
            <Button href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" size="lg" colorClassName="bg-zinc-950 text-white hover:bg-zinc-800">
              <DiscordLogo size={20} weight="fill" /> Join the server
            </Button>
          </div>
        </div>
        <PixelFanMark petals="#09090b" sun="#f97316" className="mx-auto size-40 sm:size-52" />
      </div>
    </section>
  );
}

export type FreshItem = { label: string; title: string; href: string; image: string };

/** П3. Свежее со студии: последний пост What's new, новая карта, новая работа. */
export function EndFresh({ items }: { items: FreshItem[] }) {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">Fresh from the studio</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="group block overflow-hidden rounded-3xl border border-zinc-200 bg-[#fbfbff] transition-colors hover:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-orange-400">
            <div className="relative aspect-video">
              <Image src={it.image} alt="" fill sizes="(min-width:640px) 33vw, 100vw" className="object-cover" />
            </div>
            <div className="p-5">
              <span className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">{it.label}</span>
              <h3 className="mt-1 font-semibold text-zinc-950 group-hover:underline dark:text-zinc-50">{it.title}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** П4. «Сколько стоила бы твоя карта?» — один ползунок размера, цена и
 *  срок сразу, кнопка в полный калькулятор на Contact. */
export function EndPrice() {
  const [side, setSide] = useState(250);
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="rounded-[2.5rem] border border-zinc-200 bg-[#fbfbff] p-8 dark:border-zinc-800 dark:bg-zinc-950 sm:p-12">
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">What would your map cost?</h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">Drag to your map size. Square maps for now, the full calculator does any shape.</p>
        <div className="mt-8 grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <input type="range" min={100} max={800} step={50} value={side} onChange={(e) => setSide(Number(e.target.value))} className="w-full accent-orange-500" aria-label="Map side in blocks" />
            <p className="mt-2 text-sm text-zinc-500">{side}×{side} blocks</p>
          </div>
          <div className="flex items-baseline gap-6">
            <p><span className="block text-xs uppercase tracking-wide text-zinc-500">About</span><span className="text-4xl font-extrabold text-zinc-950 dark:text-zinc-50">€{estimatePrice(side, side)}</span></p>
            <p><span className="block text-xs uppercase tracking-wide text-zinc-500">Ready in</span><span className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">{formatDeadline(estimateDeadlineDays(side, side))}</span></p>
          </div>
        </div>
        <div className="mt-8">
          <Button href="/contact" size="lg">Get an exact quote</Button>
        </div>
      </div>
    </section>
  );
}
