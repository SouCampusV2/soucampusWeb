"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRefresh } from "@/lib/useRefresh";
import dynamic from "next/dynamic";
// Только тип — стирается при компиляции, в бандл не попадает.
import type { Editor } from "@tiptap/react";
import { RichTextEditorSkeleton } from "@/components/RichTextEditor";

// Ленивая загрузка редактора — та же причина, что в UploadMapForm: Tiptap
// с ProseMirror весит около 668 КБ и держал форму мёртвой, пока грузился.
const RichTextEditor = dynamic(
  () => import("@/components/RichTextEditor").then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <RichTextEditorSkeleton /> }
);
import { Star, X, FileArrowUp, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { SelectField } from "@/components/SelectField";
import { TextField, PriceField } from "@/components/MapFormParts";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import {
  PRODUCT_IMAGES_BUCKET,
  SHOP_CATEGORIES,
  type ProductCategory,
} from "@/lib/products";
import { PRODUCT_FILES_BUCKET } from "@/lib/orders";
import type { EditableProduct } from "@/lib/moderation";
import { templateFor } from "@/lib/rejection";
import { SpecFields, specsToColumns } from "@/components/SpecFields";
import {
  MAX_IMAGES,
  IMAGES_TOTAL_MAX_BYTES,
  checkImageFile,
  checkMapFile,
  formatBytes,
  safeExtension,
  MAP_FILE_ACCEPT,
} from "@/lib/upload-limits";

const FORM_CATEGORIES = SHOP_CATEGORIES.filter((c) => c.slug !== "free");

// Картинка в галерее — либо уже сохранённая (только url), либо только что
// выбранная (файл + локальный превью). Один тип на оба случая, чтобы
// перетаскивание и выбор обложки работали одинаково и не пришлось
// держать два параллельных массива с синхронизацией индексов.
type GalleryImage =
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; preview: string };

function imageSrc(image: GalleryImage): string {
  return image.kind === "existing" ? image.url : image.preview;
}

/**
 * Редактирование уже созданной карты.
 *
 * Отдельный компонент, а не режим UploadMapForm: у создания и правки
 * разные обязательные поля (при правке файл и картинки уже есть, менять
 * их необязательно), разный результат (insert против update) и разные
 * последствия — замена файла у опубликованной карты снимает её с витрины
 * и отправляет на повторную проверку (триггер guard_product_publication,
 * миграция 20260730160000). Свести это в один компонент через флаги
 * означало бы форму, где половина логики под `if (isEdit)`.
 */
