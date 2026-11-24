"use client";

import { useState } from "react";
import { Megaphone } from "@phosphor-icons/react";
import { Button, TOGGLE_PILL_COLORS } from "@/components/Button";
import { SelectField } from "@/components/SelectField";
import { TextField } from "@/components/MapFormParts";
import type { Recipient } from "@/lib/notifications";
import { readApiError } from "@/lib/api-error";

// Объявление всем пользователям.
//
// Двухшаговая отправка (написал → подтвердил) намеренно: у рассылки нет
// отмены. Уведомление, разложенное по сотне ящиков, обратно не собрать —
// цена лишнего клика несопоставима с ценой опечатки в тексте, который
// увидят все.
type Target = "both" | "site" | "discord";
type Ping = "none" | "here" | "everyone";

const TARGETS: { value: Target; label: string }[] = [
  { value: "both", label: "Site + Discord" },
  { value: "site", label: "Site only" },
  { value: "discord", label: "Discord only" },
];

export function AnnounceForm({
  recipients,
  discordReady,
  initialTarget,
}: {
  recipients: Recipient[];
  /** Задан ли вебхук канала объявлений (DISCORD_ANNOUNCE_WEBHOOK_URL). */
  discordReady: boolean;
  /** Куда по умолчанию — из адреса (?to=site / ?to=discord, навбар). */
  initialTarget?: Target;
}) {
  // "" — всем. Отдельного признака не заводим: пустая строка и есть
  // «адресат не выбран», а обработчик на сервере решает по ней же.
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [href, setHref] = useState("");
  // Куда: с 26.10 объявление «всем» может уйти и в Discord. Без вебхука —
  // только сайт, выбор не показывается вовсе.
  const [target, setTarget] = useState<Target>(discordReady ? initialTarget ?? "both" : "site");
  const [ping, setPing] = useState<Ping>("none");
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
        body: JSON.stringify({ title, text, href, userId, target: effectiveTarget, ping }),
      });
      if (!res.ok) {
        // Разбор общий (lib/api-error), решение — местное: здесь важно,
        // ПРИШЁЛ ли текст от обработчика. Лимит частоты объясняет себя
        // сам и говорит, сколько ждать, — к нему дописываем главное для
        // отправителя: рассылка не ушла. Свой фоллбэк эту фразу уже
        // содержит, поэтому дописывать к нему нельзя.
        const { message } = await readApiError(res);
        setError(
          message
            ? `${message} Nothing was delivered — the text above is still here.`
            : "Could not send it — nothing was delivered. Check the connection and try again; the text above is still here.",
        );
        return;
      }
      // Тело читается ЗДЕСЬ, а не до проверки res.ok: на отказе его уже
      // разобрал readApiError, а Response.json() второй раз бросает
      // «body stream already read».
      const data = (await res.json().catch(() => null)) as { sent?: number } | null;
      // Имя адресата берём из списка, а не из ответа: сервер возвращает
      // только число разложенных уведомлений, а «кому» админ выбирал
      // здесь же — переспрашивать нечего.
      const sent = data?.sent ?? 0;
      const recipient = recipients.find((r) => r.id === userId);
      const where =
        effectiveTarget === "discord"
          ? "Posted in the Discord announcements channel."
          : `Sent to ${sent} ${sent === 1 ? "account" : "accounts"} — everyone registered${
              effectiveTarget === "both" ? ", and posted in Discord" : ""
            }. There's no way to take it back.`;
      setResult(
        userId
          ? `Sent to ${recipient?.username ?? "the account"}. It's in their notifications now — they'll see the bell marked next time they open the site.`
          : where,
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
  // Личное сообщение — только на сайт: канал Discord видят все.
  const effectiveTarget: Target = toEveryone && discordReady ? target : "site";

  return (
    <div className="mt-6 space-y-4">
      {/* Свой список, а не <select>: раскрытый нативный рисует
          операционная система, и в тёмной теме он приезжает белым.
          Компонент общий с формами загрузки и правки карты. */}
      <SelectField
        id="announce-to"
        label="Who gets it"
        value={userId}
        onChange={setUserId}
        options={[
          { value: "", label: `Everyone (${recipients.length} accounts)` },
          ...recipients.map((recipient) => ({
            value: recipient.id,
            label: recipient.username,
          })),
        ]}
      />

      {/* Куда — только у рассылки всем и только при заданном вебхуке. */}
      {toEveryone && discordReady && (
        <div>
          <p className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Where</p>
          <div className="flex flex-wrap gap-2">
            {TARGETS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTarget(option.value)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  target === option.value ? TOGGLE_PILL_COLORS.on : TOGGLE_PILL_COLORS.off
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {target !== "site" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Ping in Discord:</span>
              {(["none", "here", "everyone"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPing(value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    ping === value ? TOGGLE_PILL_COLORS.on : TOGGLE_PILL_COLORS.off
                  }`}
                >
                  {value === "none" ? "Nobody" : `@${value}`}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {toEveryone && !discordReady && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          To also post in Discord, set <code>DISCORD_ANNOUNCE_WEBHOOK_URL</code> on Vercel
          (channel settings → Integrations → Webhooks → copy URL).
        </p>
      )}

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
          loading={busy} disabled={!title.trim() || busy}
          onClick={() => {
            setResult(null);
            if (toEveryone) setConfirming(true);
            else void send();
          }}
        >
          {busy
            ? "Sending…"
            : !toEveryone
              ? "Send"
              : effectiveTarget === "discord"
                ? "Post in Discord"
                : effectiveTarget === "both"
                  ? "Send everywhere"
                  : "Send to everyone"}
          <Megaphone
            size={18}
            weight="bold"
            className="transition-transform duration-300 group-hover:-rotate-12"
          />
        </Button>
      ) : (
        <div className="rounded-2xl border border-orange-500/40 bg-orange-50 p-4 dark:bg-orange-950/30">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {effectiveTarget === "discord"
              ? "This goes to the Discord announcements channel."
              : effectiveTarget === "both"
                ? "This goes to every account and to Discord, and can't be taken back."
                : "This goes to every account and can't be taken back."}
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" loading={busy} disabled={busy} onClick={send}>
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
