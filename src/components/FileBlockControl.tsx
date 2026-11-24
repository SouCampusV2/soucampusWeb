"use client";

import { useState } from "react";
import { Prohibit, ArrowCounterClockwise } from "@phosphor-icons/react";
import { useRefresh } from "@/lib/useRefresh";
import { BUTTON_PILL, DANGER_COLORS } from "@/components/Button";
import { readApiError } from "@/lib/api-error";

// Рубильник файла в каталоге админки (аудит 2026-11, S-02).
//
// Отдельный компонент, а не ещё одна кнопка в CatalogActions: те кнопки
// меняют СОСТОЯНИЕ карты (снять, вернуть, удалить), а эта состояние не
// трогает вовсе — она запрещает отдавать файл. Смешать их в одном ряду
// значило бы подсказать, что «Block file» — это ещё один способ снять
// карту; на деле это единственное действие, которое отнимает файл у тех,
// кто уже заплатил.
//
// Решает сервер (/api/admin/catalog, действия block_file / unblock_file):
// он заново проверяет права, отсюда уходит только просьба.
export function FileBlockControl({
  productId,
  blocked,
}: {
  productId: string;
  blocked: boolean;
}) {
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(action: "block_file" | "unblock_file") {
    setError(null);
    setPending(true);
    const response = await fetch("/api/admin/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, action, reason }),
    });
    setPending(false);

    if (!response.ok) {
      const { code, message } = await readApiError(response);
      setError(message ?? code ?? "Something went wrong.");
      return;
    }
    setOpen(false);
    setReason("");
    refresh();
  }

  if (blocked) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => send("unblock_file")}
          disabled={pending}
          className={`${BUTTON_PILL} text-zinc-600 hover:bg-zinc-950/[0.05] dark:text-zinc-400 dark:hover:bg-zinc-50/[0.06]`}
        >
          <ArrowCounterClockwise size={16} weight="bold" />
          {pending ? "Unblocking…" : "Unblock file"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${BUTTON_PILL} ${DANGER_COLORS.quiet}`}
        >
          <Prohibit size={16} weight="bold" />
          Block file
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <label
        htmlFor={`block-${productId}`}
        className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        Why is this file blocked?{" "}
        <span className="font-normal text-zinc-500 dark:text-zinc-400">
          — buyers lose the download until you unblock it
        </span>
      </label>
      <textarea
        id={`block-${productId}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="What was found in the file…"
        className="w-full resize-y rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500"
      />
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => send("block_file")}
          disabled={pending || reason.trim().length === 0}
          className={`${BUTTON_PILL} ${DANGER_COLORS.solid}`}
        >
          {pending ? "Blocking…" : "Block the file"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setReason("");
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
