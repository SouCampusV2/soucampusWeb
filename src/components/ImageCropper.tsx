"use client";

import { useEffect, useRef, useState } from "react";
import { MagnifyingGlassMinus, MagnifyingGlassPlus } from "@phosphor-icons/react";
import { Button } from "@/components/Button";

// Окно обрезки аватара и баннера (2026-10-26).
//
// Как устроено: картинка лежит в рамке нужной пропорции и всегда
// покрывает её целиком (как object-cover). Человек тянет её пальцем или
// мышью и меняет масштаб ползунком. По «Apply» видимая часть рисуется на
// <canvas> и уходит наружу готовым файлом — дальше обычный шлюз загрузки.
//
// Все координаты — ДОЛИ рамки, а не пиксели. Рамка меняет размер вместе
// с окном (телефон, поворот экрана), и в пикселях положение картинки
// пришлось бы пересчитывать на каждый ресайз. В долях оно от размера не
// зависит, а пиксели нужны только в двух местах: перевести движение
// пальца в доли и нарисовать результат.
//
// Своё, а не библиотека: кода ~200 строк, и каждую из них можно
// объяснить (учебная колея). Чего здесь сознательно нет: щипка двумя
// пальцами и колёсика — масштаб только ползунком. Колёсико в React
// слушается пассивно, отменить прокрутку страницы под окном из него
// нельзя, и окно ездило бы вместе с ней.

type Props = {
  /** Адрес картинки: object URL выбранного файла или текущая ссылка. */
  src: string;
  /** Ширина к высоте: 1 — аватар, 5 — баннер. */
  aspect: number;
  /** Ширина результата в пикселях; меньше исходника — не растягиваем. */
  outputWidth: number;
  /** Скругление рамки — чтобы аватар обрезался так, как его покажут. */
  rounded?: boolean;
  title: string;
  onCancel: () => void;
  onApply: (file: File) => void;
};

const MAX_ZOOM = 4;

