"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "@phosphor-icons/react";
import { Button, DANGER_COLORS, TOGGLE_PILL_COLORS } from "@/components/Button";
import { TextField } from "@/components/MapFormParts";
import DiscordPreview from "@/components/DiscordPreview";
import { problemFromGateway } from "@/lib/upload-client";
import { checkPost, type ShowcasePost } from "@/lib/discord-showcase";

// Редактор поста витрины в Discord (/admin/discord → Showcase, 27.10).
//
// Слева форма, справа DiscordPreview — тот же объект ShowcasePost, что
// уйдёт в вебхук, поэтому превью не может разойтись с результатом.
//
// ⚠️ Publish и Update СНАЧАЛА сохраняют. Обработчик шлёт в Discord то,
// что лежит в базе, а не то, что на экране: без сохранения правки,
// сделанные после последнего Save, в Discord бы не попали, и превью
// соврало бы.

const INPUT =
  "w-full rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500";
const LABEL = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300";
const MAX_BUTTONS = 5;

type Action = "save" | "publish" | "update" | "unpublish" | "delete";

export function DiscordPostEditor({
  id: initialId,
  projectSlug,
  status,
  initialPost,
  imageChoices,
  webhookConfigured,
}: {
  /** null — пост ещё не сохранён ни разу. */
  id: string | null;
  projectSlug: string | null;
  status: "draft" | "published";
  initialPost: ShowcasePost;
  /** Обложка и галерея работы — выбор картинки одним нажатием. */
  imageChoices: string[];
  webhookConfigured: boolean;
}) {
  const router = useRouter();
  const [id, setId] = useState(initialId);
  const [post, setPost] = useState(initialPost);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Action | null>(null);

  const problem = checkPost(post);
  const published = status === "published";

  function set<K extends keyof ShowcasePost>(key: K, value: ShowcasePost[K]) {
    setPost((current) => ({ ...current, [key]: value }));
  }

  async function call(body: Record<string, unknown>): Promise<{ id?: string } | null> {
    const response = await fetch("/api/admin/discord/showcase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      setError(await problemFromGateway(response));
      return null;
    }
    return (await response.json()) as { id?: string };
  }

  async function save(): Promise<string | null> {
    const result = await call({ action: "save", id: id ?? undefined, projectSlug, post });
    if (!result?.id) return null;
    if (!id) {
      setId(result.id);
      // Адрес — на сохранённый пост: перезагрузка страницы не должна
      // терять черновик и плодить второй.
      router.replace(`/admin/discord?tab=showcase&post=${result.id}`);
    }
    return result.id;
  }

  async function run(action: Action) {
    setError(null);
    if (action === "delete" && !window.confirm("Delete this draft?")) return;
    if (action === "unpublish" && !window.confirm("Remove this post from the Discord channel?")) return;
    setPending(action);

    if (action === "save") {
      await save();
    } else if (action === "publish" || action === "update") {
      const savedId = await save();
      if (savedId) await call({ action, id: savedId }).then((ok) => ok && router.refresh());
    } else if (id) {
      const ok = await call({ action, id });
      if (ok) {
        if (action === "delete") router.push("/admin/discord?tab=showcase");
        else router.refresh();
      }
    }
    setPending(null);
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-6 rounded-3xl border border-zinc-200 bg-[#fbfbff] p-6 dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
        <TextField id="author" label="Top line" value={post.authorName} onChange={(v) => set("authorName", v)} />
        <TextField id="title" label="Title" value={post.title} onChange={(v) => set("title", v)} required />
        <TextField
          id="url"
          label="Title link"
          hint="— usually the work page"
          value={post.url ?? ""}
          onChange={(v) => set("url", v.trim() || null)}
        />
        <div>
          <label htmlFor="body" className={LABEL}>
            Text{" "}
            <span className="font-normal text-zinc-500 dark:text-zinc-400">— Discord markdown works</span>
          </label>
          <textarea
            id="body"
            value={post.body}
            onChange={(e) => set("body", e.target.value)}
            rows={5}
            className={`${INPUT} resize-y`}
          />
        </div>

        {/* Картинка: одна из кадров работы или своя ссылка. */}
        <div>
          <p className={LABEL}>Image</p>
          {imageChoices.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {imageChoices.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => set("imageUrl", url)}
                  aria-label="Use this image"
                  className={`h-14 w-20 overflow-hidden rounded-xl border-2 transition-colors ${
                    post.imageUrl === url
                      ? "border-orange-500"
                      : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => set("imageUrl", null)}
                className={`h-14 rounded-xl border-2 px-3 text-xs font-medium text-zinc-500 transition-colors ${
                  post.imageUrl === null ? "border-orange-500" : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                No image
              </button>
            </div>
          )}
          <input
            value={post.imageUrl ?? ""}
            onChange={(e) => set("imageUrl", e.target.value.trim() || null)}
            placeholder="https://…"
            aria-label="Image link"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="color" className={LABEL}>Stripe colour</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(post.color) ? post.color : "#f97316"}
              onChange={(e) => set("color", e.target.value)}
              aria-label="Pick a colour"
              className="h-11 w-14 cursor-pointer rounded-xl border border-zinc-950/[0.08] bg-transparent dark:border-zinc-50/[0.08]"
            />
            <input id="color" value={post.color} onChange={(e) => set("color", e.target.value)} className={INPUT} />
          </div>
        </div>

        {/* Поля — «Size / Built in / Price». inline — в ряд по три. */}
        <div>
          <p className={LABEL}>Fields</p>
          <ul className="space-y-2">
            {post.fields.map((field, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2">
                <input
                  value={field.name}
                  onChange={(e) =>
                    set("fields", post.fields.map((f, i) => (i === index ? { ...f, name: e.target.value } : f)))
                  }
                  placeholder="Name"
                  aria-label="Field name"
                  className={`${INPUT} min-w-0 flex-1 basis-28`}
                />
                <input
                  value={field.value}
                  onChange={(e) =>
                    set("fields", post.fields.map((f, i) => (i === index ? { ...f, value: e.target.value } : f)))
                  }
                  placeholder="Value"
                  aria-label="Field value"
                  className={`${INPUT} min-w-0 flex-1 basis-28`}
                />
                <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={field.inline}
                    onChange={(e) =>
                      set("fields", post.fields.map((f, i) => (i === index ? { ...f, inline: e.target.checked } : f)))
                    }
                    className="h-4 w-4 accent-orange-500"
                  />
                  Inline
                </label>
                <RemoveButton
                  label="Remove field"
                  onClick={() => set("fields", post.fields.filter((_, i) => i !== index))}
                />
              </li>
            ))}
          </ul>
          <AddButton onClick={() => set("fields", [...post.fields, { name: "", value: "", inline: true }])}>
            Add field
          </AddButton>
        </div>

        {/* Кнопки-ссылки под постом. Действий там нет и не будет. */}
        <div>
          <p className={LABEL}>Buttons <span className="font-normal text-zinc-500 dark:text-zinc-400">— up to {MAX_BUTTONS}</span></p>
          <ul className="space-y-2">
            {post.buttons.map((button, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2">
                <input
                  value={button.label}
                  onChange={(e) =>
                    set("buttons", post.buttons.map((b, i) => (i === index ? { ...b, label: e.target.value } : b)))
                  }
                  placeholder="Label"
                  aria-label="Button label"
                  className={`${INPUT} min-w-0 flex-1 basis-28`}
                />
                <input
                  value={button.url}
                  onChange={(e) =>
                    set("buttons", post.buttons.map((b, i) => (i === index ? { ...b, url: e.target.value } : b)))
                  }
                  placeholder="https://…"
                  aria-label="Button link"
                  className={`${INPUT} min-w-0 flex-[2] basis-40`}
                />
                <RemoveButton
                  label="Remove button"
                  onClick={() => set("buttons", post.buttons.filter((_, i) => i !== index))}
                />
              </li>
            ))}
          </ul>
          {post.buttons.length < MAX_BUTTONS && (
            <AddButton onClick={() => set("buttons", [...post.buttons, { label: "", url: "" }])}>
              Add button
            </AddButton>
          )}
        </div>

        {/* Упоминание — по умолчанию никого. @everyone будит весь сервер,
            и случайно его быть не должно. */}
        <div>
          <p className={LABEL}>Ping</p>
          <div className="flex flex-wrap gap-2">
            {(["none", "here", "everyone"] as const).map((mention) => (
              <button
                key={mention}
                type="button"
                onClick={() => set("mention", mention)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  post.mention === mention ? TOGGLE_PILL_COLORS.on : TOGGLE_PILL_COLORS.off
                }`}
              >
                {mention === "none" ? "Nobody" : `@${mention}`}
              </button>
            ))}
          </div>
        </div>

        {(problem || error) && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error ?? problem}
          </p>
        )}
        {!webhookConfigured && (
          <p className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
            Publishing is off: the channel link isn&apos;t set. In Discord run{" "}
            <code className="font-mono">/setup showcase_channel</code>, then put the link into{" "}
            <code className="font-mono">DISCORD_SHOWCASE_WEBHOOK_URL</code> on Vercel.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={() => run("save")} disabled={pending !== null}>
            {pending === "save" ? "Saving…" : "Save draft"}
          </Button>
          {published ? (
            <>
              <Button
                type="button"
                variant="primary"
                onClick={() => run("update")}
                disabled={pending !== null || problem !== null || !webhookConfigured}
              >
                {pending === "update" ? "Updating…" : "Update in Discord"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => run("unpublish")}
                disabled={pending !== null || !webhookConfigured}
              >
                {pending === "unpublish" ? "Removing…" : "Remove from Discord"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={() => run("publish")}
              disabled={pending !== null || problem !== null || !webhookConfigured}
            >
              {pending === "publish" ? "Publishing…" : "Publish"}
            </Button>
          )}
        </div>
        {!published && id && (
          <button
            type="button"
            onClick={() => run("delete")}
            disabled={pending !== null}
            className={`rounded-full px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${DANGER_COLORS.quiet}`}
          >
            Delete draft
          </button>
        )}
      </div>

      {/* Превью — липкое: при длинной форме оно остаётся на виду. */}
      <div className="lg:sticky lg:top-8">
        <p className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Preview {published ? "· published" : "· draft"}
        </p>
        <DiscordPreview post={post} />
      </div>
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 inline-flex items-center gap-1 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-50"
    >
      <Plus size={12} aria-hidden />
      {children}
    </button>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40"
    >
      <X size={16} aria-hidden />
    </button>
  );
}
