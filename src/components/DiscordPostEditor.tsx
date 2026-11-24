"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, X } from "@phosphor-icons/react";
import { Button, DANGER_COLORS, TOGGLE_PILL_COLORS } from "@/components/Button";
import { TextField } from "@/components/MapFormParts";
import DiscordPreview from "@/components/DiscordPreview";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { problemFromGateway } from "@/lib/upload-client";
import {
  CHANNEL_KEYS,
  checkPost,
  MAX_IMAGES,
  CHANNEL_ROLES,
  knownRoleName,
  SHOWCASE_CHANNELS,
  type ShowcaseChannel,
  type ShowcasePost,
} from "@/lib/discord-showcase";

// Редактор поста витрины в Discord (/admin/discord → Showcase).
//
// С вечера 26.10 пост — «сообщение», как у студий-примеров владельца
// (Coastline): крупный заголовок с чертой, текст с эмодзи и пингом роли,
// ссылки списком «- [текст](url) - **подпись**», до четырёх больших
// картинок, своё имя и аватар автора. Формат и всё, что уходит в
// Discord, — в lib/discord-showcase.ts (из пакета бота, проверен на
// живом Discord). Здесь только форма.
//
// Слева форма, справа DiscordPreview — тот же объект ShowcasePost, что
// уйдёт в вебхук, поэтому превью не может разойтись с результатом.
//
// Канал (27.10): Portfolio, Premade builds или Free builds — у каждого
// свой вебхук и свой цвет плашки. Опубликованный пост канал не меняет:
// его сообщение видит только вебхук того канала.
//
// ⚠️ Publish и Update СНАЧАЛА сохраняют. Обработчик шлёт в Discord то,
// что лежит в базе, а не то, что на экране.

const INPUT =
  "w-full rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500";
const LABEL = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300";
const HINT = "font-normal text-zinc-500 dark:text-zinc-400";
const MAX_BUTTONS = 5;
const MAX_LINKS = 10;

// Последний ID роли для пинга — в браузере владельца: роль одна и та же
// от поста к посту, вписывать её каждый раз незачем. Это удобство, а не
// данные: нет хранилища — поле просто пустое.
const ROLE_KEY = "discord-showcase-role-id";

type Action = "save" | "publish" | "update" | "unpublish" | "delete";

