"use client";

import { useState } from "react";
import { Megaphone } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { TextField } from "@/components/MapFormParts";
import type { Recipient } from "@/lib/notifications";

// Объявление всем пользователям.
//
// Двухшаговая отправка (написал → подтвердил) намеренно: у рассылки нет
// отмены. Уведомление, разложенное по сотне ящиков, обратно не собрать —
// цена лишнего клика несопоставима с ценой опечатки в тексте, который
// увидят все.
export function AnnounceForm({ recipients }: { recipients: Recipient[] }) {
  // "" — всем. Отдельного признака не заводим: пустая строка и есть
  // «адресат не выбран», а обработчик на сервере решает по ней же.
  const [userId, setUserId] = useState("");
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
        body: JSON.stringify({ title, text, href, userId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          "Could not send it — nothing was delivered. Check the connection and try again; the text above is still here.",
        );
        return;
      }
      // Имя адресата берём из списка, а не из ответа: сервер возвращает
      // только число разложенных уведомлений, а «кому» админ выбирал
      // здесь же — переспрашивать нечего.
      const sent = data?.sent ?? 0;
      const recipient = recipients.find((r) => r.id === userId);
      setResult(
        userId
          ? `Sent to ${recipient?.displayName ?? "the account"}. It's in their notifications now — they'll see the bell marked next time they open the site.`
          : `Sent to ${sent} ${sent === 1 ? "account" : "accounts"} — everyone registered. It's in their notifications now; there's no way to take it back.`,
      );
      setTitle("");
      setText("");
      setHref("");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  const toEveryone = userId === "";

  return (
    <div className="mt-6 space-y-4">
      <div>
        <label
          htmlFor="announce-to"
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Who gets it
        </label>
        <select
          id="announce-to"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full cursor-pointer rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:bg-zinc-900"
        >
          <option value="">Everyone ({recipients.length} accounts)</option>
          {recipients.map((recipient) => (
            <option key={recipient.id} value={recipient.id}>
              {recipient.displayName}
            </option>
          ))}
        </select>
      </div>

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
        hint="A path on this site, like /marketplace or /terms. External links are dropped."
        value={href}
        onChange={setHref}
      />

      {/* Переспрашиваем только у рассылки всем. Личное сообщение одному
          человеку — обычное действие с понятной ценой ошибки, лишний
          клик там только мешает. */}
      {!confirming ? (
        // Иконка справа и `group gap-2` — тот же приём, что у «Open Discord»
        // на /contact: у кнопки с иконкой анимируется иконка, а не сама
        // кнопка (hover:scale со всего сайта убран, см. Button.tsx).
        <Button
          size="md"
          className="group gap-2"
          disabled={!title.trim() || busy}
          onClick={() => {
            setResult(null);
            if (toEveryone) setConfirming(true);
            else void send();
          }}
        >
          {busy ? "Sending…" : toEveryone ? "Send to everyone" : "Send"}
          <Megaphone
            size={18}
            weight="bold"
            className="transition-transform duration-300 group-hover:-rotate-12"
          />
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

      {/* Итог — ПОД кнопкой: сообщение появляется как ответ на нажатие, и
          читать его естественно там, куда только что ушёл клик. Сверху оно
          вдобавок сдвигало саму кнопку вниз в момент нажатия. */}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {result && (
        <p className="text-sm text-lime-700 dark:text-lime-400">{result}</p>
      )}
    </div>
  );
}
