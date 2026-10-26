"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star } from "@phosphor-icons/react";
import { Button, BUTTON_COLORS, BUTTON_PILL, DANGER_COLORS, TOGGLE_PILL_COLORS } from "@/components/Button";
import { TextField } from "@/components/MapFormParts";
import { LocalTime } from "@/components/LocalTime";
import { problemFromGateway } from "@/lib/upload-client";
import {
  checkReviewInput,
  reviewHasText,
  reviewInputFrom,
  type InboxItem,
  type ReviewInput,
} from "@/lib/discord-inbox";
import type { ReviewFromDiscord } from "@/lib/discord-bridge";

// Очередь «пришло из Discord» (/admin/discord → Inbox, 27.10).
//
// Бот присылает с согласия клиента черновик работы или отзыв; на сайте
// ничего не появляется само. Здесь владелец решает: черновик — открыть
// формой портфолио, отзыв — добавить в reviews, любое — отклонить.
// Записи — через /api/admin/discord.

async function decide(body: Record<string, unknown>): Promise<string | null> {
  const response = await fetch("/api/admin/discord", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.ok ? null : await problemFromGateway(response);
}

export function DiscordInbox({ items }: { items: InboxItem[] }) {
  if (items.length === 0) {
    return (
      <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
        Nothing waiting. When a client agrees to share their build or review in
        Discord, it shows up here.
      </p>
    );
  }
  return (
    <ul className="mt-8 space-y-4">
      {items.map((item) => (
        <li
          key={item.key}
          className="rounded-3xl border border-zinc-200 bg-[#fbfbff] p-5 dark:border-zinc-800 dark:bg-zinc-950 sm:p-6"
        >
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {item.kind === "review" ? "Review" : "Build"} · <LocalTime value={item.createdAt} />
          </p>
          {item.kind === "review" ? (
            <ReviewItem itemKey={item.key} review={item.review} />
          ) : (
            <DraftItem item={item} />
          )}
        </li>
      ))}
    </ul>
  );
}

function DraftItem({ item }: { item: Extract<InboxItem, { kind: "portfolio_draft" }> }) {
  const { draft } = item;
  const facts: [string, string][] = [
    ["Brief", draft.need],
    ["Theme", draft.theme],
    ["Version", draft.version],
    ["Size", draft.sizeLabel],
    ["Price", draft.priceLabel],
    ["Deadline", draft.deadlineDays !== null ? `${draft.deadlineDays} days` : "—"],
  ];
  return (
    <>
      {item.imageUrls.length > 0 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {item.imageUrls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="h-20 w-32 shrink-0 rounded-xl object-cover" />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          No photos came through — add your own in the form.
        </p>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd className="truncate font-medium text-zinc-950 dark:text-zinc-50">{value || "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={`/admin/portfolio/new?inbox=${encodeURIComponent(item.key)}`}
          className={`${BUTTON_PILL} ${BUTTON_COLORS.primary}`}
        >
          Open as new work
        </Link>
        <DismissButton itemKey={item.key} />
      </div>
    </>
  );
}

function ReviewItem({ itemKey, review }: { itemKey: string; review: ReviewFromDiscord }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState<ReviewInput>(() => reviewInputFrom(review));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const hasText = reviewHasText(review);

  function set<K extends keyof ReviewInput>(key: K, value: ReviewInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const problem = checkReviewInput(input);
    if (problem) {
      setError(problem);
      return;
    }
    setPending(true);
    setError(null);
    const failure = await decide({ action: "add_review", key: itemKey, review: input });
    setPending(false);
    if (failure) setError(failure);
    else router.refresh();
  }

  return (
    <>
      <p className="mt-2 flex items-center gap-0.5 text-orange-400" aria-label={`${review.rating} out of 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={16} weight={i < review.rating ? "fill" : "regular"} aria-hidden />
        ))}
        <span className="ml-2 text-sm font-medium text-zinc-950 dark:text-zinc-50">{review.name}</span>
      </p>
      {hasText ? (
        <p className="mt-2 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">{review.comment}</p>
      ) : (
        // Одна оценка без слов — карточке отзыва на сайте нечего показать.
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Rating only, no text — nothing to show on the site.
        </p>
      )}

      {open ? (
        <form onSubmit={submit} className="mt-5 space-y-4 border-t border-zinc-200 pt-5 dark:border-zinc-800">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id={`${itemKey}-name`} label="Name" value={input.name} onChange={(v) => set("name", v)} required />
            <TextField
              id={`${itemKey}-role`}
              label="Who they are"
              hint="— Owner, GuardiumMC"
              value={input.role}
              onChange={(v) => set("role", v)}
              required
            />
            <TextField id={`${itemKey}-flag`} label="Flag" hint="— one emoji, optional" value={input.flag} onChange={(v) => set("flag", v)} />
            <TextField
              id={`${itemKey}-slug`}
              label="Address"
              hint={`— /reviews/${input.slug || "…"}`}
              value={input.slug}
              onChange={(v) => set("slug", v.toLowerCase())}
              required
            />
          </div>
          <div>
            <label htmlFor={`${itemKey}-text`} className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Text
            </label>
            <textarea
              id={`${itemKey}-text`}
              value={input.text}
              onChange={(e) => set("text", e.target.value)}
              rows={4}
              className="w-full resize-y rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-3 text-sm text-zinc-950 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50"
            />
          </div>
          <div className="flex gap-2">
            {(["orange", "lime"] as const).map((accent) => (
              <button
                key={accent}
                type="button"
                onClick={() => set("accent", accent)}
                className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  input.accent === accent ? TOGGLE_PILL_COLORS.on : TOGGLE_PILL_COLORS.off
                }`}
              >
                {accent}
              </button>
            ))}
          </div>
          {error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Adding…" : "Add to reviews"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {hasText && (
            <button type="button" onClick={() => setOpen(true)} className={`${BUTTON_PILL} ${BUTTON_COLORS.primary}`}>
              Add to reviews
            </button>
          )}
          <DismissButton itemKey={itemKey} />
        </div>
      )}
    </>
  );
}

function DismissButton({ itemKey }: { itemKey: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function dismiss() {
    if (!window.confirm("Dismiss this? It won't be published.")) return;
    setPending(true);
    const failure = await decide({ action: "dismiss", key: itemKey });
    setPending(false);
    if (failure) setError(failure);
    else router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={dismiss}
        disabled={pending}
        className={`rounded-full px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${DANGER_COLORS.quiet}`}
      >
        {pending ? "Dismissing…" : "Dismiss"}
      </button>
      {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
    </>
  );
}
