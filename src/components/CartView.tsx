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
  Trash,
  X,
} from "@phosphor-icons/react";
import { useCart, type CartItem } from "@/lib/cart-context";
import { useIsAvailable } from "@/components/CartAvailability";
import { useUser } from "@/lib/useUser";
import {
  Button,
  BUTTON_COLORS,
  BUTTON_PILL,
  DANGER_COLORS,
} from "@/components/Button";
import { PageGlow } from "@/components/PageGlow";
import { CartRecommendations } from "@/components/CartRecommendations";
import { PixelChest } from "@/components/PixelChest";
import { PixelFlower } from "@/components/brand/PixelArt";
import { Sparkles } from "@/components/Sparkles";
import { WaiverCheckbox } from "@/components/WaiverCheckbox";
import { readApiError } from "@/lib/api-error";

// Содержимое /cart. Клиентское целиком (нужен localStorage через
// useCart); metadata живёт в app/(site)/cart/layout.tsx.
//
// Лежит компонентом, а не страницей, с 2026-09-26: странице понадобилось
// знать, какой ключ Stripe стоит на сервере (плашка тест-режима), а
// клиентская страница секрета не прочтёт. Теперь page.tsx серверный и
// передаёт сюда ответ одним флагом.

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });


function formatCents(cents: number, currency = "EUR") {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

// Что покупатель получает за свои деньги. Вынесено отдельным списком не
// ради красоты: главный страх перед кнопкой «Checkout» — «а что придёт и
// когда». Текст обязан совпадать с реальностью (см. /api/stripe/webhook и
// /purchases): доступ появляется сразу после оплаты, файл — zip из бакета
// product-files, карту мы не видим вообще (Stripe Checkout — их домен).
// Зубчатый низ чека: 20 зубцов по 10px (clip-path, без картинки).
const RECEIPT_EDGE = `polygon(0 0,100% 0,100% calc(100% - 10px),${Array.from(
  { length: 20 },
  (_, i) => `${100 - i * 5 - 2.5}% 100%,${100 - (i + 1) * 5}% calc(100% - 10px)`
).join(",")})`;

const FACTS = [
  {
    Icon: Lightning,
    text: "Instant access: your maps appear in My purchases right after payment.",
  },
  { Icon: FileZip, text: "Downloads are .zip files, ready to drop into your saves folder." },
  { Icon: ShieldCheck, text: "Payment is handled by Stripe. Your card details never reach us." },
];

// stripeTestMode — плашка «демо, карта 4242». Решает сервер по ключу
// Stripe (см. cart/page.tsx), а не константа в коде: до 26.09 здесь
// стояло `const STRIPE_TEST_MODE = true` с пометкой «переключить при
// переходе на live», то есть ещё одно место, которое надо не забыть.
export function CartView({ stripeTestMode }: { stripeTestMode: boolean }) {
  const { items, removeItem, addItem, clear } = useCart();
  // Недоступные позиции (сняты, отклонены, автор без статуса) остаются в
  // корзине серыми — убирает их сам человек (решение владельца 04.11).
  // До этого их молча выбрасывал /api/checkout, и человек платил за
  // меньше карт, чем видел. В сумму, счётчик и чекаут идут только
  // доступные — разбор источника данных в CartAvailability.tsx.
  const isAvailable = useIsAvailable();
  const available = items.filter((i) => isAvailable(i.slug));
  const unavailableCount = items.length - available.length;
  const totalCents = available.reduce((sum, i) => sum + i.priceCents, 0);
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
  // Отказ от права на отзыв — только когда есть что оплачивать (см.
  // WaiverCheckbox). missing — нажали оплату без галочки.
  const [waiver, setWaiver] = useState(false);
  const [waiverMissing, setWaiverMissing] = useState(false);
  const needsWaiver = Boolean(user) && totalCents > 0;

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
    if (state === "loading" || available.length === 0) return;
    // Покупка требует аккаунта. Не залогинен — уводим на вход, а после
    // него обратно в корзину (?next=/cart). Сервер всё равно проверяет
    // это сам (401), тут — только удобство.
    if (!user) {
      router.push("/login?next=/cart");
      return;
    }
    if (needsWaiver && !waiver) {
      setWaiverMissing(true);
      return;
    }
    setLimitMessage(null);
    setState("loading");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Наружу уходят только slug'и — цену сервер снова берёт из БД, не
        // отсюда (см. AddToCartButton). Недоступные не отправляем: сервер
        // их всё равно отбросит, а так запрос совпадает с тем, что
        // человек видит в Order summary.
        body: JSON.stringify({ items: available.map((i) => ({ slug: i.slug })), waiver }),
      });
      // Сессия истекла между загрузкой страницы и оплатой — на вход.
      if (res.status === 401) {
        router.push("/login?next=/cart");
        return;
      }
      // 429 — единственный отказ, который надо объяснить словами: он не
      // сбой, он проходит сам через несколько минут, и «попробуйте
      // позже» без причины выглядит как поломка магазина.
      //
      // 409 — туда же: сервер отказался продавать уже купленную или
      // собственную карту и назвал её в message (аудит 2026-11, S-05).
      // Это тоже не сбой — человеку надо убрать позицию из корзины.
      if (res.status === 429 || res.status === 409) {
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
      // Убираем только полученное: недоступные остаются, пока человек
      // не уберёт их сам.
      if (data?.claimed) {
        available.forEach((i) => removeItem(i.slug));
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
        {/* Пустая корзина — открытый пустой сундук с искрами над
            заголовком (24.11, лаборатория, вариант КП1). Иконку тележки
            в заголовке владелец забраковал. */}
        {items.length === 0 && (
          <div className="relative mx-auto mb-6 size-32 sm:size-36">
            <Sparkles
              className="text-orange-400"
              sparks={[
                { top: "0%", left: "6%", size: 16, delay: 0 },
                { top: "8%", left: "84%", size: 12, delay: 1 },
                { top: "58%", left: "-6%", size: 10, delay: 2 },
                { top: "64%", left: "96%", size: 9, delay: 1.6 },
              ]}
            />
            <PixelChest className="size-full" />
          </div>
        )}
        <h1
          className={`${displayFont.className} text-center text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
        >
          {items.length === 0 ? "Your cart is empty" : "Your cart"}
        </h1>

        {/* Подпись — только когда есть что считать. У пустой корзины
            заголовок уже всё сказал. */}
        {items.length > 0 && (
          <p className="mt-3 text-center text-sm text-zinc-700 dark:text-zinc-300">
            {`${available.length} ${available.length === 1 ? "map" : "maps"} ready to download.`}
            {unavailableCount > 0 &&
              ` ${unavailableCount} ${unavailableCount === 1 ? "is" : "are"} no longer available.`}
          </p>
        )}

        {undo && (
          <div className="mx-auto mt-6 flex max-w-md items-center justify-between gap-3 rounded-full border border-zinc-200 bg-[#fbfbff] py-2 pl-5 pr-2 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <span className="min-w-0 truncate text-zinc-700 dark:text-zinc-300">{undo.label}</span>
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
                className="cursor-pointer rounded-full p-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
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
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              Pick a map from the marketplace, or start with the free ones. They download exactly the
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
                  <span className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {text}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-xs text-zinc-600 dark:text-zinc-300">
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
                {items.map((item) => {
                  const unavailable = !isAvailable(item.slug);
                  return (
                  <li
                    key={item.slug}
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200 bg-[#fbfbff] p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-nowrap"
                  >
                    {/* Недоступная — без ссылок: страница карты всё равно
                        ответит 404, и клик вёл бы в тупик. Серая картинка
                        и приглушённый текст, но корзина (кнопка удаления)
                        остаётся живой — серым красится товар, а не
                        действие над ним. Серый, а не красный: это не
                        ошибка покупателя и не отказ ему (DESIGN.md → Red). */}
                    {unavailable ? (
                      <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          sizes="128px"
                          className="object-cover opacity-50 grayscale"
                        />
                      </div>
                    ) : (
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
                    )}

                    <div className="min-w-0 flex-1">
                      {unavailable ? (
                        <span className="font-semibold text-zinc-400 dark:text-zinc-500">
                          {item.title}
                        </span>
                      ) : (
                        <Link
                          href={`/marketplace/${item.slug}`}
                          className="font-semibold text-zinc-950 hover:underline dark:text-zinc-50"
                        >
                          {item.title}
                        </Link>
                      )}
                      {unavailable ? (
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                          <span className="rounded-full bg-zinc-200 px-2 py-0.5 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            Unavailable
                          </span>
                          This map was taken down. It won&apos;t be included in your order.
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                          Digital download · one-time purchase
                        </p>
                      )}
                    </div>

                    <p
                      className={`w-20 shrink-0 text-right font-semibold ${
                        unavailable
                          ? "text-zinc-400 line-through dark:text-zinc-500"
                          : "text-zinc-950 dark:text-zinc-50"
                      }`}
                    >
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
                      className="flex shrink-0 cursor-pointer items-center justify-center text-zinc-500 hover:text-red-600 dark:text-zinc-400 pointer-coarse:h-11 pointer-coarse:w-11 dark:hover:text-red-400"
                    >
                      <Trash size={18} />
                    </button>
                  </li>
                  );
                })}
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
              <div>
                {/* Сводка — чеком (24.11, лаборатория, варианты КЗ1+КЗ2:
                    строки с крупными фото слева, чек справа). Позиции с
                    пунктиром до цены, итог за пунктирной чертой, зубчатый
                    низ. Галочка, кнопка оплаты и сообщения — под чеком,
                    логика прежняя. */}
                {/* Тень — фильтром на обёртке: clip-path режет box-shadow и
                    ring у самого чека, и в тёмной теме оставались обрубки
                    рамки (владелец 24.11). drop-shadow повторяет зубцы.
                    Бумага тёплая: кремовая днём, графитовая ночью. */}
                <div className="drop-shadow-[0_8px_18px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)]">
                <div
                  className="bg-[#fffaf0] px-6 pb-9 pt-6 dark:bg-zinc-800"
                  style={{ clipPath: RECEIPT_EDGE }}
                >
                  <div className="flex items-center gap-2">
                    <PixelFlower palette="orange" className="size-7" />
                    <h2 className="font-extrabold text-zinc-950 dark:text-zinc-50">Order summary</h2>
                  </div>

                  <ul className="mt-5 space-y-2.5 font-mono text-sm">
                    {available.map((item) => (
                      <li key={item.slug} className="flex items-baseline gap-2 text-zinc-900 dark:text-zinc-100">
                        <span className="truncate">{item.title}</span>
                        <span aria-hidden className="min-w-4 flex-1 border-b border-dotted border-zinc-400 dark:border-zinc-500" />
                        <span className="shrink-0">{item.priceCents === 0 ? "FREE" : formatCents(item.priceCents)}</span>
                      </li>
                    ))}
                    <li className="flex items-baseline gap-2 text-zinc-700 dark:text-zinc-300">
                      <span>Taxes</span>
                      <span aria-hidden className="min-w-4 flex-1 border-b border-dotted border-zinc-400 dark:border-zinc-500" />
                      <span className="shrink-0">at checkout</span>
                    </li>
                  </ul>

                  <div className="mt-5 flex items-baseline justify-between border-t-2 border-dashed border-zinc-300 pt-4 font-mono dark:border-zinc-600">
                    <span className="font-bold text-zinc-950 dark:text-zinc-50">TOTAL</span>
                    <span className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-50">
                      {formatCents(totalCents)}
                    </span>
                  </div>
                </div>
                </div>

                {/* Галочка — прямо над кнопкой: согласие даётся в момент
                    оплаты, а не где-то выше на странице. */}
                {needsWaiver && (
                  <div className="mt-6">
                    <WaiverCheckbox
                      checked={waiver}
                      onChange={(v) => {
                        setWaiver(v);
                        if (v) setWaiverMissing(false);
                      }}
                      missing={waiverMissing}
                    />
                  </div>
                )}

                <Button
                  size="lg"
                  onClick={checkout}
                  // Всё в корзине недоступно — оплачивать нечего. Раньше
                  // такой запрос уходил на сервер и возвращался 404,
                  // а человек видел «Something went wrong».
                  disabled={available.length === 0}
                  className={`${needsWaiver ? "mt-4" : "mt-6"} w-full`}
                >
                  {/* Надпись честно называет то, что произойдёт: у
                      корзины из одних бесплатных карт не будет ни
                      перехода к оплате, ни самой оплаты. */}
                  {available.length === 0
                    ? "Nothing to check out"
                    : state === "loading"
                    ? totalCents === 0
                      ? "Getting your maps…"
                      : "Redirecting…"
                    : !user
                      ? "Sign in to continue"
                      : totalCents === 0
                        ? "Get for free"
                        : "Checkout"}
                </Button>

                {/* Ссылки на условия — у самой кнопки, а не только в футере
                    (аудит 25.09, docs/STRIPE.md → Legal). Человек должен
                    видеть, на что соглашается, в момент согласия. Отказ
                    от права на отзыв — отдельной галочкой выше (26.09). */}
                <p className="mt-3 text-center text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                  By continuing you agree to our{" "}
                  <Link href="/terms" className="underline underline-offset-2 hover:text-zinc-950 dark:hover:text-zinc-50">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline underline-offset-2 hover:text-zinc-950 dark:hover:text-zinc-50">
                    Privacy Policy
                  </Link>
                  .
                </p>

                {state === "error" && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                    Something went wrong, please try again.
                  </p>
                )}

                {limitMessage && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                    {limitMessage}
                  </p>
                )}

                {stripeTestMode && (
                  <p className="mt-4 rounded-xl bg-orange-50 px-4 py-3 text-xs leading-relaxed text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                    Demo marketplace: Stripe is in test mode. Use card 4242 4242 4242 4242 with any future
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
                      <span className="text-zinc-700 dark:text-zinc-300">{text}</span>
                    </li>
                  ))}
                  <li className="flex gap-2.5 text-xs leading-relaxed">
                    <Lifebuoy
                      size={16}
                      weight="bold"
                      className="mt-0.5 shrink-0 text-orange-500 dark:text-orange-400"
                    />
                    <span className="text-zinc-700 dark:text-zinc-300">
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
