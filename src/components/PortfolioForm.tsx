"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { GalleryPicker, useImagePicker, type GalleryImage } from "@/components/GalleryPicker";
import { TextField } from "@/components/MapFormParts";
import { uploadImage, problemFromGateway } from "@/lib/upload-client";
import {
  PROJECT_LIMITS,
  checkProjectInput,
  slugify,
  type ProjectInput,
} from "@/lib/portfolio-input";
import type { Project } from "@/lib/projects";
import type { PortfolioPrefill } from "@/lib/discord-inbox";

// Форма работы портфолио — одна на добавление и правку (2026-10-25).
//
// Устроена как форма карты: галерея тем же GalleryPicker (звезда —
// обложка, остальное — кадры по порядку), картинки через шлюз
// (/api/creator/image, kind "portfolio"), запись — одним запросом в
// /api/admin/portfolio. Проверку полей зовём и здесь (до загрузки
// картинок, чтобы не грузить их ради отказа), и на сервере — там она
// настоящая.

const INPUT =
  "w-full rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500";
const LABEL = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

/** Пустое поле — null, иначе число (NaN уйдёт в проверку и получит отказ). */
function toNumber(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  return trimmed === "" ? null : Number(trimmed);
}

export function PortfolioForm({
  project,
  tags,
  prefill,
  inboxKey,
}: {
  /** Правка — работа как есть; добавление — undefined. */
  project?: Project;
  /** Теги, которые уже встречаются, — подсказкой под полем. */
  tags: string[];
  /**
   * Заготовка из черновика Discord-бота (/admin/discord → «Open as new
   * work», 27.10): факты и фото. Тексты пишет владелец.
   */
  prefill?: PortfolioPrefill;
  /** Строка очереди, которую отметить опубликованной после сохранения. */
  inboxKey?: string;
}) {
  const router = useRouter();
  const editing = project !== undefined;

  const [title, setTitle] = useState(project?.title ?? "");
  const [slug, setSlug] = useState(project?.slug ?? "");
  // Пока адрес не трогали руками, он идёт за названием. У сохранённой
  // работы — нет: смена адреса ломает уже разосланные ссылки.
  const [slugTouched, setSlugTouched] = useState(editing);
  const [tag, setTag] = useState(project?.tag ?? prefill?.tag ?? "Order");
  const [summary, setSummary] = useState(project?.summary ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [priceLabel, setPriceLabel] = useState(project?.price ?? prefill?.priceLabel ?? "");
  const [priceAmount, setPriceAmount] = useState(
    (project?.priceAmount ?? prefill?.priceAmount)?.toString() ?? ""
  );
  const [sizeLabel, setSizeLabel] = useState(project?.size ?? prefill?.sizeLabel ?? "");
  const [sizeX, setSizeX] = useState((project?.sizeX ?? prefill?.sizeX)?.toString() ?? "");
  const [sizeZ, setSizeZ] = useState((project?.sizeZ ?? prefill?.sizeZ)?.toString() ?? "");
  const [deadlineLabel, setDeadlineLabel] = useState(
    project?.deadline ?? prefill?.deadlineLabel ?? ""
  );
  const [isFeatured, setIsFeatured] = useState(project?.isFeatured ?? false);
  const [sortOrder, setSortOrder] = useState(project?.sortOrder?.toString() ?? "");
  const [listingUrl, setListingUrl] = useState(project?.listingUrl ?? "");
  const [listingIsFree, setListingIsFree] = useState(project?.listingIsFree ?? false);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [askingDelete, setAskingDelete] = useState(false);

  // ⚠️ Объявлен ДО галереи: useImagePicker получает setError сразу
  // (тот же порядок, что в формах карты).
  const gallery = useImagePicker(
    project
      ? [project.image, ...(project.gallery ?? [])].map(
          (url): GalleryImage => ({ kind: "existing", url })
        )
      : // Фото из Discord уже лежат в нашем бакете (их скопировал вход
        // бота) — для галереи это «сохранённые», а не новые файлы.
        (prefill?.images ?? []).map((url): GalleryImage => ({ kind: "existing", url })),
    setError
  );
  const { images, coverIndex } = gallery;

  function onTitle(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function collect(image: string, galleryUrls: string[]): ProjectInput {
    return {
      slug: slug.trim(),
      title,
      tag,
      summary,
      description,
      priceLabel,
      priceAmount: toNumber(priceAmount),
      sizeLabel,
      sizeX: toNumber(sizeX),
      sizeZ: toNumber(sizeZ),
      deadlineLabel,
      isFeatured,
      sortOrder: toNumber(sortOrder),
      listingUrl: listingUrl.trim() || null,
      listingIsFree,
      image,
      gallery: galleryUrls,
    };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (images.length === 0) {
      setError("Add at least one image. It becomes the cover.");
      return;
    }

    // Сначала поля — с заглушкой вместо картинок, чтобы не грузить
    // файлы ради отказа из-за пустой подписи.
    const preflight = checkProjectInput(collect("/placeholder", []), "");
    if (preflight) {
      setError(preflight);
      return;
    }

    setPending(true);
    try {
      const urls = await Promise.all(
        images.map((image) =>
          image.kind === "existing" ? image.url : uploadImage(image.file, "portfolio")
        )
      );
      const input = collect(
        urls[coverIndex],
        urls.filter((_, i) => i !== coverIndex)
      );

      const response = await fetch("/api/admin/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing
            ? { action: "update", originalSlug: project.slug, project: input }
            : { action: "create", project: input }
        ),
      });
      if (!response.ok) throw new Error(await problemFromGateway(response));

      // Работа из очереди Discord: отметить строку решённой. Отдельным
      // запросом, а не частью сохранения работы: у очереди свой
      // обработчик. Не вышло — работа всё равно сохранена, а строку
      // видно в Inbox, её можно отклонить руками.
      if (inboxKey) {
        await fetch("/api/admin/discord", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_published", key: inboxKey }),
        }).catch(() => undefined);
      }

      router.push("/admin/portfolio");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  // Спрашивает ConfirmDialog, а не confirm() браузера: тот можно заглушить
  // навсегда, и кнопка молча перестаёт работать (шапка ConfirmDialog.tsx).
  async function handleDelete() {
    if (!project) return;
    setAskingDelete(false);
    setPending(true);
    setError(null);
    const response = await fetch("/api/admin/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", slug: project.slug }),
    });
    if (!response.ok) {
      setError(await problemFromGateway(response));
      setPending(false);
      return;
    }
    router.push("/admin/portfolio");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <GalleryPicker picker={gallery} />

      <div className="space-y-4">
        <TextField id="title" label="Title" value={title} onChange={onTitle} required maxLength={PROJECT_LIMITS.title} />
        <div>
          <label htmlFor="slug" className={LABEL}>
            Address{" "}
            <span className="font-normal text-zinc-500 dark:text-zinc-400">
              · soucampus.online/portfolio/{slug || "…"}
            </span>
          </label>
          <input
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            required
            maxLength={PROJECT_LIMITS.slug}
            className={INPUT}
          />
          {editing && slug !== project.slug && (
            <p className="mt-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
              Links to the old address will stop working.
            </p>
          )}
        </div>
        <TextField
          id="tag"
          label="Tag"
          hint={tags.length > 0 ? `· used so far: ${tags.join(", ")}` : undefined}
          value={tag}
          onChange={setTag}
          required
          maxLength={PROJECT_LIMITS.tag}
        />
        <TextField id="summary" label="Short summary" hint="· on the card" value={summary} onChange={setSummary} required maxLength={PROJECT_LIMITS.summary} />
        <div>
          <label htmlFor="description" className={LABEL}>
            Description{" "}
            <span className="font-normal text-zinc-500 dark:text-zinc-400">· on the work page</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            required
            maxLength={PROJECT_LIMITS.description}
            className={`${INPUT} resize-y`}
          />
        </div>
      </div>

      {/* Факты. Подпись — то, что видит человек («€150», «trial»), число
          — для сортировки и площади в футбольных полях; его можно не
          заполнять. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField id="priceLabel" label="Price label" hint="· €150, trial, —" value={priceLabel} onChange={setPriceLabel} required maxLength={PROJECT_LIMITS.label} />
        <TextField id="priceAmount" label="Price, number" hint="· optional" value={priceAmount} onChange={setPriceAmount} />
        <TextField id="sizeLabel" label="Size label" hint="· 250×250" value={sizeLabel} onChange={setSizeLabel} required maxLength={PROJECT_LIMITS.label} />
        <div className="grid grid-cols-2 gap-4">
          <TextField id="sizeX" label="X, blocks" value={sizeX} onChange={setSizeX} />
          <TextField id="sizeZ" label="Z, blocks" value={sizeZ} onChange={setSizeZ} />
        </div>
        <TextField id="deadlineLabel" label="Deadline" hint="· 1 week" value={deadlineLabel} onChange={setDeadlineLabel} required maxLength={PROJECT_LIMITS.label} />
        <TextField id="sortOrder" label="Order" hint="· smaller is earlier; empty = last" value={sortOrder} onChange={setSortOrder} />
      </div>

      <div className="space-y-3">
        <TextField
          id="listingUrl"
          label="Store link"
          hint="· optional, e.g. the BuiltByBit page of a premade"
          value={listingUrl}
          onChange={setListingUrl}
          maxLength={PROJECT_LIMITS.url}
        />
        <Checkbox
          checked={listingIsFree}
          onChange={setListingIsFree}
          disabled={listingUrl.trim() === ""}
          label="It's free there: the button says “Download free” instead of “Buy”"
        />
        <Checkbox
          checked={isFeatured}
          onChange={setIsFeatured}
          label="Show in the big carousel at the top of /portfolio"
        />
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" loading={pending} disabled={pending} className="flex-1">
          {pending ? "Saving…" : editing ? "Save changes" : "Add to portfolio"}
        </Button>
        <Button href="/admin/portfolio" variant="secondary" className="flex-1">
          Cancel
        </Button>
      </div>

      {editing && (
        <div className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <ConfirmDialog
            open={askingDelete}
            title={`Delete “${project.title}” from the portfolio?`}
            description="This can't be undone."
            confirmLabel="Delete"
            danger
            pending={pending}
            onConfirm={handleDelete}
            onCancel={() => setAskingDelete(false)}
          />
          <button
            type="button"
            onClick={() => setAskingDelete(true)}
            disabled={pending}
            className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
          >
            Delete this work
          </button>
        </div>
      )}
    </form>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-orange-500"
      />
      {label}
    </label>
  );
}
