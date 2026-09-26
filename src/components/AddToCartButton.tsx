"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle, Info, ArrowRight } from "@phosphor-icons/react";
import { Button, TERTIARY_UNDERLINE } from "@/components/Button";
import { useCart, type CartItem } from "@/lib/cart-context";
import { readApiError } from "@/lib/api-error";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { WaiverCheckbox } from "@/components/WaiverCheckbox";

// Кнопка на странице товара. Оформление заказа — только через /cart,
// даже для одной покупки: один путь чекаута проще двух.
//
// ПОЧЕМУ КНОПКА ВСЕГДА ОДНА И ТА ЖЕ (решение владельца 2026-07-27).
// Страница статическая — один HTML на всех. Ни «что в корзине» (это
// localStorage), ни «куплено ли уже» (это сессия) сервер знать не может,
// поэтому любая надпись, зависящая от этих данных, обязана меняться
// ПОСЛЕ загрузки: сперва мелькает нейтральное состояние, потом
// подставляется настоящее. Прошлая версия из-за этого имела и мелькание,
// и настоящий баг — владелец карты успевал нажать «Add to cart» на уже
// купленном товаре, пока шла проверка.
//
// Поэтому надпись убрана из зависимостей вовсе: кнопка ВСЕГДА «Add to
// cart — €X» и всегда активна, а вся разница состояний переехала в
// РЕЗУЛЬТАТ клика — всплывающее сообщение под кнопкой. Первый кадр
// статики сразу верен, менять его нечему, и нажать «не то» невозможно:
// на момент клика ответ уже есть (а если ещё нет — клик его дожидается).
type Ownership = "unknown" | "no" | "yes";

type Notice = {
  tone: "success" | "info";
  text: string;
  href?: string;
  linkLabel?: string;
};

// Сколько сообщение висит перед автоскрытием. Достаточно, чтобы прочесть
// и успеть кликнуть ссылку, но не настолько, чтобы мозолить глаза.
const NOTICE_MS = 6000;

