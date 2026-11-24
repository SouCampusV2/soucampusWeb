"use client";

import { useState } from "react";
import { useRefresh } from "@/lib/useRefresh";
import { Button } from "@/components/Button";
import { TextField } from "@/components/MapFormParts";
import { checkPortfolioUrl, checkDiscord } from "@/lib/contact-links";

// Заявка на статус креатора.
//
// Отправляется в /api/creator/application, а не прямо в базу. Раньше
// здесь стояла вставка из браузера под политикой "submit own
// application"; политику сняла заморозка 20.08, и при разморозке она не
// возвращается — почему, разобрано в шапке обработчика. Проверки ниже —
// удобство (ошибка у поля до отправки), решает обработчик.
const MAX_ABOUT = 2000;

// Два режима (24.11): подача новой заявки и правка своей, пока она ждёт
// разбора. В правке нет галочки 18+ — она уже подтверждена при подаче, и
// дату подтверждения сервер не перезаписывает.
export function CreatorApplicationForm({
  initial,
  onCancel,
}: {
  /** Есть — это правка уже поданной заявки (PATCH), а не новая. */
  initial?: { about: string; portfolio: string; discord: string };
  onCancel?: () => void;
} = {}) {
  const editing = Boolean(initial);
  const refresh = useRefresh();
  const [about, setAbout] = useState(initial?.about ?? "");
  const [portfolio, setPortfolio] = useState(initial?.portfolio ?? "");
  const [discord, setDiscord] = useState(initial?.discord ?? "");
  const [adult, setAdult] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [discordError, setDiscordError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (about.trim().length === 0) return;

    // Ссылки проверяем ДО отправки и показываем ошибку у поля, а не
    // общим текстом внизу: иначе человек видит «не получилось» и не
    // знает, какое из трёх полей чинить.
    const link = checkPortfolioUrl(portfolio);
    const contact = checkDiscord(discord);
    setPortfolioError(link.ok ? null : link.error);
    setDiscordError(contact.ok ? null : contact.error);
    if (!link.ok || !contact.ok) return;

    setPending(true);
    setError(null);

    const response = await fetch("/api/creator/application", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        about: about.trim().slice(0, MAX_ABOUT),
        portfolio,
        discord,
        ...(editing ? {} : { adult }),
      }),
    }).catch(() => null);

    setPending(false);

    if (!response?.ok) {
      const data = (await response?.json().catch(() => null)) as {
        error?: string;
        message?: string;
        portfolioError?: string | null;
        discordError?: string | null;
      } | null;
      // Ошибки ссылок — под своими полями, как и при проверке до
      // отправки. message — текст отказа лимита частоты (rate-limit.ts).
      if (data?.portfolioError) setPortfolioError(data.portfolioError);
      if (data?.discordError) setDiscordError(data.discordError);
      setError(
        data?.message ??
          data?.error ??
          (editing
            ? "Could not save the changes. Try again in a moment."
            : "Could not send the application. Try again in a moment.")
      );
      return;
    }

    refresh();
    onCancel?.();
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div>
        <label
          htmlFor="about"
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Tell us about your building
        </label>
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          What you build, how long you&apos;ve been at it, anything you&apos;d
          want a client to know.
        </p>
        <textarea
          id="about"
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          rows={5}
          required
          maxLength={MAX_ABOUT}
          className="w-full rounded-2xl border border-zinc-950/[0.08] px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:bg-zinc-900"
        />
      </div>

      <div>
        <TextField
          id="portfolio"
          label="Portfolio link"
          hint="PlanetMinecraft, YouTube, ArtStation, wherever your work lives."
          value={portfolio}
          onChange={(value) => {
            setPortfolio(value);
            // Ошибка снимается сразу, как только человек начал править:
            // держать её под полем, пока он печатает исправление, —
            // ругаться на то, что он уже чинит.
            if (portfolioError) setPortfolioError(null);
          }}
        />
        {portfolioError && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {portfolioError}
          </p>
        )}
      </div>
      <div>
        <TextField
          id="discord"
          label="Discord"
          hint="So we can reach you about the application."
          value={discord}
          onChange={(value) => {
            setDiscord(value);
            if (discordError) setDiscordError(null);
          }}
        />
        {discordError && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {discordError}
          </p>
        )}
      </div>

      {/* Только 18+ (решение владельца, docs/SCANNER.md § 1). Дату
          подтверждения пишет сервер, галочка без неё ничего не стоит.
          В правке её нет: подтверждено при подаче. */}
      {!editing && (
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={adult}
          onChange={(e) => setAdult(e.target.checked)}
          required
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-orange-500 pointer-coarse:h-5 pointer-coarse:w-5"
        />
        <span>I&apos;m 18 or older.</span>
      </label>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          size="md"
          loading={pending}
          disabled={pending || !about.trim() || (!editing && !adult)}
        >
          {editing
            ? pending
              ? "Saving…"
              : "Save changes"
            : pending
              ? "Sending…"
              : "Send application"}
        </Button>
        {onCancel && (
          <Button type="button" size="md" variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
