"use client";

import { useState } from "react";
import { Megaphone } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { TextField } from "@/components/MapFormParts";

// Объявление всем пользователям.
//
// Двухшаговая отправка (написал → подтвердил) намеренно: у рассылки нет
// отмены. Уведомление, разложенное по сотне ящиков, обратно не собрать —
// цена лишнего клика несопоставима с ценой опечатки в тексте, который
// увидят все.
export function AnnounceForm() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [href, setHref] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, text, href }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError("Could not send the announcement.");
        return;
      }
      setResult(`Sent to ${data?.sent ?? 0} accounts.`);
      setTitle("");
      setText("");
      setHref("");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <TextField
        id="announce-title"
        label="Headline"
        hint="What they see first — “Summer sale: 30% off”, “Updated terms”."
        value={title}
        onChange={setTitle}
      />

      <div>
        <label
          htmlFor="announce-text"
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Details
        </label>
        <textarea
          id="announce-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full rounded-2xl border border-zinc-950/[0.08] px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:bg-zinc-900"
        />
      </div>

      <TextField
        id="announce-href"
        label="Link (optional)"
        hint="A path on this site, like /shop or /terms. External links are dropped."
        value={href}
        onChange={setHref}
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {result && (
        <p className="text-sm text-lime-700 dark:text-lime-400">{result}</p>
      )}

      {!confirming ? (
        <Button
          size="md"
          disabled={!title.trim()}
          onClick={() => {
            setResult(null);
            setConfirming(true);
          }}
        >
          <Megaphone size={18} weight="bold" />
          Send to everyone
        </Button>
      ) : (
        <div className="rounded-2xl border border-orange-500/40 bg-orange-50 p-4 dark:bg-orange-950/30">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            This goes to every account and can&apos;t be taken back.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" disabled={busy} onClick={send}>
              {busy ? "Sending…" : "Yes, send it"}
            </Button>
            <Button
              size="sm"
              variant="tertiary"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
