"use client";

import { useState } from "react";
import { useRefresh } from "@/lib/useRefresh";
import { Check, X } from "@phosphor-icons/react";
import { Button, BUTTON_PILL, BUTTON_COLORS } from "@/components/Button";
import { readApiError } from "@/lib/api-error";

// Решение по заявке на креаторство: одобрить или отказать с причиной.
//
// Отказ через окно с текстом, а не кнопкой: человек рассказал о себе и
// ждёт ответа, и «нет» без объяснения он прочитает как «нас тут не ждут».
// Тот же принцип, что у отказа по карте.
export function ApplicationActions({ applicationId }: { applicationId: string }) {
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(action: "approve" | "reject") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          action,
          ...(action === "reject" ? { reason } : {}),
        }),
      });
      if (!res.ok) {
        // Ветвимся по КОДУ, а не по тексту: текст обработчика может
        // измениться, код — это договор. Ровно поэтому readApiError
        // возвращает разобранное, а не готовую строку.
        const { code, message } = await readApiError(res);
        setError(
          code === "already handled"
            ? "Someone already decided this one."
            : // Приём авторов заморожен (src/lib/flags.ts). Говорим
              // прямо, что дело не в заявке и не в сбое: иначе владелец
              // будет жать ещё раз и искать поломку.
              code === "creator signups are frozen"
              ? "Creator signups are frozen — this one has to wait."
              : (message ?? "Could not save the decision.")
        );
        return;
      }
      refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      {!asking ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => run("approve")}
            className={`${BUTTON_PILL} ${BUTTON_COLORS.primary}`}
          >
            <Check size={16} weight="bold" />
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setAsking(true)}
            className={`${BUTTON_PILL} ${BUTTON_COLORS.secondary}`}
          >
            <X size={16} weight="bold" />
            Reject
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            What should they know?
          </label>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            They see this text, and they can apply again after fixing it.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-zinc-950/[0.08] px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:bg-zinc-900"
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => {
                setAsking(false);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <button
              type="button"
              disabled={busy || reason.trim().length === 0}
              onClick={() => run("reject")}
              className={`${BUTTON_PILL} ${BUTTON_COLORS.primary} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              Send rejection
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
