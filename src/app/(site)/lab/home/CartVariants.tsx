// Варианты корзины (лаборатория 24.11). Владелец: иконка пустой корзины
// «уебанская», текст тусклый, «поработай над дизайном, несколько
// вариантов». Пустая — три иллюстрации вместо иконки; полная — два вида.
// Данные полной корзины — настоящие карты витрины, оплаты здесь нет.

import Image from "next/image";
import Link from "next/link";
import { Lightning, FileZip, ShieldCheck, Trash, Lock } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/Button";
import { PixelFlower } from "@/components/brand/PixelArt";
import { Sparkles } from "@/components/Sparkles";
import type { Product } from "@/lib/products";

const FACTS = [
  { Icon: Lightning, text: "Your maps appear in My purchases right after payment." },
  { Icon: FileZip, text: "Downloads are .zip files, ready for your saves folder." },
  { Icon: ShieldCheck, text: "Stripe handles the payment. Your card never reaches us." },
];

function EmptyButtons() {
  return (
    <div className="mt-7 flex flex-wrap justify-center gap-3">
      <Button href="/marketplace">Browse the marketplace</Button>
      <Button href="/marketplace?category=free" variant="secondary">Free maps</Button>
    </div>
  );
}

/** Пиксельный сундук, открытый и пустой: крышка поднята, внутри темно. */
function PixelChest({ className = "" }: { className?: string }) {
  // . пусто, D тёмное дерево, W дерево, L светлое дерево, G золото, K темнота внутри
  const rows = [
    "..DDDDDDDDDDDD..",
    ".DWWWWWWWWWWWWD.",
    ".DWLLLLLLLLLLWD.",
    ".DWWWWWWWWWWWWD.",
    ".DDDDDDDDDDDDDD.",
    "................",
    "DDDDDDDDDDDDDDDD",
    "DKKKKKKKKKKKKKKD",
    "DKKKKKKKKKKKKKKD",
    "DWWWWWWGGWWWWWWD",
    "DWLLLLLGGLLLLLWD",
    "DWWWWWWWWWWWWWWD",
    "DLLLLLLLLLLLLLLD",
    "DWWWWWWWWWWWWWWD",
    "DDDDDDDDDDDDDDDD",
  ];
  const color: Record<string, string> = { D: "#5b3716", W: "#9a5b26", L: "#c07a3a", G: "#facc15", K: "#1c1917" };
  return (
    <svg viewBox="0 0 16 15" shapeRendering="crispEdges" className={className} aria-hidden>
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color[c]} />)))}
    </svg>
  );
}

/** КП1. Пустой сундук с искрами. */
export function EmptyChest() {
  return (
    <div className="mx-auto max-w-3xl rounded-[2rem] border border-zinc-200 bg-[#fbfbff] px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
      <div className="relative mx-auto size-36">
        <Sparkles className="text-orange-400" sparks={[{ top: "0%", left: "8%", size: 16, delay: 0 }, { top: "10%", left: "82%", size: 12, delay: 1 }, { top: "60%", left: "-4%", size: 10, delay: 2 }]} />
        <PixelChest className="size-full" />
      </div>
      <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">Your cart is empty</h2>
      <p className="mx-auto mt-3 max-w-sm text-zinc-700 dark:text-zinc-300">Nothing in the chest yet. Pick a map, or start with the free ones.</p>
      <EmptyButtons />
    </div>
  );
}

/** КП2. Цветок-знак в оранжевом свечении, мягко покачивается. */
export function EmptyFlower() {
  return (
    <div className="mx-auto max-w-3xl rounded-[2rem] border border-zinc-200 bg-[#fbfbff] px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
      <div className="relative mx-auto flex size-40 items-center justify-center">
        <div aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.35),transparent_70%)] blur-xl" />
        <PixelFlower palette="orange" className="relative size-24 motion-safe:animate-[sway_4s_ease-in-out_infinite]" />
      </div>
      <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">Your cart is empty</h2>
      <p className="mx-auto mt-3 max-w-sm text-zinc-700 dark:text-zinc-300">Pick a map from the marketplace, or start with the free ones.</p>
      <EmptyButtons />
      <style>{`@keyframes sway{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}`}</style>
    </div>
  );
}

