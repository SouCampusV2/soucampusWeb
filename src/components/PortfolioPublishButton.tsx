"use client";

import { useState } from "react";
import { useRefresh } from "@/lib/useRefresh";
import { readApiError } from "@/lib/api-error";
import { INLINE_LINK } from "@/components/Button";

// Publish / Unpublish у работы в /admin/portfolio (2026-11-12).
//
// Без окна подтверждения, в отличие от удаления: действие обратимо той же
// кнопкой, и ошибка стоит минуту видимости, а не потерю данных.
//
// Запрос — в /api/admin/portfolio, а не в базу из браузера: писать в
// projects может только служебный ключ. Там же работа при публикации
// встаёт первой в списке.
export function PortfolioPublishButton({
  slug,
  published,
}: {
  slug: string;
  published: boolean;
}) {
  const refresh = useRefresh();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/admin/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", slug, published: !published }),
    });
    setPending(false);
    if (response.ok) {
      refresh();
      return;
    }
    // Отказ — красным рядом с кнопкой, не alert(): тот браузер позволяет
    // заглушить навсегда (подробно — AdminCommentActions).
    const { message } = await readApiError(response);
    setError(message ?? "Couldn't change the work.");
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`font-medium disabled:opacity-50 ${INLINE_LINK}`}
      >
        {pending ? "Saving…" : published ? "Unpublish" : "Publish"}
      </button>
    </span>
  );
}
