"use client";

import { useRef, useState } from "react";
import {
  Star,
  Image as ImageIcon,
  DotsSixVertical,
  X,
} from "@phosphor-icons/react";
import {
  MAX_IMAGES,
  IMAGES_TOTAL_MAX_BYTES,
  checkImageFile,
  formatBytes,
} from "@/lib/upload-limits";

// Галерея карты — ОДНА на обе формы (2026-09-11).
//
// ------------------------------------------------------------
// Почему это чинилось именно сейчас
// ------------------------------------------------------------
// `UploadMapForm` и `EditMapForm` держали свою копию одного и того же:
// свой тип картинки, своя `reorderImages`, свой drag & drop, свой
// `coverIndex`, своя разметка плитки. Задача стояла в «Тех-долге» с
// 17 августа с явной пометкой: чинить **не отдельно, а вместе со шлюзом
// записи**, потому что обе формы там всё равно переписываются, и вынести
// общее дешевле одним заходом, чем трогать одни и те же файлы дважды.
// Шлюз проехал сегодня утром — значит момент этот.
//
// ------------------------------------------------------------
// Довод сильнее экономии строк: копии УЖЕ разъехались
// ------------------------------------------------------------
// Три отличия, ни одно из которых не было решением:
//   1. у правки не было ручки перетаскивания (точки + затемнение сверху),
//      хотя тащить плитку можно — то есть подсказка была только в одной
//      форме из двух;
//   2. у правки на кнопке «Add photo» не было иконки;
//   3. подпись к секции звучала по-разному («first drag order sets
//      gallery order» против «drag to reorder»).
// Это не дизайн двух экранов, это дрейф двух копий. Сведено к варианту
// загрузки — он полнее.
//
// ------------------------------------------------------------
// Тип — объединение, а не два типа
// ------------------------------------------------------------
// У правки картинка бывает уже сохранённой (только url) или только что
// выбранной (файл + локальный превью); у загрузки — всегда второе.
// Поэтому общий тип надмножество, а форма загрузки просто никогда не
// кладёт в него `existing`. Обратный путь (два типа и переключатель)
// вернул бы ровно ту развилку, из-за которой копии и появились.
export type GalleryImage =
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; preview: string };

export function imageSrc(image: GalleryImage): string {
  return image.kind === "existing" ? image.url : image.preview;
}

/**
 * Состояние галереи: список, обложка, добавление, удаление, порядок.
 *
 * Хук, а не компонент с внутренним состоянием, — по той же причине, что
 * `useDismiss` (29.08): общим должно быть ПОВЕДЕНИЕ. Список нужен самой
 * форме при отправке (она грузит файлы и раскладывает их на обложку и
 * галерею), поэтому владеть им обязана форма.
 *
 * @param initial  уже сохранённые картинки — у формы загрузки пусто.
 * @param onError  куда сказать человеку «нельзя»; текст готовый.
 */
export function useImagePicker(
  initial: GalleryImage[],
  onError: (message: string | null) => void
) {
  const [images, setImages] = useState<GalleryImage[]>(initial);
  const [coverIndex, setCoverIndex] = useState(0);
  // Обычный ref, не state: перестановка не должна вызывать лишний рендер
  // посреди жеста перетаскивания.
  const dragIndex = useRef<number | null>(null);

  async function pickImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // тот же файл можно выбрать снова
    if (files.length === 0) return;

    if (images.length + files.length > MAX_IMAGES) {
      onError(`You can have up to ${MAX_IMAGES} images.`);
      return;
    }

    // Каждая картинка — по сигнатуре, а не по MIME-типу от браузера
    // (его подделывает любой, кто переименовал файл).
    for (const file of files) {
      const problem = await checkImageFile(file);
      if (problem) {
        onError(problem);
        return;
      }
    }

    // ⚠️ Суммарный вес считается только по НОВЫМ файлам, и иначе нельзя:
    // уже сохранённые лежат в бакете, их размер здесь неизвестен и заново
    // он никуда не едет. У формы загрузки новые все, поэтому для неё это
    // ровно прежний подсчёт.
    const pendingBytes = images.reduce(
      (sum, i) => sum + (i.kind === "new" ? i.file.size : 0),
      0
    );
    const adding = files.reduce((sum, f) => sum + f.size, 0);
    if (pendingBytes + adding > IMAGES_TOTAL_MAX_BYTES) {
      // Слово «New» появляется, только когда в галерее есть старые
      // картинки. Иначе оно врёт: на загрузке новые все, и «new images
      // must be 30 MB or less» читается как существование второго,
      // большего лимита на какие-то другие.
      const hasExisting = images.some((i) => i.kind === "existing");
      onError(
        `${hasExisting ? "New images" : "All images"} together must be ${formatBytes(
          IMAGES_TOTAL_MAX_BYTES
        )} or less — these add up to ${formatBytes(pendingBytes + adding)}.`
      );
      return;
    }

    onError(null);
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

  // Перестановка двигает и обложку: она хранится ИНДЕКСОМ, то есть
  // указывает на место в списке, а не на картинку. Без этих трёх строк
  // перетаскивание молча меняло бы обложку на соседнюю.
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

  return {
    images,
    coverIndex,
    setCoverIndex,
    dragIndex,
    pickImages,
    removeImage,
    reorderImages,
  };
}

/** Что возвращает useImagePicker — проп компонента одним куском. */
export type ImagePicker = ReturnType<typeof useImagePicker>;

/**
 * Сетка плиток с перетаскиванием, крестиком и звездой обложки.
 *
 * Drag & drop нативный, HTML5 — без новой зависимости ради одной
 * возможности «перетащить миниатюру».
 */
export function GalleryPicker({ picker }: { picker: ImagePicker }) {
  const {
    images,
    coverIndex,
    setCoverIndex,
    dragIndex,
    pickImages,
    removeImage,
    reorderImages,
  } = picker;
  const imageInput = useRef<HTMLInputElement>(null);

  return (
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

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

            {/* Ручка перетаскивания — подсказка, что плитку можно тащить.
                У формы правки её не было, хотя тащить там было можно. */}
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
  );
}
