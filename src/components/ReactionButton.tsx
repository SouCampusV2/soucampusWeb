"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

// Кнопка реакции на странице карты — рядом с «Add to cart».
//
// ПОЧЕМУ СОСТОЯНИЕ ДОГРУЖАЕТСЯ, А НЕ ПРИХОДИТ С СЕРВЕРА. Страница карты
// статическая, один HTML на всех: сервер не может знать ни того, нажимал
// ли ЭТОТ человек, ни свежего числа — оно меняется чаще, чем страница
// пересобирается. Начальное число приходит с сервера (оно было верным на
// момент сборки), а «нажимал ли я» и поправка счётчика подтягиваются
// после загрузки. Тот же приём и та же причина, что у AddToCartButton.
//
// ⚠️ Оптимистичное обновление здесь СОЗНАТЕЛЬНО. Число меняется в тот же
// кадр, что и нажатие, а запрос уходит следом; если он не прошёл —
// откатываем. Реакция должна отзываться мгновенно, иначе по ней жмут
// второй раз, решив, что не сработало.

export function ReactionButton({
  productId,
  emoji,
  imageUrl,
  label,
  initialCount,
}: {
  productId: string;
  emoji: string;
  /** Картинка 24×24; null — показываем emoji. */
  imageUrl: string | null;
  label: string;
  /** Число на момент сборки страницы. Уточняется после загрузки. */
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [mine, setMine] = useState(false);
  // Пока не знаем, вошёл ли человек и нажимал ли он: кнопка неактивна.
  // Иначе первый клик уходил бы в никуда — или, хуже, ставил реакцию
  // второй раз, потому что о первой мы ещё не знаем.
  const [ready, setReady] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      const supabase = createSupabaseBrowser();

      // getSession, а не getUser: читает сессию из локального хранилища
      // мгновенно, без похода по сети. Права всё равно проверяет база
      // (политики insert/delete own reaction) — здесь это только про то,
      // что показать.
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id ?? null;

      const [{ count: fresh }, own] = await Promise.all([
        supabase
          .from("product_reactions")
          .select("*", { count: "exact", head: true })
          .eq("product_id", productId),
        userId
          ? supabase
              .from("product_reactions")
              .select("user_id")
              .eq("product_id", productId)
              .eq("user_id", userId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (!alive) return;
      if (typeof fresh === "number") setCount(fresh);
      setMine(Boolean(own.data));
      setReady(Boolean(userId));
    })();

    return () => {
      alive = false;
    };
  }, [productId]);

  async function toggle() {
    if (busy.current) return;
    busy.current = true;

    const next = !mine;
    // Оптимистично — см. комментарий вверху.
    setMine(next);
    setCount((c) => c + (next ? 1 : -1));

    const supabase = createSupabaseBrowser();
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    const { error } = userId
      ? next
        ? await supabase
            .from("product_reactions")
            .insert({ product_id: productId, user_id: userId })
        : await supabase
            .from("product_reactions")
            .delete()
            .eq("product_id", productId)
            .eq("user_id", userId)
      : { error: new Error("no session") };

    if (error) {
      // Откат: показанное число должно совпадать с тем, что в базе, даже
      // если человек об этом не узнает.
      setMine(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
    busy.current = false;
  }

  // Гостю кнопка видна, но не нажимается: показать, что реакции есть, и
  // сколько их, — полезно; предлагать действие, которое база отвергнет,
  // — нет. Подсказка объясняет, почему.
  //
  // busy сюда НЕ входит, хотя напрашивается: читать ref во время
  // отрисовки нельзя (React об этом и предупреждает), а главное — не
  // нужно. Запрос уходит после того, как число уже изменилось на экране,
  // и гасить кнопку на это время значило бы моргать ею на каждый клик.
  // От двойного нажатия защищает сам обработчик.
  const disabled = !ready;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-pressed={mine}
      aria-label={
        mine ? `Remove your ${label} reaction` : `React with ${label}`
      }
      title={ready ? label : "Sign in to react"}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
        mine
          ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300"
          : "border-zinc-950/[0.08] text-zinc-700 hover:border-zinc-400 dark:border-zinc-50/[0.08] dark:text-zinc-300 dark:hover:border-zinc-600"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      {/* aria-hidden у обоих: смысл несёт aria-label кнопки, и средство
          чтения не должно проговаривать реакцию дважды.

          Обычный <img>, а не next/image: реакции — маленькие гифки, а
          Next их не оптимизирует (анимацию он бы убил) и требовал бы
          прописывать домен в remotePatterns. Для картинки 24×24 это
          цена без выгоды. Тот же довод, что у аватаров. */}
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          width={24}
          height={24}
          aria-hidden
          className="h-6 w-6 shrink-0 object-contain"
        />
      ) : (
        <span aria-hidden className="text-base leading-none">
          {emoji}
        </span>
      )}
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
