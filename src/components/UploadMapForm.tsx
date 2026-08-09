"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
// Только тип — на рантайм и на размер бандла не влияет (импорт стирается
// при компиляции). Сама библиотека приезжает отдельным файлом, см. ниже.
import type { Editor } from "@tiptap/react";
import { RichTextEditorSkeleton } from "@/components/RichTextEditor";

// Tiptap с ProseMirror — около 668 КБ, и до 2026-08-09 он лежал в бандле
// страницы: браузер обязан был скачать и выполнить его прежде, чем форма
// вообще оживёт. Отсюда «Add a map грузится миллион лет». Теперь он
// отдельным файлом: название, цена, категория и выбор файла работают
// сразу, редактор подъезжает следом на место заглушки.
//
// ssr: false — редактор всё равно не рендерится на сервере
// (immediatelyRender: false), а без этого флага Next попытался бы.
const RichTextEditor = dynamic(
  () => import("@/components/RichTextEditor").then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <RichTextEditorSkeleton /> }
);
import {
  Star,
  Image as ImageIcon,
  DotsSixVertical,
  X,
  FileArrowUp,
} from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { SelectField } from "@/components/SelectField";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import {
  createProduct,
  addProductImages,
  PRODUCT_IMAGES_BUCKET,
  SHOP_CATEGORIES,
  type ProductCategory,
} from "@/lib/products";
import { PRODUCT_FILES_BUCKET } from "@/lib/orders";
import { TextField, PriceField } from "@/components/MapFormParts";
import {
  MAX_IMAGES,
  IMAGES_TOTAL_MAX_BYTES,
  checkImageFile,
  checkMapFile,
  formatBytes,
  safeExtension,
  MAP_FILE_ACCEPT,
} from "@/lib/upload-limits";


// Категории формы = все, кроме "free" — бесплатность определяется ценой
// 0, а не отдельным тегом (см. filterByCategory в products.ts).
const FORM_CATEGORIES = SHOP_CATEGORIES.filter((c) => c.slug !== "free");

type PickedImage = {
  file: File;
  preview: string;
};

/**
 * Форма «Add a map» — единая страница с секциями (тот же приём, что
 * ProfileEditForm), а не мастер из шагов: полей немного, шаг за шагом
 * добавил бы кликов без выгоды.
 *
 * Отправка последовательная: файл карты → картинки → сама строка
 * products → product_images. Промежуточная неудача не оставляет
 * "полу-опубликованный" товар видимым — до успешного createProduct
 * никакой строки products вообще не существует, а после него товар
 * всё равно скрыт (status=pending, is_published=false), пока владелец
 * не одобрит вручную. Поэтому отдельный откат при частичном сбое не
 * нужен — просто показываем ошибку и даём попробовать ещё раз.
 */
