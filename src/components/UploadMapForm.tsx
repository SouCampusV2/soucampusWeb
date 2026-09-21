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
import { FileArrowUp } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { SelectField } from "@/components/SelectField";
import {
  EMPTY_SPECS,
  SHOP_CATEGORIES,
  type EditableSpecs,
  type ProductCategory,
} from "@/lib/products";
import { uploadImage, uploadMapFile } from "@/lib/upload-client";
import { createMap } from "@/lib/map-client";
import { TextField, PriceField } from "@/components/MapFormParts";
import {
  checkImageFile,
  checkMapFile,
  MAP_FILE_ACCEPT,
} from "@/lib/upload-limits";
import { GalleryPicker, useImagePicker } from "@/components/GalleryPicker";
import { SpecFields } from "@/components/SpecFields";
import { ReactionPicker } from "@/components/ReactionPicker";
import type { ReactionOption } from "@/lib/reactions";


// Категории формы = все, кроме "free" — бесплатность определяется ценой
// 0, а не отдельным тегом (см. filterByCategory в products.ts).
const FORM_CATEGORIES = SHOP_CATEGORIES.filter((c) => c.slug !== "free");

/**
 * Форма «Add a map» — единая страница с секциями (тот же приём, что
 * ProfileEditForm), а не мастер из шагов: полей немного, шаг за шагом
 * добавил бы кликов без выгоды.
 *
 * Отправка последовательная: файл карты → картинки → сама карта. С
 * 21.09 все три шага идут через свои обработчики: форма не называет ни
 * одного пути в Storage и ни одного состояния карты — см.
 * ARCHITECTURE.md § 5.3–5.4.
 *
 * Промежуточная неудача не оставляет «полу-опубликованный» товар
 * видимым: до последнего шага строки products вообще не существует, а
 * после него карта всё равно скрыта (state = pending), пока владелец не
 * одобрит вручную. Поэтому отдельный откат при частичном сбое не нужен —
 * показываем ошибку и даём попробовать ещё раз.
 */
export function UploadMapForm({
  reactionOptions,
}: {
  /** Список реакций из базы — читает его страница, форма клиентская. */
  reactionOptions: ReactionOption[];
}) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [category, setCategory] = useState<ProductCategory>(FORM_CATEGORIES[0].slug);

  // ⚠️ Ошибка объявлена ДО галереи: useImagePicker получает setError
  // аргументом, то есть вычисляет его в момент вызова. Объявишь ниже —
  // ReferenceError на первом рендере, const не всплывает.
  const [error, setError] = useState<string | null>(null);

  // Галерея — общий хук и общий компонент на обе формы карты. У загрузки
  // сохранённых картинок не бывает, поэтому начальный список пуст.
  const gallery = useImagePicker([], setError);
  const { images, coverIndex } = gallery;

  const [mapFile, setMapFile] = useState<File | null>(null);
  // Характеристики карты (миграция 20260821130000). Пустые по умолчанию:
  // ни одна из них не обязательна, и заставлять отмечать двенадцать тем
  // ради публикации — верный способ получить отмеченные наугад.
  const [specs, setSpecs] = useState<EditableSpecs>(EMPTY_SPECS);
  // Реакция карты. Необязательна — карта без реакции просто не показывает
  // кнопку рядом с «Add to cart».
  const [reactionOptionId, setReactionOptionId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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
    // Через шлюз (/api/creator/image): путь строит сервер, он же
    // проверяет права, вес и первые байты уже загруженного объекта.
    // Проверка выше осталась удобством — она бережёт время и трафик.
    try {
      const url = await uploadImage(file, "product");
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload the image.");
    }
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
    try {
      // 1) Файл карты — через шлюз (/api/creator/upload).
      //
      // Путь здесь больше НЕ строится: его называет сервер, и это не
      // мелочь стиля. Пока ключ объекта собирал браузер, всё, что стояло
      // между чужой папкой и записью, — политика бакета; размер,
      // расширение и сигнатуру не проверял никто, кроме формы, то есть
      // никто. Разбор — в шапке src/app/api/creator/upload/route.ts.
      const filePath = await uploadMapFile(mapFile);

      // 2) Картинки — тоже через шлюз (/api/creator/image). ПАРАЛЛЕЛЬНО
      // (Promise.all), а не
      // по очереди: загрузки друг от друга не зависят, и очередь просто
      // складывала их время. Порядок результатов Promise.all совпадает с
      // порядком входного массива, поэтому coverIndex остаётся валиден.
      setStage("images");
      const imageUrls = await Promise.all(
        images.map(async (image) => {
          // Уже сохранённой картинки здесь не бывает: форма начинается с
          // пустой галереи, и взять такую неоткуда. Ветка нужна ТИПУ —
          // он общий с формой правки, где сохранённые как раз обычное
          // дело. Врать компилятору через `as` ради одной строки не
          // стоит: тип общий именно потому, что формы одинаковы.
          if (image.kind === "existing") return image.url;
          return uploadImage(image.file, "product");
        })
      );
      const coverUrl = imageUrls[coverIndex];
      const galleryUrls = imageUrls.filter((_, i) => i !== coverIndex);

      // 3) Строка товара + галерея — ОДНИМ вызовом шлюза
      // (/api/creator/map), а не двумя запросами из браузера.
      //
      // ⚠️ Что здесь перестало быть нашим делом: состояние карты, её
      // slug, вес файла и проверка паузы после отказа. Всё это теперь
      // называет сервер — форма говорит только, ЧТО за карта. Разбор —
      // в шапке src/app/api/creator/map/route.ts.
      setStage("saving");
      await createMap({
        title: title.trim(),
        summary: summary.trim(),
        description,
        coverUrl,
        galleryUrls,
        priceCents: Math.round(priceEuros * 100),
        category,
        filePath,
        specs,
        reactionOptionId,
      });

      router.push("/admin/products/new/submitted");
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
      <GalleryPicker picker={gallery} />

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
        />

        <PriceField value={priceInput} onChange={setPriceInput} />
      </div>

      {/* Характеристики. Стоят ДО описания намеренно: пока автор их
          отмечает, он вспоминает про карту то, что потом опишет
          словами. Обратный порядок заставлял бы возвращаться наверх. */}
      <SpecFields value={specs} onChange={setSpecs} />

      <ReactionPicker
        options={reactionOptions}
        value={reactionOptionId}
        onChange={setReactionOptionId}
      />

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
        {/* ⚠️ В АДМИНКУ, а не в /resources (2026-08-28). Форма
            переехала в /admin/products/new, а Cancel остался указывать в
            кабинет автора — и уводил не туда даже не всегда одинаково:
            /resources у не-креатора сама перекидывает на витрину, так
            что отмена загрузки заканчивалась на главной магазина.
            Отмена обязана возвращать туда, откуда пришли. */}
        <Button href="/admin/products" variant="secondary" className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}