/** Поменять местами элемент с соседом — для стрелок «выше/ниже». */
function move<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function DiscordPostEditor({
  id: initialId,
  projectSlug,
  productSlug,
  initialChannel,
  status,
  initialPost,
  imageChoices,
  webhooks,
}: {
  /** null — пост ещё не сохранён ни разу. */
  id: string | null;
  projectSlug: string | null;
  productSlug: string | null;
  initialChannel: ShowcaseChannel;
  status: "draft" | "published";
  initialPost: ShowcasePost;
  /** Обложка и галерея работы — выбор картинок одним нажатием. */
  imageChoices: string[];
  /** Задан ли вебхук у канала — сама ссылка в браузер не попадает. */
  webhooks: Record<ShowcaseChannel, boolean>;
}) {
  const router = useRouter();
  const [id, setId] = useState(initialId);
  const [channel, setChannel] = useState(initialChannel);
  const webhookConfigured = webhooks[channel];
  const channelInfo = SHOWCASE_CHANNELS[channel];
  const [post, setPost] = useState(initialPost);
  const [customImage, setCustomImage] = useState("");
  const [reactions, setReactions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Action | null>(null);
  // Какое действие ждёт подтверждения. Одно поле, а не флаг на каждое:
  // открытым может быть только одно окно, и два флага умели бы спорить.
  const [confirming, setConfirming] = useState<"delete" | "unpublish" | null>(null);

  // Пингуется ли одна из ролей каналов (у них свои пилюли).
  const knownPing = post.mention === "role" && knownRoleName(post.roleId) !== null;
  const otherRole = post.mention === "role" && !knownPing;

  /**
   * Выбор пинга. «Other role» — последний вписанный ID, если он есть и
   * это НЕ роль канала.
   *
   * ⚠️ До 27.10 здесь была ошибка: если в браузере лежал ID Portfolio
   * (вписанный руками до появления её пилюли), «Other role» подставлял
   * его, загоралась пилюля @Portfolio, и кнопка выглядела не нажимающейся.
   */
  function chooseMention(mention: ShowcasePost["mention"]) {
    let roleId = mention === "role" && !knownRoleName(post.roleId) ? post.roleId : null;
    if (mention === "role" && !roleId) {
      try {
        const saved = window.localStorage.getItem(ROLE_KEY);
        roleId = saved && !knownRoleName(saved) ? saved : null;
      } catch {
        // Хранилище закрыто (приватное окно) — поле просто пустое.
      }
    }
    setPost((current) => ({ ...current, mention, roleId }));
  }

  /** Смена канала: пинг роли старого канала переезжает на роль нового. */
  function chooseChannel(next: ShowcaseChannel) {
    setChannel(next);
    if (post.mention === "role" && post.roleId === CHANNEL_ROLES[channel].id) {
      setPost((current) => ({ ...current, roleId: CHANNEL_ROLES[next].id }));
    }
  }

  const problem = checkPost(post);
  const published = status === "published";

  function set<K extends keyof ShowcasePost>(key: K, value: ShowcasePost[K]) {
    setPost((current) => ({ ...current, [key]: value }));
  }

  function setRoleId(value: string) {
    const roleId = value.trim() || null;
    set("roleId", roleId);
    try {
      if (roleId) window.localStorage.setItem(ROLE_KEY, roleId);
    } catch {
      // см. выше
    }
  }

  function toggleImage(url: string) {
    if (post.imageUrls.includes(url)) {
      set("imageUrls", post.imageUrls.filter((u) => u !== url));
    } else if (post.imageUrls.length < MAX_IMAGES) {
      set("imageUrls", [...post.imageUrls, url]);
    }
  }

  function addCustomImage() {
    const url = customImage.trim();
    if (!url || post.imageUrls.includes(url) || post.imageUrls.length >= MAX_IMAGES) return;
    set("imageUrls", [...post.imageUrls, url]);
    setCustomImage("");
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
    const result = await call({ action: "save", id: id ?? undefined, projectSlug, productSlug, channel, post });
    if (!result?.id) return null;
    if (!id) {
      setId(result.id);
      // Адрес — на сохранённый пост: перезагрузка страницы не должна
      // терять черновик и плодить второй.
      router.replace(`/admin/discord?tab=showcase&post=${result.id}`);
    }
    return result.id;
  }

  // ConfirmDialog, а не confirm() браузера — шапка ConfirmDialog.tsx.
  async function run(action: Action, confirmed = false) {
    setError(null);
    if ((action === "delete" || action === "unpublish") && !confirmed) {
      setConfirming(action);
      return;
    }
    setConfirming(null);
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

  const reactionList = reactions.split(/\s+/).filter(Boolean);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <ConfirmDialog
        open={confirming !== null}
        title={confirming === "delete" ? "Delete this draft?" : "Remove this post from the Discord channel?"}
        confirmLabel={confirming === "delete" ? "Delete" : "Remove"}
        danger
        onConfirm={() => confirming && run(confirming, true)}
        onCancel={() => setConfirming(null)}
      />
      <div className="space-y-6 rounded-3xl border border-zinc-200 bg-[#fbfbff] p-6 dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
        <div>
          <p className={LABEL}>Channel</p>
          <div className="flex flex-wrap gap-2">
            {CHANNEL_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => chooseChannel(key)}
                disabled={published && key !== channel}
                aria-pressed={key === channel}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
                  key === channel ? TOGGLE_PILL_COLORS.on : TOGGLE_PILL_COLORS.off
                }`}
              >
                {SHOWCASE_CHANNELS[key].label}
              </button>
            ))}
          </div>
          {published && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              To move it to another channel, remove it from Discord first.
            </p>
          )}
        </div>

        {/* Автор. После публикации Discord имя и аватар не меняет —
            правка шлёт только содержимое. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="username"
            label="Posted as"
            hint="· not “Discord”"
            value={post.username ?? ""}
            onChange={(v) => set("username", v.trim() ? v : null)}
          />
          <TextField
            id="avatar"
            label="Avatar link"
            value={post.avatarUrl ?? ""}
            onChange={(v) => set("avatarUrl", v.trim() || null)}
          />
        </div>
        {published && (
          <p className="-mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Discord keeps the name and avatar a post was published with. Update
            changes everything else.
          </p>
        )}

        <div>
          <TextField id="title" label="Title" value={post.title} onChange={(v) => set("title", v)} required />
          <label className="mt-2 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={post.titleDash}
              onChange={(e) => set("titleDash", e.target.checked)}
              className="h-4 w-4 accent-orange-500"
            />
            Dash after the title (“Title ——”)
          </label>
        </div>

        <div>
          <label htmlFor="body" className={LABEL}>
            Text{" "}
            <span className={HINT}>
              · server emoji as <code>&lt;:name:id&gt;</code>, small line starts with <code>-# </code>
            </span>
          </label>
          <textarea
            id="body"
            value={post.body}
            onChange={(e) => set("body", e.target.value)}
            rows={5}
            className={`${INPUT} resize-y`}
          />
        </div>

        {/* Ссылки списком: «- [текст](адрес) - **подпись**». */}
        <div>
          <p className={LABEL}>
            Links <span className={HINT}>· a list under the text; the bold note is optional</span>
          </p>
          <ul className="space-y-3">
            {post.links.map((link, index) => (
              <li key={index} className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex gap-2">
                  <input
                    value={link.label}
                    onChange={(e) =>
                      set("links", post.links.map((l, i) => (i === index ? { ...l, label: e.target.value } : l)))
                    }
                    placeholder="Text"
                    aria-label="Link text"
                    className={`${INPUT} min-w-0 flex-1`}
                  />
                  <RowControls
                    onUp={() => set("links", move(post.links, index, -1))}
                    onDown={() => set("links", move(post.links, index, 1))}
                    onRemove={() => set("links", post.links.filter((_, i) => i !== index))}
                    label="link"
                  />
                </div>
                <input
                  value={link.url}
                  onChange={(e) =>
                    set("links", post.links.map((l, i) => (i === index ? { ...l, url: e.target.value } : l)))
                  }
                  placeholder="https://…"
                  aria-label="Link address"
                  className={`${INPUT} mt-2`}
                />
                <input
                  value={link.tagline}
                  onChange={(e) =>
                    set("links", post.links.map((l, i) => (i === index ? { ...l, tagline: e.target.value } : l)))
                  }
                  placeholder="Bold note, e.g. Let's create something together!"
                  aria-label="Bold note"
                  className={`${INPUT} mt-2`}
                />
              </li>
            ))}
          </ul>
          {post.links.length < MAX_LINKS && (
            <AddButton onClick={() => set("links", [...post.links, { label: "", url: "", tagline: "" }])}>
              Add link
            </AddButton>
          )}
        </div>

        {/* Картинки: до четырёх, по порядку. Из работы — нажатием, своя —
            ссылкой. */}
        <div>
          <p className={LABEL}>
            Pictures <span className={HINT}>· up to {MAX_IMAGES}, in this order</span>
          </p>
          {post.imageUrls.length > 0 && (
            <ul className="mb-3 space-y-2">
              {post.imageUrls.map((url, index) => (
                <li key={url} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-12 w-20 shrink-0 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{url}</span>
                  <RowControls
                    onUp={() => set("imageUrls", move(post.imageUrls, index, -1))}
                    onDown={() => set("imageUrls", move(post.imageUrls, index, 1))}
                    onRemove={() => set("imageUrls", post.imageUrls.filter((u) => u !== url))}
                    label="picture"
                  />
                </li>
              ))}
            </ul>
          )}
          {imageChoices.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {imageChoices.map((url) => {
                const chosen = post.imageUrls.includes(url);
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => toggleImage(url)}
                    aria-pressed={chosen}
                    aria-label={chosen ? "Remove this picture" : "Add this picture"}
                    disabled={!chosen && post.imageUrls.length >= MAX_IMAGES}
                    className={`h-14 w-20 overflow-hidden rounded-xl border-2 transition-colors disabled:opacity-40 ${
                      chosen ? "border-orange-500" : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={customImage}
              onChange={(e) => setCustomImage(e.target.value)}
              placeholder="https://… your own picture"
              aria-label="Picture link"
              className={`${INPUT} min-w-0 flex-1`}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={addCustomImage}
              disabled={!customImage.trim() || post.imageUrls.length >= MAX_IMAGES}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Пинг — по умолчанию никого. @everyone будит весь сервер, и
            случайно его быть не должно. */}
        <div>
          <p className={LABEL}>Ping</p>
          <div className="flex flex-wrap gap-2">
            {/* Роли трёх каналов — отдельными пилюлями: их выбирают почти
                всегда (владелец, 26–27.10). «Other role» — любая другая по ID. */}
            {(
              [
                { key: "none", label: "Nobody", on: post.mention === "none", pick: () => chooseMention("none") },
                ...CHANNEL_KEYS.map((key) => ({
                  key: `role-${key}`,
                  label: `@${CHANNEL_ROLES[key].name}`,
                  on: post.mention === "role" && post.roleId === CHANNEL_ROLES[key].id,
                  pick: () => setPost((c) => ({ ...c, mention: "role" as const, roleId: CHANNEL_ROLES[key].id })),
                })),
                { key: "here", label: "@here", on: post.mention === "here", pick: () => chooseMention("here") },
                { key: "everyone", label: "@everyone", on: post.mention === "everyone", pick: () => chooseMention("everyone") },
                {
                  key: "role",
                  label: "Other role",
                  on: otherRole,
                  pick: () => chooseMention("role"),
                },
              ]
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={option.pick}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  option.on ? TOGGLE_PILL_COLORS.on : TOGGLE_PILL_COLORS.off
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {otherRole && (
            <div className="mt-3">
              <TextField
                id="roleId"
                label="Role ID"
                hint="· in Discord: Server Settings → Roles → right-click the role → Copy Role ID (needs Developer Mode)"
                value={post.roleId ?? ""}
                onChange={setRoleId}
              />
            </div>
          )}
        </div>

        {/* Кнопки-ссылки под постом — по желанию, поэтому свёрнуты. */}
        <details className="group" open={post.buttons.length > 0}>
          <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Buttons under the post <span className={HINT}>· optional, up to {MAX_BUTTONS}</span>
          </summary>
          <ul className="mt-3 space-y-2">
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
                <RemoveButton label="Remove button" onClick={() => set("buttons", post.buttons.filter((_, i) => i !== index))} />
              </li>
            ))}
          </ul>
          {post.buttons.length < MAX_BUTTONS && (
            <AddButton onClick={() => set("buttons", [...post.buttons, { label: "", url: "" }])}>Add button</AddButton>
          )}
        </details>

        {(problem || error) && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error ?? problem}
          </p>
        )}
        {!webhookConfigured && (
          <p className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
            Publishing to {channelInfo.label} is off: the channel link isn&apos;t set. In Discord
            run <code className="font-mono">/setup site_channel kind:{channelInfo.setupKind}</code>,
            then put the link into <code className="font-mono">{channelInfo.envVar}</code> on
            Vercel.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={() => run("save")} loading={pending === "save"} disabled={pending !== null}>
            {pending === "save" ? "Saving…" : "Save draft"}
          </Button>
          {published ? (
            <>
              <Button
                type="button"
                variant="primary"
                onClick={() => run("update")}
                loading={pending === "update"} disabled={pending !== null || problem !== null || !webhookConfigured}
              >
                {pending === "update" ? "Updating…" : "Update in Discord"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => run("unpublish")}
                loading={pending === "unpublish"} disabled={pending !== null || !webhookConfigured}
              >
                {pending === "unpublish" ? "Removing…" : "Remove from Discord"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={() => run("publish")}
              loading={pending === "publish"} disabled={pending !== null || problem !== null || !webhookConfigured}
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
      <div className="space-y-3 lg:sticky lg:top-8">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Preview {published ? "· published" : "· draft"}
        </p>
        <DiscordPreview post={post} reactions={reactionList} accentColor={channelInfo.color} />
        {/* Реакции ставит бот (/setup showcase_reactions), вебхук этого не
            умеет. Поле — только чтобы увидеть пост с ними. */}
        <input
          value={reactions}
          onChange={(e) => setReactions(e.target.value)}
          placeholder="Preview reactions: 🔥 ❤️ <:name:id>"
          aria-label="Preview reactions"
          className={INPUT}
        />
      </div>
    </div>
  );
}

function RowControls({
  onUp,
  onDown,
  onRemove,
  label,
}: {
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  label: string;
}) {
  const ICON =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-950/[0.05] dark:text-zinc-400 dark:hover:bg-zinc-50/[0.06]";
  return (
    <div className="flex shrink-0">
      <button type="button" onClick={onUp} aria-label={`Move ${label} up`} className={ICON}>
        <ArrowUp size={16} aria-hidden />
      </button>
      <button type="button" onClick={onDown} aria-label={`Move ${label} down`} className={ICON}>
        <ArrowDown size={16} aria-hidden />
      </button>
      <RemoveButton label={`Remove ${label}`} onClick={onRemove} />
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