export function UploadMapForm({ userId }: { userId: string }) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [category, setCategory] = useState<ProductCategory>(FORM_CATEGORIES[0].slug);

  const [images, setImages] = useState<PickedImage[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const dragIndex = useRef<number | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  const [mapFile, setMapFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Какой шаг отправки идёт сейчас. Нужен только ради подписи на кнопке:
  // файл карты может грузиться минутами, и без этого непонятно, работает
  // процесс или завис. Настоящего процента здесь нет намеренно —
  // supabase-js на обычной загрузке прогресс не отдаёт, а гнаться за ним
  // (XHR/tus) ради подписи не стоит.
  const [stage, setStage] = useState<"file" | "images" | "saving">("file");

  const STAGE_LABEL: Record<typeof stage, string> = {
    file: "Uploading map file…",
    images: "Uploading images…",
    saving: "Saving…",
  };

  // Редактор приезжает из RichTextEditor и кладёт себя сюда, когда
  // догрузится. До этого момента он null — форма уже работает, просто
  // описание ещё нельзя набирать (см. проверку в submit).
  const [editor, setEditor] = useState<Editor | null>(null);

  async function pickImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // тот же файл можно выбрать снова
    if (files.length === 0) return;

    if (images.length + files.length > MAX_IMAGES) {
      setError(`You can upload up to ${MAX_IMAGES} images.`);
      return;
    }

    // Каждая картинка — по сигнатуре, а не по MIME-типу от браузера
    // (его подделывает любой, кто переименовал файл).
    for (const file of files) {
      const problem = await checkImageFile(file);
      if (problem) {
        setError(problem);
        return;
      }
    }

    // Общий вес галереи: пятнадцать картинок по 5 МБ — это 75 МБ на один
    // товар, поэтому потолок есть и у суммы, не только у каждой отдельно.
    const already = images.reduce((sum, i) => sum + i.file.size, 0);
    const adding = files.reduce((sum, f) => sum + f.size, 0);
    if (already + adding > IMAGES_TOTAL_MAX_BYTES) {
      setError(
        `All images together must be ${formatBytes(IMAGES_TOTAL_MAX_BYTES)} or less — these add up to ${formatBytes(already + adding)}.`
      );
      return;
    }

    setError(null);
    setImages((prev) => [
      ...prev,
      ...files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
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

  // Нативный drag & drop HTML5 — без новой зависимости для одной
  // фичи "перетащить миниатюру". dragIndex — обычный ref, не state:
  // сама перестановка не должна триггерить лишний рендер посреди жеста.
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

  // Картинка внутрь описания. В отличие от галереи, грузится СРАЗУ (а не
  // при отправке формы): редактор должен показать её на месте немедленно,
  // а хранить её как object URL до сабмита значило бы потом искать все
  // такие ссылки в готовом HTML и подменять. Побочный эффект: если
  // креатор передумает и не отправит форму, файл останется в бакете
  // сиротой — приемлемо, это несколько килобайт в своей же папке.
  const descImageInput = useRef<HTMLInputElement>(null);

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
    const ext = safeExtension(file.name, "jpg");
    const path = `${userId}/desc-${Date.now()}.${ext}`;

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
    // Размер И сигнатура: переименованный .exe с расширением .zip
    // отсекается здесь, до того как попадёт в бакет и к покупателю.
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
      setError("Add at least one image.");
      return;
    }
    if (!mapFile) {
      setError("Attach the map file.");
      return;
    }
    const priceEuros = Number(priceInput.replace(",", "."));
    if (!Number.isFinite(priceEuros) || priceEuros < 0) {
      setError("Enter a valid price (0 for a free map).");
      return;
    }
    const description = editor?.getHTML() ?? "";
    if (!editor || editor.isEmpty) {
      setError("Write a description.");
      return;
    }

    setPending(true);
    setStage("file");
    const supabase = createSupabaseBrowser();
    // Общий префикс для файла и всех картинок этого товара — папка на
    // человека же остаётся плоской, а имена не пересекаются с другими
    // товарами того же креатора.
    const stamp = Date.now();

    try {
      // 1) Файл карты — в приватный бакет, путь под свою папку (RLS).
      const fileExt = safeExtension(mapFile.name, "zip");
      const filePath = `${userId}/${stamp}-map.${fileExt}`;
      const { error: fileError } = await supabase.storage
        .from(PRODUCT_FILES_BUCKET)
        .upload(filePath, mapFile, { contentType: mapFile.type || "application/octet-stream" });
      if (fileError) throw new Error(`Couldn't upload the map file: ${fileError.message}`);

      // 2) Картинки — в публичный бакет. ПАРАЛЛЕЛЬНО (Promise.all), а не
      // по очереди: загрузки друг от друга не зависят, и очередь просто
      // складывала их время. Порядок результатов Promise.all совпадает с
      // порядком входного массива, поэтому coverIndex остаётся валиден.
      setStage("images");
      const imageUrls = await Promise.all(
        images.map(async (img, i) => {
          const ext = safeExtension(img.file.name, "jpg");
          const path = `${userId}/${stamp}-${i}.${ext}`;
          const { error: imgError } = await supabase.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .upload(path, img.file, { contentType: img.file.type });
          if (imgError) throw new Error(`Couldn't upload an image: ${imgError.message}`);
          const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
          return data.publicUrl;
        })
      );
      const coverUrl = imageUrls[coverIndex];
      const galleryUrls = imageUrls.filter((_, i) => i !== coverIndex);

      // 3) Строка товара + галерея.
      setStage("saving");
      const { id } = await createProduct(supabase, {
        creatorId: userId,
        title: title.trim(),
        summary: summary.trim(),
        description,
        imageUrl: coverUrl,
        priceCents: Math.round(priceEuros * 100),
        category: category as Exclude<ProductCategory, "free">,
        filePath,
      });
      await addProductImages(supabase, id, galleryUrls);

      router.push("/creator/upload/submitted");
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
      {/* Images */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Images <span className="font-normal text-zinc-500 dark:text-zinc-400">— first drag order sets gallery order, star sets the cover</span>
        </label>

        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img, index) => (
            <div
              key={img.preview}
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
              <img src={img.preview} alt="" className="h-full w-full object-cover" />

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

              <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-zinc-950/40 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <DotsSixVertical size={14} weight="bold" />
              </span>

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
              <ImageIcon size={22} />
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

      {/* Title / summary */}
      <div className="space-y-4">
        <TextField id="title" label="Title" value={title} onChange={setTitle} required />
        <TextField id="summary" label="Short summary" value={summary} onChange={setSummary} required maxLength={140} />
      </div>

      {/* Category + price */}
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

      {/* Description — Tiptap WYSIWYG */}
      <div>
        <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Description
        </span>
        <RichTextEditor
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
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          Add screenshots and tables anywhere in the description — this is the
          full page buyers read.
        </p>
      </div>

      {/* Map file */}
      <div>
        <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Map file <span className="font-normal text-zinc-500 dark:text-zinc-400">— .zip, .schem or .schematic, up to 15 MB</span>
        </span>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-zinc-950/[0.15] px-4 py-3.5 text-left text-sm text-zinc-500 transition-colors hover:border-orange-500 hover:text-orange-600 dark:border-zinc-50/[0.15] dark:text-zinc-400 dark:hover:border-orange-400 dark:hover:text-orange-400"
        >
          <FileArrowUp size={20} />
          {mapFile ? (
            <span className="truncate text-zinc-950 dark:text-zinc-50">{mapFile.name}</span>
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
          {pending ? STAGE_LABEL[stage] : "Submit for review"}
        </Button>
        <Button href="/resources" variant="secondary" className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}