export function EditMapForm({
  product,
  userId,
}: {
  product: EditableProduct;
  userId: string;
}) {
  const router = useRouter();
  const refresh = useRefresh();

  const [title, setTitle] = useState(product.title);
  const [summary, setSummary] = useState(product.summary);
  const [priceInput, setPriceInput] = useState((product.priceCents / 100).toFixed(2));
  const [category, setCategory] = useState<ProductCategory>(
    product.category ?? FORM_CATEGORIES[0].slug
  );

  const [images, setImages] = useState<GalleryImage[]>(
    product.images.map((url) => ({ kind: "existing", url }))
  );
  const [coverIndex, setCoverIndex] = useState(0);
  const dragIndex = useRef<number | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  // Новый файл карты — необязателен: не тронул, значит остаётся старый.
  const [mapFile, setMapFile] = useState<File | null>(null);
  // Характеристики — тем же компонентом, что и на загрузке (SpecFields).
  // Набор обязан совпадать до последнего пункта: разъедутся — автор при
  // первой правке потеряет то, что отметил при загрузке.
  const [specs, setSpecs] = useState(product.specs);
  const fileInput = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const descImageInput = useRef<HTMLInputElement>(null);

  // Редактор кладёт себя сюда, когда догрузится (см. RichTextEditor).
  const [editor, setEditor] = useState<Editor | null>(null);

  async function pickImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    if (images.length + files.length > MAX_IMAGES) {
      setError(`You can have up to ${MAX_IMAGES} images.`);
      return;
    }
    for (const file of files) {
      const problem = await checkImageFile(file);
      if (problem) {
        setError(problem);
        return;
      }
    }
    // Суммарный вес считаем только по НОВЫМ файлам: уже загруженные
    // лежат в бакете, их размер нам здесь неизвестен и заново он никуда
    // не едет.
    const adding = files.reduce((sum, f) => sum + f.size, 0);
    const pendingBytes = images.reduce(
      (sum, i) => sum + (i.kind === "new" ? i.file.size : 0),
      0
    );
    if (pendingBytes + adding > IMAGES_TOTAL_MAX_BYTES) {
      setError(
        `New images together must be ${formatBytes(IMAGES_TOTAL_MAX_BYTES)} or less.`
      );
      return;
    }

    setError(null);
    setImages((prev) => [
      ...prev,
      ...files.map(
        (file): GalleryImage => ({
          kind: "new",
          file,
          preview: URL.createObjectURL(file),
        })
      ),
    ]);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setCoverIndex((prev) => {
      if (index === prev) return 0;
      if (index < prev) return prev - 1;
      return prev;
    });
  }

  function reorderImages(from: number, to: number) {
    if (from === to) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setCoverIndex((prev) => {
      if (prev === from) return to;
      if (from < prev && to >= prev) return prev - 1;
      if (from > prev && to <= prev) return prev + 1;
      return prev;
    });
  }

  async function insertDescriptionImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;
    const problem = await checkImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);

    const supabase = createSupabaseBrowser();
    const path = `${userId}/desc-${Date.now()}.${safeExtension(file.name, "jpg")}`;
    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(path, file, { contentType: file.type });
    if (uploadError) {
      setError(`Couldn't upload the image: ${uploadError.message}`);
      return;
    }
    const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
    editor.chain().focus().setImage({ src: data.publicUrl }).run();
  }

  async function pickMapFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const problem = await checkMapFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setMapFile(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (images.length === 0) {
      setError("Keep at least one image.");
      return;
    }

    // Проверка ресабмита: если карту отклонили с требованием заменить
    // файл или скриншоты, отправить её обратно НЕ ИЗМЕНИВ их — значит
    // прислать модератору ровно то же самое. Проверяем только то, что
    // проверяемо по факту (новый файл, изменившийся набор картинок);
    // «перепиши описание» так не проверить, и притворяться, что можно,
    // мы не будем — см. requiresChange в lib/rejection.ts.
    for (const flag of product.rejectionFlags) {
      const requirement = templateFor(flag)?.requiresChange;
      if (requirement === "file" && !mapFile) {
        setError("You were asked to re-upload the map file — pick a new file before resubmitting.");
        return;
      }
      if (requirement === "images" && !images.some((i) => i.kind === "new")) {
        setError("You were asked to replace the screenshots — add at least one new image before resubmitting.");
        return;
      }
    }
    const priceEuros = Number(priceInput.replace(",", "."));
    if (!Number.isFinite(priceEuros) || priceEuros < 0) {
      setError("Enter a valid price (0 for a free map).");
      return;
    }
    if (!editor || editor.isEmpty) {
      setError("Write a description.");
      return;
    }

    setPending(true);
    const supabase = createSupabaseBrowser();
    const stamp = Date.now();

    try {
      // 1) Новый файл карты — только если выбрали. Иначе file_path
      // остаётся прежним, и триггер повторной модерации не срабатывает.
      let filePath = product.filePath;
      if (mapFile) {
        filePath = `${userId}/${stamp}-map.${safeExtension(mapFile.name, "zip")}`;
        const { error: fileError } = await supabase.storage
          .from(PRODUCT_FILES_BUCKET)
          .upload(filePath, mapFile, {
            contentType: mapFile.type || "application/octet-stream",
          });
        if (fileError) throw new Error(`Couldn't upload the map file: ${fileError.message}`);
      }

      // 2) Новые картинки — параллельно; уже сохранённые остаются как есть.
      const uploads = await Promise.all(
        images.map(async (image, i) => {
          if (image.kind === "existing") return image.url;
          const path = `${userId}/${stamp}-${i}.${safeExtension(image.file.name, "jpg")}`;
          const { error: imgError } = await supabase.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .upload(path, image.file, { contentType: image.file.type });
          if (imgError) throw new Error(`Couldn't upload an image: ${imgError.message}`);
          const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
          return data.publicUrl;
        })
      );

      const coverUrl = uploads[coverIndex];
      const galleryUrls = uploads.filter((_, i) => i !== coverIndex);

      // 3) Сама строка. Состояние (state) намеренно НЕ передаём: его
      // всё равно вернёт на место триггер (публиковать себя сам креатор
      // не может), а отправлять поля, которые будут проигнорированы —
      // значит врать читателю кода.
      const { error: updateError } = await supabase
        .from("products")
        .update({
          title: title.trim(),
          summary: summary.trim(),
          description: editor.getHTML(),
          image_url: coverUrl,
          price_cents: Math.round(priceEuros * 100),
          price_label: `€${priceEuros.toFixed(2)}`,
          category,
          file_path: filePath,
          ...specsToColumns(specs),
          // Вес пишем ТОЛЬКО когда файл заменили: иначе правка описания
          // затирала бы верный размер нулём.
          ...(mapFile ? { file_size_bytes: mapFile.size } : {}),
        })
        .eq("id", product.id);

      if (updateError) throw new Error(`Couldn't save: ${updateError.message}`);

      // 4) Галерея. Два отдельных решения, оба по делу.
      //
      // Первое: если состав и порядок не изменились, не трогаем её
      // вообще. Раньше каждое сохранение переписывало все строки, даже
      // когда правили одну запятую в описании, — а вместе с ними
      // менялись id и created_at, то есть история переписывалась на
      // ровном месте.
      //
      // Второе: когда писать всё же нужно, это ОДИН вызов функции в
      // транзакции, а не delete + insert подряд. У двух запросов между
      // ними есть окно, в котором у товара ноль картинок: оборвалась
      // связь после delete — и галерея потеряна целиком. Ровно эту
      // болезнь уже лечили у заказов (record_paid_order), лечим и здесь.
      const previousGallery = product.images.slice(1);
      const galleryUnchanged =
        product.image === coverUrl &&
        previousGallery.length === galleryUrls.length &&
        previousGallery.every((url, i) => url === galleryUrls[i]);

      if (!galleryUnchanged) {
        const { error: galleryError } = await supabase.rpc("replace_product_images", {
          p_product_id: product.id,
          p_urls: galleryUrls,
        });
        if (galleryError) {
          throw new Error(`Couldn't save the gallery: ${galleryError.message}`);
        }
      }

      // 5) Уборка мусора в Storage — старые файл и картинки, на которые
      // больше никто не ссылается. Намеренно НЕ ждём результата и не
      // показываем ошибку: сохранение уже прошло, и упавшая уборка не
      // повод пугать человека — мусор подберётся при следующем разе.
      fetch("/api/creator/cleanup-storage", { method: "POST" }).catch(() => {});

      router.push("/resources");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 dark:border-zinc-800 dark:bg-zinc-950"
    >
      {/* Чек-лист из отказа — первым делом: человек пришёл сюда чинить
          именно это. Пункты, которые мы проверим при отправке, помечены
          отдельно, чтобы отказ не выглядел набором пожеланий. */}
      {product.state === "rejected" && product.rejectionFlags.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm font-semibold text-red-800 dark:text-red-200">
            Fix these before resubmitting
          </p>
          <ul className="mt-2 space-y-1.5">
            {product.rejectionFlags.map((flag) => {
              const template = templateFor(flag);
              if (!template) return null;
              return (
                <li
                  key={flag}
                  className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300"
                >
                  <span aria-hidden className="mt-0.5">•</span>
                  <span>
                    {template.label}
                    {template.requiresChange && (
                      <span className="ml-1 text-xs opacity-75">(required)</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-red-700/80 dark:text-red-300/80">
            Saving sends the map back for review.
          </p>
        </div>
      )}

      {/* Предупреждение о повторной модерации — до того, как человек
          выберет новый файл, а не после отправки формы. */}
      {product.state === "live" && (
        <p className="flex gap-2.5 rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
          <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
          <span>
            This map is live. Text and images update right away — but
            <strong> replacing the map file </strong> takes it off the marketplace
            until it&apos;s reviewed again.
          </span>
        </p>
      )}

      {/* Images */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Images{" "}
          <span className="font-normal text-zinc-500 dark:text-zinc-400">
            — drag to reorder, star sets the cover
          </span>
        </label>

        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image, index) => (
            <div
              key={imageSrc(image)}
              draggable
              onDragStart={() => (dragIndex.current = index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex.current !== null) reorderImages(dragIndex.current, index);
                dragIndex.current = null;
              }}
              className="group relative aspect-video cursor-grab overflow-hidden rounded-xl border border-zinc-950/[0.08] active:cursor-grabbing dark:border-zinc-50/[0.08]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc(image)} alt="" className="h-full w-full object-cover" />

              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute right-1.5 top-1.5 rounded-full bg-zinc-950/50 p-1 text-white opacity-0 transition-opacity hover:bg-zinc-950/80 group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X size={14} weight="bold" />
              </button>

              <button
                type="button"
                onClick={() => setCoverIndex(index)}
                className={`absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition-colors ${
                  coverIndex === index
                    ? "bg-orange-500 text-zinc-950"
                    : "bg-zinc-950/50 text-white opacity-0 hover:bg-zinc-950/80 group-hover:opacity-100"
                }`}
              >
                <Star size={12} weight={coverIndex === index ? "fill" : "regular"} />
                {coverIndex === index ? "Cover" : "Set as cover"}
              </button>
            </div>
          ))}

          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => imageInput.current?.click()}
              className="flex aspect-video flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-950/[0.15] text-zinc-500 transition-colors hover:border-orange-500 hover:text-orange-600 dark:border-zinc-50/[0.15] dark:text-zinc-400 dark:hover:border-orange-400 dark:hover:text-orange-400"
            >
              <span className="text-xs font-medium">Add photo</span>
            </button>
          )}
        </div>
        <input
          ref={imageInput}
          type="file"
          accept="image/*"
          multiple
          onChange={pickImages}
          className="hidden"
        />
      </div>

      <div className="space-y-4">
        <TextField id="title" label="Title" value={title} onChange={setTitle} required />
        <TextField
          id="summary"
          label="Short summary"
          value={summary}
          onChange={setSummary}
          required
          maxLength={140}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          id="category"
          label="Category"
          value={category}
          onChange={(v) => setCategory(v as ProductCategory)}
          options={FORM_CATEGORIES.map((c) => ({ value: c.slug, label: c.label }))}
          required
        />
        <PriceField value={priceInput} onChange={setPriceInput} />
      </div>

      {/* Характеристики — на том же месте и в том же порядке, что в
          форме загрузки: правка не должна выглядеть другой формой. */}
      <SpecFields value={specs} onChange={setSpecs} />

      <div>
        <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Description
        </span>
        <RichTextEditor
          content={product.description}
          onReady={setEditor}
          onPickImage={() => descImageInput.current?.click()}
        />
        <input
          ref={descImageInput}
          type="file"
          accept="image/*"
          onChange={insertDescriptionImage}
          className="hidden"
        />
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Map file{" "}
          <span className="font-normal text-zinc-500 dark:text-zinc-400">
            — leave it alone to keep the current one
          </span>
        </span>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-zinc-950/[0.15] px-4 py-3.5 text-left text-sm text-zinc-500 transition-colors hover:border-orange-500 hover:text-orange-600 dark:border-zinc-50/[0.15] dark:text-zinc-400 dark:hover:border-orange-400 dark:hover:text-orange-400"
        >
          <FileArrowUp size={20} />
          {mapFile ? (
            <span className="truncate text-zinc-950 dark:text-zinc-50">{mapFile.name}</span>
          ) : product.filePath ? (
            "Replace the current file"
          ) : (
            "Click to choose a file"
          )}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={MAP_FILE_ACCEPT}
          onChange={pickMapFile}
          className="hidden"
        />
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={pending} className="flex-1">
          {pending
            ? "Saving…"
            : product.state === "rejected" || product.state === "suspended"
              ? "Resubmit for review"
              : "Save changes"}
        </Button>
        <Button href="/resources" variant="secondary" className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}
