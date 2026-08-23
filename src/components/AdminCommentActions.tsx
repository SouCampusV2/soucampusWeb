"use client";

import { useState } from "react";
import { Trash } from "@phosphor-icons/react";
import { useRefresh } from "@/lib/useRefresh";

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

  async function remove() {
    if (!confirm("Remove this comment?")) return;

    setPending(true);
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
    // остаётся на месте, и понять почему неоткуда. Отдельного места под
    // текст в этой кнопке нет, поэтому alert — он же и останавливает
    // серию нажатий подряд.
    const data = await response.json().catch(() => null);
    alert(data?.message ?? "Could not remove the comment.");
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      aria-label="Remove comment"
      title="Remove comment"
      className="shrink-0 text-zinc-400 transition hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
    >
      <Trash size={16} />
    </button>
  );
}
