"use client";

import { useState } from "react";
import { useRefresh } from "@/lib/useRefresh";
import { Check, X } from "@phosphor-icons/react";
import { BUTTON_COLORS, BUTTON_PILL, DANGER_COLORS } from "@/components/Button";
import { REJECTION_TEMPLATES, buildRejectionMessage } from "@/lib/rejection";
import { readApiError } from "@/lib/api-error";

// Кнопки разбора одной заявки. Клиентский компонент — потому что здесь
// живёт состояние формы отказа; само решение принимает сервер
// (/api/admin/moderation), который заново проверяет права. Отсюда нельзя
// опубликовать карту, даже подделав запрос: публикация идёт служебным
// ключом только внутри обработчика.
export function ModerationActions({ productId }: { productId: string }) {
  const refresh = useRefresh();
  const [pending, setPending] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  // Выбранные пункты («что не так») и произвольная приписка. Итоговый
  // текст для автора собирается из них в buildRejectionMessage — так
  // формулировки одинаковы у всех отказов, а модератор не переписывает
  // одно и то же руками каждый раз.
  const [flags, setFlags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function toggleFlag(flag: string) {
    setFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  }

  async function send(action: "approve" | "reject") {
    setError(null);
    setPending(true);

    const reason =
      action === "reject" ? buildRejectionMessage(flags, note) : "";

    const response = await fetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, action, reason, flags }),
    });

    setPending(false);

    if (!response.ok) {
      const { code, message } = await readApiError(response);
      // 409 — карту уже разобрали в другой вкладке. Это не ошибка
      // пользователя, а гонка; обновляем список, чтобы он показал правду.
      if (response.status === 409) {
        refresh();
        setError("This map was already handled — refreshing the queue.");
        return;
      }
      setError(message ?? code ?? "Something went wrong.");
      return;
    }

    // Заявка ушла из очереди — перечитываем серверные данные страницы.
    refresh();
  }

  if (rejecting) {
    // Отказ можно отправить, только если что-то выбрано или написано:
    // пустой вердикт бесполезен автору и всё равно отклонится сервером.
    const canSubmit = flags.length > 0 || note.trim().length > 0;

    return (
      <div className="mt-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          What needs fixing?{" "}
          <span className="font-normal text-zinc-500 dark:text-zinc-400">
            — the creator sees this as a checklist
          </span>
        </span>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {REJECTION_TEMPLATES.map((template) => {
            const checked = flags.includes(template.flag);
            return (
              <button
                key={template.flag}
                type="button"
                onClick={() => toggleFlag(template.flag)}
                className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                  checked
                    ? "border-orange-500 bg-orange-50 text-zinc-950 dark:border-orange-400 dark:bg-orange-950/30 dark:text-zinc-50"
                    : "border-zinc-950/[0.08] text-zinc-600 hover:border-orange-500 dark:border-zinc-50/[0.08] dark:text-zinc-400 dark:hover:border-orange-400"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    checked
                      ? "border-orange-500 bg-orange-500 text-zinc-950 dark:border-orange-400 dark:bg-orange-400"
                      : "border-zinc-400 dark:border-zinc-600"
                  }`}
                >
                  {checked && <Check size={11} weight="bold" />}
                </span>
                <span>
                  {template.label}
                  {/* Пункты, замену по которым мы РЕАЛЬНО проверим при
                      повторной отправке, помечаем — модератор должен
                      понимать разницу между «попросил» и «проверим». */}
                  {template.requiresChange && (
                    <span className="ml-1 text-xs text-orange-600 dark:text-orange-400">
                      (enforced)
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <label
          htmlFor={`note-${productId}`}
          className="mt-4 mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Anything else{" "}
          <span className="font-normal text-zinc-500 dark:text-zinc-400">
            — optional, added under the list
          </span>
        </label>
        <textarea
          id={`note-${productId}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Specific to this map…"
          className="w-full resize-y rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />

        {/* Предпросмотр — модератор видит ровно тот текст, который
            получит автор, а не догадывается по галочкам. */}
        {(flags.length > 0 || note.trim()) && (
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-zinc-950/[0.03] px-4 py-3 text-xs text-zinc-600 dark:bg-zinc-50/[0.04] dark:text-zinc-400">
            {buildRejectionMessage(flags, note)}
          </pre>
        )}

        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => send("reject")}
            disabled={pending || !canSubmit}
            className={`${BUTTON_PILL} ${DANGER_COLORS.solid}`}
          >
            {pending ? "Rejecting…" : "Send rejection"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRejecting(false);
              setFlags([]);
              setNote("");
              setError(null);
            }}
            className={`${BUTTON_PILL} text-zinc-600 hover:bg-zinc-950/[0.05] dark:text-zinc-400 dark:hover:bg-zinc-50/[0.06]`}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {error && (
        <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => send("approve")}
          disabled={pending}
          className={`${BUTTON_PILL} ${BUTTON_COLORS.primary}`}
        >
          <Check size={16} weight="bold" />
          {pending ? "Publishing…" : "Approve & publish"}
        </button>
        <button
          type="button"
          onClick={() => setRejecting(true)}
          disabled={pending}
          className={`${BUTTON_PILL} ${DANGER_COLORS.quiet}`}
        >
          <X size={16} weight="bold" />
          Reject
        </button>
      </div>
    </div>
  );
}
