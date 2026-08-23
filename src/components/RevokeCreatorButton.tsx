"use client";

import { useState } from "react";
import { useRefresh } from "@/lib/useRefresh";
import { Prohibit } from "@phosphor-icons/react";
import { Button, BUTTON_PILL, BUTTON_COLORS } from "@/components/Button";
import { REVOCATION_TEMPLATES, buildReasonMessage } from "@/lib/rejection";

// Забрать статус креатора — с обязательной причиной из шаблонов.
//
// Причина здесь не формальность: человек в один момент теряет и загрузку,
// и витрину — все его живые карты уходят вместе со статусом, — а
// единственное, что он об этом узнает, это её текст в уведомлении.
// Поэтому окно, а не кнопка «Revoke» в один клик; заодно случайное
// нажатие рядом с чужим именем в списке ничего не ломает.
//
// Чек-боксы, а не пустое поле (по просьбе владельца 2026-08-14, тем же
// приёмом, что у отказа и у снятия карты). Причина в том, что писать
// такой текст руками приходится в момент раздражения — и получается либо
// сухое «нарушение правил», из которого человеку нечего понять, либо
// лишнее. Готовая формулировка держит тон ровным и одинаковым от раза к
// разу, а приписка остаётся для частностей.
export function RevokeCreatorButton({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const refresh = useRefresh();
  const [asking, setAsking] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reason = buildReasonMessage(REVOCATION_TEMPLATES, codes, note);

  function reset() {
    setAsking(false);
    setCodes([]);
    setNote("");
    setError(null);
  }

  async function revoke() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", userId, reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          data?.error === "already handled"
            ? "They're not a creator anymore."
            : (data?.message ?? "Could not remove the status.")
        );
        return;
      }
      reset();
      refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className={`${BUTTON_PILL} ${BUTTON_COLORS.secondary}`}
      >
        <Prohibit size={16} weight="bold" />
        Revoke
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Why is {username} losing creator access?
      </p>
      {/* Что произойдёт — до кнопки, а не после. Раньше здесь стояло
          «карты остаются на витрине, снимайте отдельно»; теперь всё
          наоборот, и молча поменять последствие было бы худшим из
          вариантов. */}
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Their maps come off the marketplace with the status and go back up if
        they get it again. Buyers keep the files they paid for.
      </p>

      <div className="mt-3 space-y-1">
        {REVOCATION_TEMPLATES.map((template) => (
          <label
            key={template.code}
            className="flex cursor-pointer items-start gap-2.5 rounded-xl px-2 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-950/[0.04] dark:text-zinc-300 dark:hover:bg-zinc-50/[0.05]"
          >
            <input
              type="checkbox"
              checked={codes.includes(template.code)}
              onChange={() =>
                setCodes((current) =>
                  current.includes(template.code)
                    ? current.filter((c) => c !== template.code)
                    : [...current, template.code]
                )
              }
              className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500"
            />
            {template.label}
          </label>
        ))}
      </div>

      <label
        htmlFor={`revoke-note-${userId}`}
        className="mt-3 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
      >
        Anything to add (optional)
      </label>
      <textarea
        id={`revoke-note-${userId}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="mt-1 w-full rounded-xl border border-zinc-950/[0.08] px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:bg-zinc-900"
      />

      {/* Предпросмотр ровно того, что придёт человеку: собранный из
          пунктов текст читается иначе, чем каждый пункт по отдельности. */}
      {reason && (
        <p className="mt-3 whitespace-pre-line rounded-xl bg-zinc-950/[0.04] px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-50/[0.05] dark:text-zinc-400">
          {reason}
        </p>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <Button variant="tertiary" size="sm" onClick={reset}>
          Cancel
        </Button>
        <button
          type="button"
          disabled={busy || reason.trim().length === 0}
          onClick={revoke}
          className={`${BUTTON_PILL} ${BUTTON_COLORS.primary} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          Remove creator status
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
