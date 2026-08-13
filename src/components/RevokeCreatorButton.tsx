"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Prohibit } from "@phosphor-icons/react";
import { Button, BUTTON_PILL, BUTTON_COLORS } from "@/components/Button";

// Забрать статус креатора — с обязательной причиной.
//
// Причина здесь не формальность: человек в один момент теряет возможность
// загружать, и единственное, что он увидит, — это её текст в уведомлении.
// Поэтому окно с полем, а не кнопка «Revoke» в один клик; заодно случайное
// нажатие рядом с чужим именем в списке ничего не ломает.
export function RevokeCreatorButton({
  userId,
  displayName,
}: {
  userId: string;
  displayName: string;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            : "Could not remove the status."
        );
        return;
      }
      setAsking(false);
      setReason("");
      router.refresh();
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
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Why is {displayName} losing creator access?
      </label>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        They see this text. Maps already on the marketplace stay up — take those
        down separately from the catalog.
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