export function ImageCropper({
  src,
  aspect,
  outputWidth,
  rounded = false,
  title,
  onCancel,
  onApply,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [zoom, setZoom] = useState(1);
  // Центр картинки относительно центра рамки: x — в долях ширины рамки,
  // y — в долях высоты. {0, 0} — по центру.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка картинки ради её настоящих размеров — без них не посчитать,
  // как она ложится в рамку.
  //
  // crossOrigin="anonymous" — ради <canvas>: картинка с чужого адреса
  // без CORS «пачкает» холст, и выгрузить из него файл браузер не даст.
  // Storage Supabase отдаёт картинки с разрешением на любой источник,
  // object URL — свой, так что оба случая проходят.
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.onerror = () => setLoadError(true);
    img.src = src;
  }, [src]);

  // Escape закрывает окно — как любое модальное на сайте.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // Размер картинки при zoom = 1, в долях рамки: ровно столько, чтобы
  // покрыть её (одна сторона совпадает, другая выходит за край).
  const cover = image
    ? (() => {
        const imageAspect = image.naturalWidth / image.naturalHeight;
        const w = Math.max(1, imageAspect / aspect);
        return { w, h: (w * aspect) / imageAspect };
      })()
    : { w: 1, h: 1 };

  /**
   * Не пускать картинку дальше края: между краем картинки и краем рамки
   * не должно оставаться пустоты. Половина «лишнего» — и есть ход в
   * каждую сторону.
   */
  function clamp(next: { x: number; y: number }, z: number) {
    const maxX = (cover.w * z - 1) / 2;
    const maxY = (cover.h * z - 1) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  // Перетаскивание. Pointer events — одна ветка на мышь, палец и перо.
  // setPointerCapture держит события за нами, даже если палец ушёл за
  // край рамки.
  const drag = useRef<{ x: number; y: number; start: { x: number; y: number } } | null>(null);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, start: offset };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const frame = frameRef.current;
    if (!drag.current || !frame) return;
    const rect = frame.getBoundingClientRect();
    setOffset(
      clamp(
        {
          x: drag.current.start.x + (event.clientX - drag.current.x) / rect.width,
          y: drag.current.start.y + (event.clientY - drag.current.y) / rect.height,
        },
        zoom,
      ),
    );
  }

  function onPointerUp() {
    drag.current = null;
  }

  function changeZoom(next: number) {
    setZoom(next);
    // Уменьшение могло оставить картинку за краем — подтягиваем.
    setOffset((current) => clamp(current, next));
  }

  // Где картинка лежит в рамке — в процентах рамки, для CSS.
  const w = cover.w * zoom;
  const h = cover.h * zoom;
  const left = 0.5 + offset.x - w / 2;
  const top = 0.5 + offset.y - h / 2;

  async function apply() {
    if (!image) return;
    setWorking(true);
    setError(null);

    // Видимая часть в пикселях ИСХОДНИКА: рамка — это отрезок [0, 1], а
    // картинка занимает [left, left + w]. Доля рамки → доля картинки →
    // пиксели.
    const sx = (-left / w) * image.naturalWidth;
    const sy = (-top / h) * image.naturalHeight;
    const sw = image.naturalWidth / w;
    const sh = image.naturalHeight / h;

    // Растягивать маленький исходник до outputWidth незачем: деталей не
    // прибавится, а вес вырастет.
    const outW = Math.round(Math.min(outputWidth, sw));
    const outH = Math.round(outW / aspect);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const context = canvas.getContext("2d");
    if (!context) {
      setWorking(false);
      setError("Your browser couldn't crop the image.");
      return;
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(image, sx, sy, sw, sh, 0, 0, outW, outH);

    try {
      const blob = await encode(canvas);
      const ext = blob.type.split("/")[1] ?? "png";
      onApply(new File([blob], `cropped.${ext}`, { type: blob.type }));
    } catch {
      // Сюда попадает «испачканный» холст: картинку отдали без CORS.
      setWorking(false);
      setError("Couldn't read this image. Pick the file again.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl rounded-3xl border border-zinc-200 bg-[#fbfbff] p-5 dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Drag to move, use the slider to zoom.
        </p>

        {/* Рамка. touch-none — иначе палец на телефоне прокручивал бы
            страницу вместо картинки. Ширина рамки — по окну, высота — из
            пропорции; у аватара рамку сужаем, иначе квадрат на всю
            ширину окна не влезал бы по высоте телефона. */}
        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ aspectRatio: String(aspect) }}
          className={`relative mx-auto mt-4 w-full cursor-grab touch-none select-none overflow-hidden bg-zinc-100 active:cursor-grabbing dark:bg-zinc-900 ${
            aspect <= 1 ? "max-w-xs" : ""
          } ${rounded ? "rounded-3xl" : "rounded-xl"}`}
        >
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{
                width: `${w * 100}%`,
                height: `${h * 100}%`,
                left: `${left * 100}%`,
                top: `${top * 100}%`,
              }}
            />
          )}
          {loadError && (
            <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-zinc-500">
              Couldn&apos;t open this image.
            </p>
          )}
        </div>

        <label className="mt-5 flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
          <MagnifyingGlassMinus size={18} aria-hidden />
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(event) => changeZoom(Number(event.target.value))}
            aria-label="Zoom"
            className="h-2 flex-1 cursor-pointer accent-orange-500"
          />
          <MagnifyingGlassPlus size={18} aria-hidden />
        </label>

        {error && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={apply}
            disabled={!image || working}
            className="flex-1"
          >
            {working ? "Cropping…" : "Apply"}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Холст → файл. WebP: мельче JPEG и держит прозрачность (лого на
 * аватаре). Браузер, не умеющий кодировать WebP, молча отдаёт PNG — тогда
 * крупную картинку пережимаем в JPEG, иначе баннер весил бы мегабайты.
 */
function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  const toBlob = (type: string, quality?: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("empty"))), type, quality);
    });

  return toBlob("image/webp", 0.9).then((blob) => {
    if (blob.type === "image/webp") return blob;
    const small = canvas.width * canvas.height <= 512 * 512;
    return small ? toBlob("image/png") : toBlob("image/jpeg", 0.9);
  });
}