export function AddToCartButton({
  product,
  productId,
}: {
  product: CartItem;
  productId: string;
}) {
  const { items, addItem } = useCart();
  const [notice, setNotice] = useState<Notice | null>(null);
  // «Покупаю прямо сейчас» — пока идёт создание сессии Stripe и переход
  // на неё. Своё состояние, а не общее с корзиной: добавление в корзину
  // мгновенно, а этот путь уходит в сеть и может не вернуться.
  const [buying, setBuying] = useState(false);

  // Отказ по частоте — отдельно от Notice, и это разделение по смыслу, а
  // не по оформлению: Notice сообщает исход («добавлено», «уже ваше»),
  // а здесь живёт причина, по которой исхода НЕ БЫЛО. Живёт до
  // следующей попытки: автоскрытие Notice тут вредно — человек читает
  // «через сколько», а не «что случилось».
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  // Отказ от права на отзыв для «Buy now» (2026-09-26). Тот же, что в
  // корзине: путь оплаты один, согласие тоже одно. Галочка появляется
  // только после первого нажатия Buy now — до этого она мешала бы тем,
  // кто пришёл положить карту в корзину, а согласие нужно ровно в
  // момент оплаты.
  const [waiver, setWaiver] = useState(false);
  const [askWaiver, setAskWaiver] = useState(false);

  // Ответ проверки владения и сам «запрос в полёте». Держим в ref, а не в
  // состоянии: перерисовывать из-за них нечего (кнопка не меняется), а
  // обработчику клика нужно уметь дождаться того же самого запроса,
  // который уже начался при монтировании, а не слать второй.
  const ownership = useRef<Ownership>("unknown");
  const pending = useRef<Promise<Ownership> | null>(null);

  // Проверка владения — на клиенте: «куплено ли» зависит от того, кто
  // смотрит. getSession() читает сессию из локального хранилища мгновенно
  // (getUser() ходил бы в сеть); сам ответ про покупку всё равно даёт
  // сервер — security-definer has_purchased под RLS. Аноним ничего не
  // купил, его не спрашиваем. Ошибка RPC (например, миграции ещё нет) —
  // считаем «не куплено»: ломать покупку из-за недоступной проверки хуже,
  // чем пропустить дубль.
  const checkOwnership = (): Promise<Ownership> => {
    if (ownership.current !== "unknown") return Promise.resolve(ownership.current);
    if (pending.current) return pending.current;

    pending.current = (async () => {
      const supabase = createSupabaseBrowser();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      let result: Ownership = "no";
      if (session) {
        const { data, error } = await supabase.rpc("has_purchased", {
          p_product_id: productId,
        });
        result = !error && data === true ? "yes" : "no";
      }
      ownership.current = result;
      return result;
    })();

    return pending.current;
  };

  // Стартуем проверку заранее, чтобы к моменту клика ответ обычно уже был
  // и сообщение появлялось мгновенно.
  useEffect(() => {
    ownership.current = "unknown";
    pending.current = null;
    void checkOwnership();
    // productId — единственное, от чего зависит проверка.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // Автоскрытие сообщения. Таймер перезапускается на каждое новое
  // сообщение и снимается при размонтировании.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleClick = async () => {
    const owned = await checkOwnership();

    if (owned === "yes") {
      setNotice({
        tone: "info",
        text: "You already own this map.",
        href: "/purchases",
        linkLabel: "Download it",
      });
      return;
    }

    // items читаем здесь, а не в рендере: в рендере это снова была бы
    // зависимость от localStorage, то есть снова расхождение с
    // серверным HTML.
    if (items.some((i) => i.slug === product.slug)) {
      setNotice({
        tone: "info",
        text: "Already in your cart.",
        href: "/cart",
        linkLabel: "View cart",
      });
      return;
    }

    addItem(product);
    setNotice({
      tone: "success",
      text: "Added to cart.",
      href: "/cart",
      linkLabel: "View cart",
    });
  };

  // Покупка одной картой, мимо корзины.
  //
  // Тот же самый роут /api/checkout, что и у корзины, — просто с одной
  // позицией. Заводить ради этого второй путь оплаты было бы худшим из
  // возможных решений: денежный путь должен быть ОДИН, иначе проверять и
  // чинить придётся два, и однажды они разойдутся.
  //
  // Наружу уходит ТОЛЬКО slug. Цену, название и валюту сервер берёт из
  // своей базы — принимать их отсюда значило бы дать любому посетителю
  // купить карту за €0.01 через инструменты разработчика.
  const buyNow = async () => {
    if (buying) return;
    // Бесплатной карте согласие не нужно — возвращать нечего.
    if (product.priceCents > 0 && !waiver) {
      setAskWaiver(true);
      return;
    }
    setBuying(true);
    setLimitMessage(null);

    // Уже купленную не даём купить второй раз — та же проверка, что у
    // добавления в корзину, и по той же причине.
    const owned = await checkOwnership();
    if (owned === "yes") {
      setBuying(false);
      setNotice({
        tone: "info",
        text: "You already own this map.",
        href: "/purchases",
        linkLabel: "Download it",
      });
      return;
    }

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ slug: product.slug }], waiver }),
      });

      // Покупка требует аккаунта. Сессия могла истечь между открытием
      // страницы и нажатием — возвращаем сюда же после входа.
      if (response.status === 401) {
        window.location.assign(
          `/login?next=${encodeURIComponent(`/marketplace/${product.slug}`)}`
        );
        return;
      }
      // 429 — не сбой, а «слишком часто»: объясняем словами и оставляем
      // кнопку рабочей, чтобы человек мог повторить через пару минут.
      //
      // ⚠️ НЕ через Notice, хотя он рядом и напрашивается (правка 25.08 по
      // отчёту). Notice здесь говорит «всё хорошо, вот что произошло» —
      // «добавлено в корзину», «вы уже владеете картой». Отказ в том же
      // оранжевом окошке читается как ещё одна такая новость. А главное,
      // это ТОТ ЖЕ отказ от того же /api/checkout, который на странице
      // корзины показан красным: один смысл обязан выглядеть одинаково
      // независимо от того, с какой кнопки человек начал.
      if (response.status === 429) {
        const { message } = await readApiError(response);
        setBuying(false);
        setLimitMessage(message ?? "Too many attempts. Try again in a few minutes.");
        return;
      }
      if (!response.ok) throw new Error(`checkout failed: ${response.status}`);

      const data = await response.json();

      // Бесплатная карта до Stripe не доходит: сервер записал заказ сам.
      // Уводим в «My purchases» — там же, где лежат все остальные карты
      // человека, и там же работает уже проверенная выдача файла.
      if (data?.claimed) {
        window.location.assign("/purchases");
        return;
      }

      const { url } = data;
      // Проверяем, куда нас отправляют, хотя адрес пришёл от нашего же
      // сервера: window.location.assign уводит человека куда угодно, и
      // единственная проверка на этом пути — вот эта.
      if (typeof url !== "string" || !url.startsWith("https://")) {
        throw new Error("checkout returned no url");
      }
      window.location.assign(url);
    } catch (e) {
      console.error("Не удалось начать оплату:", e);
      setBuying(false);
      setNotice({
        tone: "info",
        text: "Couldn't start the checkout. Please try again.",
      });
    }
  };

  // Бесплатность — свойство КАРТЫ, а не того, кто на неё смотрит:
  // priceCents приезжает с сервера вместе со страницей. Поэтому надпись
  // может от неё зависеть, не ломая статику, — в отличие от «что в
  // корзине» и «куплено ли», ради которых кнопка когда-то и стала
  // неизменной (см. комментарий вверху файла).
  const isFree = product.priceCents === 0;

  return (
    <div>
      {/* Цена из подписи убрана (решение владельца 2026-08-21): она стоит
          крупным шрифтом прямо над кнопкой, и повторять её значит
          удлинять кнопку ради того, что человек и так видит. */}
      {isFree ? (
        <>
          {/* У бесплатной карты главное действие — забрать её, а не
              положить в корзину: корзина существует, чтобы собрать
              несколько карт к одной оплате, а оплаты здесь не будет.
              Кнопка «Add to cart» остаётся второй — за бесплатной могут
              прийти заодно с платной. */}
          <Button
            size="lg"
            onClick={buyNow}
            disabled={buying}
            className="w-full"
          >
            {buying ? "Getting it…" : "Get it for free"}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={handleClick}
            className="mt-3 w-full"
          >
            Add to cart
          </Button>
        </>
      ) : (
        <>
          <Button size="lg" onClick={handleClick} className="w-full">
            Add to cart
          </Button>

          {/* Покупка одной кнопкой — вторичная намеренно. Основной путь у
              нас корзина: она позволяет докупить вторую карту и оформить
              всё одним заказом. «Buy now» для тех, кто пришёл за одной
              картой и не хочет лишнего шага. */}
          <Button
            size="lg"
            variant="secondary"
            onClick={buyNow}
            disabled={buying}
            className="mt-3 w-full"
          >
            {buying ? "Redirecting…" : "Buy now"}
          </Button>

          {askWaiver && (
            <div className="mt-3">
              <WaiverCheckbox checked={waiver} onChange={setWaiver} missing={!waiver} />
            </div>
          )}
        </>
      )}

      {/* min-h резервирует место под сообщение, чтобы его появление не
          сдвигало карточку с ценой и характеристиками. */}
      <div className="mt-3 min-h-[2.5rem]" aria-live="polite">
        {notice && (
          <div
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
              notice.tone === "success"
                ? "bg-lime-100 text-zinc-800 dark:bg-lime-900 dark:text-zinc-100"
                : "bg-orange-100 text-zinc-800 dark:bg-orange-900 dark:text-zinc-100"
            }`}
          >
            {notice.tone === "success" ? (
              <CheckCircle size={18} weight="fill" className="shrink-0" aria-hidden />
            ) : (
              <Info size={18} weight="fill" className="shrink-0" aria-hidden />
            )}
            <span>{notice.text}</span>
            {notice.href && (
              // Стрелка — иконка Phosphor, и подчёркнут только текст:
              // символ `→` внутри подчёркнутой ссылки собирал черту и под
              // собой (см. TERTIARY_UNDERLINE в Button.tsx — там же
              // разобрано, почему цвет и черта разделены).
              // Без data-page-transition: эта плашка живёт на странице
              // карты, а внутри магазина волны нет. Ссылки ведут в
              // /purchases и /cart — обе магазинные, так что условия
              // здесь не нужно, нужно отсутствие атрибута.
              <Link
                href={notice.href}
                className="group ml-auto flex shrink-0 items-center gap-1.5 font-semibold text-orange-700 dark:text-orange-300"
              >
                <span className={TERTIARY_UNDERLINE}>{notice.linkLabel}</span>
                <ArrowRight
                  size={14}
                  weight="bold"
                  className="transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Тот же вид, что у отказа на /cart: text-sm text-red-600 +
          role="alert". Один смысл — одно оформление. */}
      {limitMessage && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {limitMessage}
        </p>
      )}
    </div>
  );
}
