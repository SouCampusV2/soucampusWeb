"use client";

import { useState } from "react";
import { Trash } from "@phosphor-icons/react";
import { useRefresh } from "@/lib/useRefresh";
import { readApiError } from "@/lib/api-error";

// Кнопка «удалить комментарий» в админке.
//
// Через свой роут /api/admin/comments, а не запросом в базу из браузера:
// «владелец сайта» — это роль, а не отношение к строке, и знает о ней
// только сервер. Разбор — в самом роуте.
//
// Подтверждение простое (confirm), без модального окна с вводом названия,
// как у удаления карты. Разница по цене ошибки: карту удаляют насовсем и
// у неё есть покупатели, а комментарий помечается и восстанавливается
// правкой одного поля.

export function AdminCommentActions({ commentId }: { commentId: string }) {
  const refresh = useRefresh();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!confirm("Remove this comment?")) return;

    setPending(true);
    setError(null);
    const response = await fetch("/api/admin/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
    setPending(false);

    if (response.ok) {
      refresh();
      return;
    }

    // Молчаливый отказ здесь выглядит как сломанная кнопка: комментарий
    // остаётся на месте, и понять почему неоткуда.
    //
    // ⚠️ ЗДЕСЬ СТОЯЛ alert(), и его убрали 25.08 не ради красоты. Диалог
    // браузера можно ЗАГЛУШИТЬ НАВСЕГДА: после нескольких подряд браузер
    // предлагает «запретить этой странице создавать диалоги», и человек,
    // однажды согласившийся, возвращается ровно в то состояние, которое
    // мы чинили 23.08 — кнопка молча не срабатывает, следов нет. Способ
    // сообщить об отказе не должен уметь отключаться мимо нас.
    //
    // Остальное — то же, что везде: отказ красным, рядом с действием,
    // role="alert" для чтения с экрана.
    const { message } = await readApiError(response);
    setError(message ?? "Could not remove the comment.");
  }

  return (
    // Сообщение стоит СЛЕВА от иконки, а не под ней: строка списка узкая
    // и уже занята ссылкой на карту, а места справа от неё достаточно.
    // Под иконкой оно ломало бы высоту строки, и список «прыгал» бы при
    // каждом отказе.
    <div className="flex shrink-0 items-center gap-2">
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label="Remove comment"
        title="Remove comment"
        className="text-zinc-400 transition hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
      >
        <Trash size={16} />
      </button>
    </div>
  );
}
