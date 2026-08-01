"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Unbounded } from "next/font/google";
import {
  ArrowCounterClockwise,
  FileZip,
  Lightning,
  Lifebuoy,
  ShieldCheck,
  ShoppingCartSimple,
  Trash,
  X,
} from "@phosphor-icons/react";
import { useCart, type CartItem } from "@/lib/cart-context";
import { useUser } from "@/lib/useUser";
import { Button, BUTTON_COLORS } from "@/components/Button";
import { PageGlow } from "@/components/PageGlow";

// Клиентская страница целиком (нужен localStorage через useCart) — как
// у /shop/[slug], metadata живёт в соседнем layout.tsx, потому что
// клиентский компонент не может экспортировать metadata сам.

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

// Магазин на проде в тест-режиме Stripe: реально проходит только карта
// 4242…. Пока это так, честнее сказать об этом прямо на чекауте, чем дать
// посетителю принять витрину за настоящий магазин. ПЕРЕКЛЮЧИТЬ В false
// при переходе на live-платежи — плашка исчезнет.
const STRIPE_TEST_MODE = true;

function formatCents(cents: number, currency = "EUR") {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

// Что покупатель получает за свои деньги. Вынесено отдельным списком не
// ради красоты: главный страх перед кнопкой «Checkout» — «а что придёт и
// когда». Текст обязан совпадать с реальностью (см. /api/stripe/webhook и
// /purchases): доступ появляется сразу после оплаты, файл — zip из бакета
// product-files, карту мы не видим вообще (Stripe Checkout — их домен).
const FACTS = [
  {
    Icon: Lightning,
    text: "Instant access — your maps appear in My purchases right after payment.",
  },
  { Icon: FileZip, text: "Downloads are .zip files, ready to drop into your saves folder." },
  { Icon: ShieldCheck, text: "Payment is handled by Stripe. Your card details never reach us." },
];

export default function CartPage() {
  const { items, removeItem, addItem, clear, totalCents } = useCart();
  const { user } = useUser();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  // Удаление из корзины необратимо и без подтверждения — вместо
  // модального окна («точно удалить?» на каждый клик раздражает) держим
  // последнее удалённое и предлагаем вернуть. Без автоскрытия по таймеру:
  // таймер пришлось бы чистить при размонтировании, а полоска и так
  // уходит по следующему действию или по крестику.
  const [undo, setUndo] = useState<{ items: CartItem[]; label: string } | null>(null);

  function remove(item: CartItem) {
    removeItem(item.slug);
    setUndo({ items: [item], label: `Removed “${item.title}”` });
  }

  function clearAll() {
    const removed = items;
    clear();
    setUndo({ items: removed, label: `Cleared ${removed.length} maps` });
  }

  function restore() {
    undo?.items.forEach(addItem);
    setUndo(null);
  }

  async function checkout() {
    if (state === "loading" || items.length === 0) return;
    // Покупка требует аккаунта. Не залогинен — уводим на вход, а после
    // него обратно в корзину (?next=/cart). Сервер всё равно проверяет
    // это сам (401), тут — только удобство.
    if (!user) {
      router.push("/login?next=/cart");
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Наружу уходят только slug'и — цену сервер снова берёт из БД, не
        // отсюда (см. AddToCartButton).
        body: JSON.stringify({ items: items.map((i) => ({ slug: i.slug })) }),
      });
      // Сессия истекла между загрузкой страницы и оплатой — на вход.
      if (res.status === 401) {
        router.push("/login?next=/cart");
        return;
      }
      if (!res.ok) throw new Error(`checkout failed: ${res.status}`);
      const { url } = await res.json();
      if (typeof url !== "string" || !url.startsWith("https://")) {
        throw new Error("checkout returned no url");
      }
      window.location.assign(url);
    } catch (e) {
      console.error("Не удалось начать оплату:", e);
      setState("error");
    }
  }

  return (
    // Полноширинный родитель с overflow-x-clip, ограничение ширины — на
    // обёртке контента внутри. Иначе контейнер отрежет свечение (разбор — в
    // шапке PageGlow).
    <main className="relative w-full flex-1 overflow-x-clip px-6">
      <PageGlow color="rgba(249,115,22,0.28)" />

      <div className="mx-auto max-w-5xl pb-28 pt-20">
        <h1
          className={`${displayFont.className} text-center text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
        >
          Your cart
        </h1>
        <p className="mt-3 text-center text-sm text-zinc-600 dark:text-zinc-400">
          {items.length === 0
            ? "Nothing here yet."
            : `${items.length} ${items.length === 1 ? "map" : "maps"} ready to download.`}
        </p>

        {undo && (
          <div className="mx-auto mt-6 flex max-w-md items-center justify-between gap-3 rounded-full border border-zinc-200 bg-[#fbfbff] py-2 pl-5 pr-2 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <span className="min-w-0 truncate text-zinc-600 dark:text-zinc-400">{undo.label}</span>
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={restore}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 font-semibold text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-500"
              >
                <ArrowCounterClockwise size={14} weight="bold" />
                Undo
              </button>
              <button
                type="button"
                onClick={() => setUndo(null)}
                aria-label="Dismiss"
                className="cursor-pointer rounded-full p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X size={14} weight="bold" />
              </button>
            </span>
          </div>
        )}

        {items.length === 0 ? (
          // Без карточки и обводки (просьба владельца 2026-08-01): плотная
          // плита стояла ровно под свечением и гасила его в самом ярком
          // месте, а стеклянный вариант мы попробовали и отвергли. Контент
          // просто лежит на странице.
          <div className="mt-10 px-6 py-14 text-center">
            <ShoppingCartSimple
              size={40}
              weight="duotone"
              className="mx-auto text-orange-500 dark:text-orange-400"
            />
            <h2 className="mt-5 text-xl font-bold text-zinc-950 dark:text-zinc-50">
              Your cart is empty
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Pick a map from the shop — or start with the free ones, they download exactly the
              same way.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button href="/shop">Browse the shop</Button>
              <Button href="/shop?category=free" variant="secondary">
                Free maps
              </Button>
            </div>

            {/* Те же обещания, что и в Order summary у полной корзины —
                здесь они отвечают на «а что вообще будет, если куплю»
                ДО того, как человек что-то выбрал. */}
            <ul className="mx-auto mt-10 grid max-w-2xl gap-6 border-t border-zinc-950/[0.06] pt-8 text-left dark:border-white/10 sm:grid-cols-3">
              {FACTS.map(({ Icon, text }) => (
                <li key={text} className="flex flex-col gap-2 sm:items-center sm:text-center">
                  <Icon
                    size={20}
                    weight="bold"
                    className="shrink-0 text-orange-500 dark:text-orange-400"
                  />
                  <span className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {text}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-xs text-zinc-500 dark:text-zinc-400">
              Bought something already?{" "}
              <Link
                href="/purchases"
                className="font-semibold text-orange-500 underline decoration-2 underline-offset-2 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-500"
              >
                Your downloads live here
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_20rem]">
            {/* Позиции */}
            <div>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li
                    key={item.slug}
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200 bg-[#fbfbff] p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-nowrap"
                  >
                    <Link
                      href={`/shop/${item.slug}`}
                      className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl"
                    >
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/shop/${item.slug}`}
                        className="font-semibold text-zinc-950 hover:underline dark:text-zinc-50"
                      >
                        {item.title}
                      </Link>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Digital download · one-time purchase
                      </p>
                    </div>

                    <p className="w-20 shrink-0 text-right font-semibold text-zinc-950 dark:text-zinc-50">
                      {item.priceCents === 0 ? "Free" : formatCents(item.priceCents)}
                    </p>

                    <button
                      type="button"
                      onClick={() => remove(item)}
                      aria-label={`Remove ${item.title} from cart`}
                      className="cursor-pointer text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash size={18} />
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={clearAll}
                className="mt-4 cursor-pointer text-sm text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-red-600 dark:text-zinc-400 dark:decoration-zinc-700 dark:hover:text-red-400"
              >
                Clear cart
              </button>
            </div>

            {/* Итог — липкий на широких экранах: список может быть длинным,
                а кнопка оплаты должна оставаться на виду. */}
            <aside className="lg:sticky lg:top-28">
              <div className="rounded-3xl border border-zinc-200 bg-[#fbfbff] p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Order summary
                </h2>

                <dl className="mt-5 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-zinc-600 dark:text-zinc-400">
                      {items.length} {items.length === 1 ? "map" : "maps"}
                    </dt>
                    <dd className="text-zinc-950 dark:text-zinc-50">{formatCents(totalCents)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-zinc-600 dark:text-zinc-400">Taxes</dt>
                    <dd className="text-zinc-500 dark:text-zinc-400">Calculated at checkout</dd>
                  </div>
                </dl>

                <div className="mt-5 flex items-baseline justify-between border-t border-zinc-200 pt-5 dark:border-zinc-800">
                  <span className="font-semibold text-zinc-950 dark:text-zinc-50">Total</span>
                  <span className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-50">
                    {formatCents(totalCents)}
                  </span>
                </div>

                <Button size="lg" onClick={checkout} className="mt-6 w-full">
                  {state === "loading" ? "Redirecting…" : user ? "Checkout" : "Sign in to checkout"}
                </Button>

                {state === "error" && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                    Something went wrong — please try again.
                  </p>
                )}

                {STRIPE_TEST_MODE && (
                  <p className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                    Demo shop — Stripe is in test mode. Use card 4242 4242 4242 4242 with any future
                    date and CVC. No real money moves.
                  </p>
                )}

                <ul className="mt-6 space-y-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
                  {FACTS.map(({ Icon, text }) => (
                    <li key={text} className="flex gap-2.5 text-xs leading-relaxed">
                      <Icon
                        size={16}
                        weight="bold"
                        className="mt-0.5 shrink-0 text-orange-500 dark:text-orange-400"
                      />
                      <span className="text-zinc-600 dark:text-zinc-400">{text}</span>
                    </li>
                  ))}
                  <li className="flex gap-2.5 text-xs leading-relaxed">
                    <Lifebuoy
                      size={16}
                      weight="bold"
                      className="mt-0.5 shrink-0 text-orange-500 dark:text-orange-400"
                    />
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Something wrong with a file?{" "}
                      <Link
                        href="/support"
                        className="font-semibold text-orange-500 underline decoration-2 underline-offset-2 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-500"
                      >
                        We&apos;ll sort it out
                      </Link>
                      .
                    </span>
                  </li>
                </ul>
              </div>

              <Link
                href="/shop"
                className={`mt-4 block text-center text-sm ${BUTTON_COLORS.tertiary}`}
              >
                Keep browsing
              </Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
