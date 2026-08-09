"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeSlash, Eye, Trash, ArrowCounterClockwise } from "@phosphor-icons/react";
import { Button, BUTTON_PILL, BUTTON_COLORS } from "@/components/Button";
import type { CatalogRow } from "@/lib/catalog";

// Действия над картой в каталоге админки.
//
// Снятие с витрины требует причины и потому идёт через окно, а не по
// клику: карта пропадает из дохода автора, и «за что» он должен узнать
// из системы, а не из переписки.
export function CatalogActions({ product }: { product: CatalogRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState<null | "suspend" | "delete">(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(action: string, payload?: { reason?: string }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, action, ...payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong");
        return;
      }
      setAsking(null);
      setReason("");
      // Каталог — серверный компонент; refresh перерисовывает его свежими
      // данными, не перезагружая страницу целиком.
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const deleted = Boolean(product.deletedAt);

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {deleted ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => run("restore")}
            className={`${BUTTON_PILL} ${BUTTON_COLORS.secondary}`}
          >
            <ArrowCounterClockwise size={16} weight="bold" />
            Restore
          </button>
        ) : (
          <>
            {product.isPublished ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setAsking("suspend")}
                className={`${BUTTON_PILL} ${BUTTON_COLORS.secondary}`}
              >
                <EyeSlash size={16} weight="bold" />
                Take down
              </button>
            ) : (
              // Вернуть можно только разобранную карту: у pending и
              // rejected «вернуть на витрину» означало бы публикацию
              // мимо очереди.
              product.status === "published" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run("unsuspend")}
                  className={`${BUTTON_PILL} ${BUTTON_COLORS.secondary}`}
                >
                  <Eye size={16} weight="bold" />
                  Publish again
                </button>
              )
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => setAsking("delete")}
              className={`${BUTTON_PILL} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40`}
            >
              <Trash size={16} weight="bold" />
              Delete
            </button>
          </>
        )}
      </div>

      {asking === "suspend" && (
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Why is it coming down?
          </label>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            The creator sees this text, so write it for them.
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
                setAsking(null);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <button
              type="button"
              disabled={busy || reason.trim().length === 0}
              onClick={() => run("suspend", { reason })}
              className={`${BUTTON_PILL} ${BUTTON_COLORS.primary} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              Take it down
            </button>
          </div>
        </div>
      )}

      {asking === "delete" && (
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <p className="text-sm text-red-800 dark:text-red-200">
            Remove <span className="font-semibold">{product.title}</span> from
            the shop and the creator&apos;s list?
          </p>
          {/* Честно говорим, что удаление не стирает: покупатели платили
              за файл и доступ к нему сохраняют. */}
          <p className="mt-2 text-xs text-red-700 dark:text-red-300">
            It stays in this catalog, and anyone who bought it keeps their
            download. Nothing is erased.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="tertiary" size="sm" onClick={() => setAsking(null)}>
              Cancel
            </Button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run("delete")}
              className={`${BUTTON_PILL} bg-red-600 text-white hover:bg-red-700`}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
