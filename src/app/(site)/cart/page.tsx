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
import {
  Button,
  BUTTON_COLORS,
  BUTTON_PILL,
  DANGER_COLORS,
} from "@/components/Button";
import { PageGlow } from "@/components/PageGlow";
import { CartRecommendations } from "@/components/CartRecommendations";
import { readApiError } from "@/lib/api-error";

// Клиентская страница целиком (нужен localStorage через useCart) — как
// у /marketplace/[slug], metadata живёт в соседнем layout.tsx, потому что
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
  // Отдельно от state, потому что это не сбой: покупка не сломалась,
  // её попросили повторить позже, и текст объясняет когда.
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
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
    setLimitMessage(null);
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
      // 429 — единственный отказ, который надо объяснить словами: он не
      // сбой, он проходит сам через несколько минут, и «попробуйте
      // позже» без причины выглядит как поломка магазина.
      if (res.status === 429) {
        const { message } = await readApiError(res);
        setLimitMessage(message ?? "Too many attempts. Try again in a few minutes.");
        setState("idle");
        return;
      }
      if (!res.ok) throw new Error(`checkout failed: ${res.status}`);
      const data = await res.json();

      // Корзина из одних бесплатных карт до Stripe не доходит вовсе —
      // сервер записал заказы сам и вернул claimed (см. /api/checkout).
      // Корзину чистим ЗДЕСЬ, а не на странице назначения: у платного
      // пути это делает ClearCartOnSuccess на /marketplace/success, а
      // бесплатный туда не заходит, и чистить его было бы некому.
      if (data?.claimed) {
        clear();
        router.push("/purchases");
        return;
      }

      const { url } = data;
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
    // px-6 снят с <main> и роздан детям: с 2026-08-22 у пустой корзины
    // два блока разной ширины — узкий (текст, кнопки, обещания) и
    // широкий, во всю ширину витрины (рекомендации), — и общий паддинг
    // родителя мешал бы второму совпасть с /marketplace.
    <main className="relative w-full flex-1 overflow-x-clip">
      <PageGlow color="rgba(249,115,22,0.28)" />

      <div
        className={`mx-auto max-w-5xl px-6 pt-20 ${
          // У пустой корзины снизу идут рекомендации со своим отступом —
          // здесь достаточно зазора, иначе между блоками провал в 200px.
          items.length === 0 ? "pb-10" : "pb-28"
        }`}
      >
        {/* «Пусто» сказано ОДИН раз — в заголовке (просьба владельца
            2026-08-22). Раньше то же самое стояло трижды подряд: «Your
            cart» / «Nothing here yet.» / «Your cart is empty» — три
            строки, отвечающие на один вопрос, читаются не как забота, а
            как заикание. Иконка переехала сюда же, из блока ниже: она
            часть этого утверждения, а не отдельная иллюстрация к нему. */}
        <h1
          className={`${displayFont.className} flex items-center justify-center gap-3 text-center text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
        >
          {items.length === 0 ? (
            <>
              Your cart is empty
              <ShoppingCartSimple
                size={40}
                weight="duotone"
                // Размер через классы, а не только через size: у него
                // нет отзывчивого варианта, а иконка обязана расти
                // вместе с заголовком (text-4xl → sm:text-5xl).
                className="h-9 w-9 shrink-0 text-orange-500 dark:text-orange-400 sm:h-12 sm:w-12"
              />
            </>
          ) : (
            "Your cart"
          )}
        </h1>

        {/* Подпись — только когда есть что считать. У пустой корзины
            заголовок уже всё сказал. */}
        {items.length > 0 && (
          <p className="mt-3 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {`${items.length} ${items.length === 1 ? "map" : "maps"} ready to download.`}
          </p>
        )}

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
          <div className="pb-6 pt-8 text-center">
            {/* Иконка и заголовок «Your cart is empty» переехали В
                <h1> выше — см. разбор там. Здесь остались только ответ
                на «и что теперь» и кнопки. */}
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Pick a map from the marketplace — or start with the free ones, they download exactly the
              same way.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button href="/marketplace">Browse the marketplace</Button>
              <Button href="/marketplace?category=free" variant="secondary">
                Free maps
              </Button>
            </div>

            {/* Те же обещания, что и в Order summary у полной корзины —
                здесь они отвечают на «а что вообще будет, если куплю»
                ДО того, как человек что-то выбрал.

                ⚠️ ТЕПЕРЬ ОНИ ВЫШЕ РЕКОМЕНДАЦИЙ (просьба владельца
                2026-08-22). Раньше порядок был обратный, и довод был
                такой: «человек ещё ничего не выбрал, товар полезнее
                рассказа об условиях». Довод не выдержал вида: обещания
                — три строки мелким шрифтом, они читаются как подпись под
                блоком выше, а не как отдельный раздел, и стоять ПОСЛЕ
                широкого ряда карточек им не по росту. Рекомендации
                теперь закрывают страницу, а не разрезают её. */}
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
                      href={`/marketplace/${item.slug}`}
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
                        href={`/marketplace/${item.slug}`}
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
                      /* ⚠️ Зона нажатия была 18×18 — ровно иконка. Хуже
                         того, действие разрушающее и без подтверждения:
                         промах по соседней строке убирает из корзины не
                         тот товар, и заметить это можно уже на оплате.
                         На тач-экране кнопка 44px, на вид прежняя. */
                      className="flex shrink-0 cursor-pointer items-center justify-center text-zinc-400 hover:text-red-600 pointer-coarse:h-11 pointer-coarse:w-11 dark:hover:text-red-400"
                    >
                      <Trash size={18} />
                    </button>
                  </li>
                ))}
              </ul>

              {/* Разрушающее действие второго плана: DANGER_COLORS.quiet
                  в геометрии маленькой пилюли — тот же вид, что у прочих
                  опасных кнопок «в ряду с обычными» (DESIGN.md → Red).
                  Раньше здесь была самодельная серая ссылка с
                  подчёркиванием, которой нет ни в одном варианте Button. */}
              <button
                type="button"
                onClick={clearAll}
                className={`mt-4 ${BUTTON_PILL} -ml-5 ${DANGER_COLORS.quiet}`}
              >
                <Trash size={16} />
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
                  {/* Надпись честно называет то, что произойдёт: у
                      корзины из одних бесплатных карт не будет ни
                      перехода к оплате, ни самой оплаты. */}
                  {state === "loading"
                    ? totalCents === 0
                      ? "Getting your maps…"
                      : "Redirecting…"
                    : !user
                      ? "Sign in to continue"
                      : totalCents === 0
                        ? "Get for free"
                        : "Checkout"}
                </Button>

                {state === "error" && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                    Something went wrong — please try again.
                  </p>
                )}

                {limitMessage && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                    {limitMessage}
                  </p>
                )}

                {STRIPE_TEST_MODE && (
                  <p className="mt-4 rounded-xl bg-orange-50 px-4 py-3 text-xs leading-relaxed text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                    Demo marketplace — Stripe is in test mode. Use card 4242 4242 4242 4242 with any future
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
                href="/marketplace"
                className={`mt-4 block text-center text-sm ${BUTTON_COLORS.tertiary}`}
              >
                Keep browsing
              </Link>
            </aside>
          </div>
        )}
      </div>

      {/* ⚠️ РЕКОМЕНДАЦИИ ЖИВУТ СНАРУЖИ узкой обёртки, и это единственный
          способ дать им размер карточек витрины.

          Одинаковая карточка получается из одинаковой ШИРИНЫ, а не из
          одинаковых классов. Пока ряд стоял внутри max-w-5xl, при экране
          1920 выходило:

            /marketplace, 4 колонки в max-w-[120rem]  → 408px
            корзина,      3 колонки в max-w-5xl       → 315px

          Никакая правка сетки этого не лечит: контейнер уже упёрся в
          свои 1024px. Поэтому здесь дословно тот же контейнер и тот же
          набор паддингов, что у страницы витрины (marketplace/page.tsx),
          — вплоть до 2xl:px-[120px]. Разойдутся они только если кто-то
          поправит одно место и забудет второе. */}
      {/* Показываем и при полной корзине (просьба владельца 23.08).
          Раньше блок исчезал, как только в корзину что-то клали, — то
          есть ровно в тот момент, когда человек уже точно покупает и
          добрать вторую карту ему проще всего. Пустая корзина — это
          «ничего не выбрал», полная — «уже решился»; второе для
          рекомендации выгоднее, а не хуже.

          exclude убирает из подборки то, что уже лежит в корзине. */}
      <div className="mx-auto max-w-[120rem] px-6 pb-28 sm:px-10 lg:px-16 xl:px-24 2xl:px-[120px]">
        <CartRecommendations exclude={items.map((i) => i.slug)} />
      </div>
    </main>
  );
}
