"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle, Info } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { useCart, type CartItem } from "@/lib/cart-context";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

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

  return (
    <div>
      <Button size="lg" onClick={handleClick}>
        Add to cart — {product.price}
      </Button>

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
              <Link
                href={notice.href}
                data-page-transition="true"
                className="ml-auto shrink-0 font-semibold text-orange-700 underline decoration-2 underline-offset-4 dark:text-orange-300"
              >
                {notice.linkLabel} →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