/** КП3. Сразу витрина: «пусто» одной строкой и три свежие карты. */
export function EmptyShelf({ products }: { products: Product[] }) {
  return (
    <div className="mx-auto max-w-5xl rounded-[2rem] border border-zinc-200 bg-[#fbfbff] p-6 dark:border-zinc-800 dark:bg-zinc-950 sm:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">Your cart is empty</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">Here&apos;s what&apos;s new on the marketplace.</p>
        </div>
        <Button href="/marketplace" variant="secondary" size="sm">See everything</Button>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {products.slice(0, 3).map((p) => (
          <Link key={p.slug} href={`/marketplace/${p.slug}`} className="group overflow-hidden rounded-2xl border border-zinc-200 transition-colors hover:border-orange-400 dark:border-zinc-800">
            <div className="relative aspect-video bg-zinc-200 dark:bg-zinc-800">
              <Image src={p.image} alt="" fill sizes="(min-width:640px) 30vw, 100vw" className="object-cover" />
              <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-zinc-950">{p.priceCents === 0 ? "Free" : p.price}</span>
            </div>
            <p className="p-3 font-semibold text-zinc-950 group-hover:text-orange-600 dark:text-zinc-50 dark:group-hover:text-orange-400">{p.title}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function totalOf(products: Product[]) {
  const cents = products.reduce((s, p) => s + p.priceCents, 0);
  return `€${(cents / 100).toFixed(2)}`;
}

/** КЗ1. Строки с крупными картинками, справа стеклянная сводка с итогом
 *  и обещаниями; яркий текст. */
export function FilledGlass({ products }: { products: Product[] }) {
  const items = products.slice(0, 2);
  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <ul className="space-y-3">
        {items.map((p) => (
          <li key={p.slug} className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-[#fbfbff] p-3 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800">
              <Image src={p.image} alt="" fill sizes="160px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold text-zinc-950 dark:text-zinc-50">{p.title}</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">Instant download · .zip</p>
            </div>
            <p className="text-lg font-bold text-zinc-950 dark:text-zinc-50">{p.priceCents === 0 ? "Free" : p.price}</p>
            <button type="button" aria-label="Remove" className="rounded-full p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40"><Trash size={18} /></button>
          </li>
        ))}
      </ul>
      <aside className="relative overflow-hidden rounded-[2rem] border border-orange-200 bg-gradient-to-b from-orange-50 to-white p-6 dark:border-orange-900/50 dark:from-orange-950/40 dark:to-zinc-950">
        <h3 className="text-sm font-bold uppercase tracking-wide text-orange-700 dark:text-orange-300">Order summary</h3>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-zinc-800 dark:text-zinc-200">Total</span>
          <span className="text-3xl font-extrabold text-zinc-950 dark:text-white">{totalOf(items)}</span>
        </div>
        <Button size="lg" className="mt-5 w-full"><Lock size={18} weight="bold" /> Checkout</Button>
        <ul className="mt-5 space-y-2.5">
          {FACTS.map(({ Icon, text }) => (
            <li key={text} className="flex gap-2 text-sm text-zinc-800 dark:text-zinc-200"><Icon size={18} weight="duotone" className="mt-0.5 shrink-0 text-orange-500" />{text}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

/** КЗ2. Чек: позиции списком с пунктиром до цены, зубчатый низ, кнопка
 *  под чеком. Компактно. */
export function FilledReceipt({ products }: { products: Product[] }) {
  const items = products.slice(0, 2);
  return (
    <div className="mx-auto max-w-md">
      <div className="relative bg-[#fbfbff] px-6 pb-8 pt-6 shadow-xl dark:bg-zinc-900" style={{ clipPath: "polygon(0 0,100% 0,100% calc(100% - 10px),95% 100%,90% calc(100% - 10px),85% 100%,80% calc(100% - 10px),75% 100%,70% calc(100% - 10px),65% 100%,60% calc(100% - 10px),55% 100%,50% calc(100% - 10px),45% 100%,40% calc(100% - 10px),35% 100%,30% calc(100% - 10px),25% 100%,20% calc(100% - 10px),15% 100%,10% calc(100% - 10px),5% 100%,0 calc(100% - 10px))" }}>
        <div className="flex items-center gap-2">
          <PixelFlower palette="orange" className="size-7" />
          <span className="font-extrabold text-zinc-950 dark:text-white">SouCampus builds</span>
        </div>
        <ul className="mt-6 space-y-3 font-mono text-sm">
          {items.map((p) => (
            <li key={p.slug} className="flex items-baseline gap-2 text-zinc-900 dark:text-zinc-100">
              <span className="truncate">{p.title}</span>
              <span className="flex-1 border-b border-dotted border-zinc-400 dark:border-zinc-600" />
              <span>{p.priceCents === 0 ? "FREE" : p.price}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-baseline justify-between border-t-2 border-dashed border-zinc-300 pt-4 font-mono dark:border-zinc-700">
          <span className="font-bold text-zinc-950 dark:text-white">TOTAL</span>
          <span className="text-2xl font-extrabold text-zinc-950 dark:text-white">{totalOf(items)}</span>
        </div>
      </div>
      <Button size="lg" className="mt-6 w-full"><Lock size={18} weight="bold" /> Pay with Stripe</Button>
    </div>
  );
}
