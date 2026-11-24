"use client";

import { useEffect, useRef, useState } from "react";
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
import { FileArrowUp, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { SelectField } from "@/components/SelectField";
import { TextField, PriceField, RequiredMark, RequiredLegend } from "@/components/MapFormParts";
import { VirusCheckedNote } from "@/components/VirusCheckedNote";
import {
  SHOP_CATEGORIES,
  type ProductCategory,
} from "@/lib/products";
import { uploadImage, uploadMapFile } from "@/lib/upload-client";
import { updateMap } from "@/lib/map-client";
import type { EditableProduct } from "@/lib/moderation";
import { templateFor } from "@/lib/rejection";
import { SpecFields } from "@/components/SpecFields";
import { ReactionPicker } from "@/components/ReactionPicker";
import type { ReactionOption } from "@/lib/reactions";
import {
  checkImageFile,
  checkMapFile,
  MAP_FILE_ACCEPT,
} from "@/lib/upload-limits";
import {
  GalleryPicker,
  useImagePicker,
  type GalleryImage,
} from "@/components/GalleryPicker";
import { useUnsavedGuard } from "@/lib/use-unsaved-guard";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const FORM_CATEGORIES = SHOP_CATEGORIES.filter((c) => c.slug !== "free");

/**
 * Редактирование уже созданной карты.
 *
 * Отдельный компонент, а не режим UploadMapForm: у создания и правки
 * разные обязательные поля (при правке файл и картинки уже есть, менять
 * их необязательно), разный результат (создание против правки) и разные
 * последствия — замена файла у опубликованной карты снимает её с витрины
 * и отправляет на повторную проверку. Свести это в один компонент через
 * флаги означало бы форму, где половина логики под `if (isEdit)`.
 *
 * ⚠️ Где теперь живёт это «снимает с витрины»: с 2026-09-13 в шлюзе
 * (/api/creator/map), а не в триггере guard_product_author_edit. Триггер
 * цел и остаётся вторым рубежом, но служебный ключ он пропускает — а
 * шлюз пишет именно им.
 */
export function EditMapForm({
  product,
  reactionOptions,
  doneHref,
  freeOnly = false,
}: {
  product: EditableProduct;
  /** Список реакций из базы — читает его страница, форма клиентская. */
  reactionOptions: ReactionOption[];
  /**
   * Куда после сохранения и по Cancel. Дверей к форме две — каталог
   * админки и кабинет автора, — и вернуть надо туда, откуда пришли.
   */
  doneHref: string;
  /** Платная цена закрыта (paid-maps.ts): сохранится цена 0. */
  freeOnly?: boolean;
}) {
  const router = useRouter();
  const refresh = useRefresh();

  const [title, setTitle] = useState(product.title);
  const [summary, setSummary] = useState(product.summary);
  const [priceInput, setPriceInput] = useState((product.priceCents / 100).toFixed(2));
  const [category, setCategory] = useState<ProductCategory>(
    product.category ?? FORM_CATEGORIES[0].slug
  );

  // ⚠️ Ошибка объявлена ДО галереи, и порядок здесь имеет значение:
  // useImagePicker получает setError аргументом, то есть вычисляет его в
  // момент вызова. Объявить ниже — получить ReferenceError на первом же
  // рендере, а не удобную «поднятую» переменную: const не всплывает.
  const [error, setError] = useState<string | null>(null);

  const gallery = useImagePicker(
    product.images.map((url): GalleryImage => ({ kind: "existing", url })),
    setError
  );
  const { images, coverIndex } = gallery;

  // Новый файл карты — необязателен: не тронул, значит остаётся старый.
  const [mapFile, setMapFile] = useState<File | null>(null);
  // Характеристики — тем же компонентом, что и на загрузке (SpecFields).
  // Набор обязан совпадать до последнего пункта: разъедутся — автор при
  // первой правке потеряет то, что отметил при загрузке.
  const [specs, setSpecs] = useState(product.specs);
  const [reactionOptionId, setReactionOptionId] = useState(product.reactionOptionId);
  const fileInput = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState(false);

  const descImageInput = useRef<HTMLInputElement>(null);
  // Как в форме загрузки: прошла ли картинка описания антивирус (24.11).
  const [descChecked, setDescChecked] = useState<boolean | null>(null);

  // Редактор кладёт себя сюда, когда догрузится (см. RichTextEditor).
  const [editor, setEditor] = useState<Editor | null>(null);

  // Изменилось ли описание. HTML сравниваем с тем, что выдал САМ редактор
  // при загрузке, а не с product.description: Tiptap нормализует разметку
  // (атрибуты, пустые абзацы), и сравнение с исходной строкой считало бы
  // «изменённым» нетронутое описание.
  const initialDescription = useRef<string | null>(null);
  const [descriptionChanged, setDescriptionChanged] = useState(false);
  useEffect(() => {
    if (!editor) return;
    initialDescription.current = editor.getHTML();
    const onUpdate = () =>
      setDescriptionChanged(editor.getHTML() !== initialDescription.current);
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
    };
  }, [editor]);

  // Save changes неактивна, пока ничего не поменяли (24.11, просьба
  // владельца — так же, как в настройках профиля). Исключение —
  // отклонённая и приостановленная карта: там кнопка «Resubmit», и
  // отправить её заново — само по себе действие.
  const imagesChanged =
    images.length !== product.images.length ||
    coverIndex !== 0 ||
    images.some(
      (image, i) => image.kind === "new" || image.url !== product.images[i]
    );
  const changed =
    title !== product.title ||
    summary !== product.summary ||
    priceInput !== (product.priceCents / 100).toFixed(2) ||
    category !== (product.category ?? FORM_CATEGORIES[0].slug) ||
    imagesChanged ||
    mapFile !== null ||
    JSON.stringify(specs) !== JSON.stringify(product.specs) ||
    reactionOptionId !== product.reactionOptionId ||
    descriptionChanged;
  const isResubmit = product.state === "rejected" || product.state === "suspended";
  const guard = useUnsavedGuard(changed, pending);

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

    // Через шлюз (/api/creator/image): путь строит сервер, он же
    // проверяет права, вес и первые байты уже загруженного объекта.
    try {
      const url = await uploadImage(file, "product", setDescChecked);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload the image.");
    }
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
        setError("You were asked to re-upload the map file. Pick a new file before resubmitting.");
        return;
      }
      if (requirement === "images" && !images.some((i) => i.kind === "new")) {
        setError("You were asked to replace the screenshots. Add at least one new image before resubmitting.");
        return;
      }
    }
    const priceEuros = freeOnly ? 0 : Number(priceInput.replace(",", "."));
    if (!Number.isFinite(priceEuros) || priceEuros < 0) {
      setError("Enter a valid price (0 for a free map).");
      return;
    }
    if (!editor || editor.isEmpty) {
      setError("Write a description.");
      return;
    }

    setPending(true);

    try {
      // 1) Новый файл карты — только если выбрали. Не выбрали — ниже
      // уходит null, и сервер оставляет прежний путь: повторная
      // проверка не начинается.
      let filePath: string | null = null;
      if (mapFile) {
        // Через шлюз — путь называет сервер, он же проверяет размер и
        // сигнатуру уже загруженного объекта. Разбор — в шапке
        // src/app/api/creator/upload/route.ts.
        filePath = await uploadMapFile(mapFile);
      }

      // 2) Новые картинки — параллельно; уже сохранённые остаются как есть.
      const uploads = await Promise.all(
        images.map(async (image) => {
          if (image.kind === "existing") return image.url;
          return uploadImage(image.file, "product");
        })
      );

      const coverUrl = uploads[coverIndex];
      const galleryUrls = uploads.filter((_, i) => i !== coverIndex);

      // 3) Сама карта — одним вызовом шлюза (/api/creator/map).
      //
      // ⚠️ Отсюда ушли ТРИ вещи, и стоит знать какие. Во-первых, сам
      // update: таблицу products из браузера больше не пишет никто,
      // политика снята. Во-вторых, галерея — сервер сам решает, менялась
      // ли она, и сам зовёт replace_product_images. В-третьих (и это
      // важнее всего), состояние: замена файла у живой карты снимает её
      // с витрины, и раньше это делал триггер базы, а теперь —
      // обработчик, потому что под служебным ключом триггер молчит.
      // Разбор — в шапке src/app/api/creator/map/route.ts.
      await updateMap(product.id, {
        title: title.trim(),
        summary: summary.trim(),
        description: editor.getHTML(),
        coverUrl,
        galleryUrls,
        priceCents: Math.round(priceEuros * 100),
        category,
        // null означает «файл не меняли». Новый путь называет шлюз
        // загрузки, старый сервер и так знает.
        filePath: mapFile ? filePath : null,
        specs,
        reactionOptionId,
      });

      // 5) Уборка мусора в Storage — старые файл и картинки, на которые
      // больше никто не ссылается. Намеренно НЕ ждём результата и не
      // показываем ошибку: сохранение уже прошло, и упавшая уборка не
      // повод пугать человека — мусор подберётся при следующем разе.
      fetch("/api/creator/cleanup-storage", { method: "POST" }).catch(() => {});

      router.push(doneHref);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-3xl border border-zinc-200 bg-[#fbfbff] p-6 dark:border-zinc-800 dark:bg-zinc-950 sm:p-8"
    >
      <RequiredLegend />

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
            This map is live. Text and images update right away, but
            <strong> replacing the map file </strong> takes it off the marketplace
            until it&apos;s reviewed again.
          </span>
        </p>
      )}

      {/* Две колонки с lg (24.11, просьба владельца: «не мотать так много
          вниз»): картинки справа липкой колонкой, всё остальное слева. На
          телефоне — одна колонка, картинки первыми, как было. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="order-first lg:order-last">
          <div className="lg:sticky lg:top-24">
            <GalleryPicker picker={gallery} compact />
          </div>
        </div>

        <div className="min-w-0 space-y-8">
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
            />
            <PriceField value={priceInput} onChange={setPriceInput} freeOnly={freeOnly} />
          </div>

          {/* Характеристики — на том же месте и в том же порядке, что в
              форме загрузки: правка не должна выглядеть другой формой. */}
          <SpecFields value={specs} onChange={setSpecs} />

          <ReactionPicker
            options={reactionOptions}
            value={reactionOptionId}
            onChange={setReactionOptionId}
          />

          <div>
            <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Description
              <RequiredMark />
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
            {descChecked && (
              <div className="mt-2">
                <VirusCheckedNote>Image checked for viruses</VirusCheckedNote>
              </div>
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Map file{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">
                · leave it alone to keep the current one
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
            {/* Предупреждение — как только выбран новый файл у живой
                карты, до сохранения (24.11). Плашка сверху говорит об
                этом заранее; здесь — в момент решения. */}
            {mapFile && product.state === "live" && (
              <p className="mt-2 flex gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
                <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
                Saving sends the map back to review: it leaves the marketplace until the new file is checked.
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          variant="primary"
          loading={pending} disabled={pending || (!changed && !isResubmit)}
          className="flex-1"
        >
          {pending
            ? mapFile || images.some((i) => i.kind === "new")
              ? "Uploading and checking…"
              : "Saving…"
            : isResubmit
              ? "Resubmit for review"
              : "Save changes"}
        </Button>
        <Button href={doneHref} variant="secondary" className="flex-1">
          Cancel
        </Button>
      </div>
      {/* «Уйти без сохранения?» — ссылка, «назад» в браузере (24.11,
          use-unsaved-guard.ts). На перезагрузку браузер покажет своё. */}
      <ConfirmDialog
        open={guard.open}
        title="Leave without saving?"
        description="Your changes on this page will be lost."
        confirmLabel="Leave"
        cancelLabel="Back to editing"
        onConfirm={guard.leave}
        onCancel={guard.stay}
      />
    </form>
  );
}

/**
 * Причина отказа над формой правки. Над формой, а не в ней: человек
 * пришёл именно её исправлять, и искать её он не должен. Одна на обе
 * двери к форме — админку и кабинет автора.
 */
export function RejectionNote({ product }: { product: EditableProduct }) {
  if (product.state !== "rejected" || !product.rejectionReason) return null;
  return (
    <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
      <span className="font-semibold">Why it was rejected: </span>
      {product.rejectionReason}
    </p>
  );
}
