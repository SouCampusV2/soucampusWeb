import sharp from "sharp";

// ============================================================
// Перекодирование загруженных картинок (2026-11-01).
//
// Проверка первых 12 байт (upload-limits.ts) подтверждает только заголовок.
// За честным заголовком PNG может идти что угодно: скрипт, zip, exe. Искать
// такой хвост незачем: картинка раскрывается в пиксели и собирается заново,
// и всё, что не пиксели, исчезает само. Заодно уходят EXIF и геолокация с
// телефона: аватар и обложку видят все посетители.
//
// Модуль серверный: sharp в браузере не работает.
// ============================================================

/**
 * Потолок пикселей: файл на 10 МБ может раскрыться в гигабайты памяти.
 * 100 Мп с запасом вмещают скриншот 8K (33 Мп).
 */
export const MAX_IMAGE_PIXELS = 100_000_000;

/** Качество выше, чем отдаёт витрина (next.config.ts, 90): запас на второе сжатие. */
const QUALITY = 92;

const CONTENT_TYPES = {
  png: "image/png",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
} as const;

const EXTENSIONS = { png: "png", jpeg: "jpg", gif: "gif", webp: "webp" } as const;

type CleanFormat = keyof typeof CONTENT_TYPES;

export type CleanImage = {
  bytes: Buffer;
  contentType: string;
  /** Настоящее расширение: файл .png с JPEG внутри станет .jpg. */
  ext: string;
};

/**
 * Собрать картинку заново. Формат определяется по содержимому, а не по имени.
 * Строка вместо результата — причина отказа для человека.
 *
 * Анимацию GIF и WebP сохраняем: иначе анимированный аватар молча застынет.
 */
export async function cleanImage(input: Uint8Array): Promise<CleanImage | string> {
  const options = { limitInputPixels: MAX_IMAGE_PIXELS, failOn: "error" as const };

  try {
    const meta = await sharp(input, options).metadata();
    const format = meta.format as string;
    if (!(format in CONTENT_TYPES)) return "That isn't a PNG, JPEG, GIF or WebP image.";
    const kind = format as CleanFormat;

    const animated = (kind === "gif" || kind === "webp") && (meta.pages ?? 1) > 1;
    let image = sharp(input, { ...options, animated });
    // Поворот с телефона хранится в EXIF, который сейчас исчезнет: применяем.
    if (!animated) image = image.rotate();

    if (kind === "png") image = image.png({ palette: Boolean(meta.isPalette) });
    if (kind === "jpeg") {
      image = image.jpeg({
        quality: QUALITY,
        // Резкие края блоков на скриншотах страдают от прореживания цвета:
        // чего не было в оригинале, не добавляем.
        chromaSubsampling: meta.chromaSubsampling === "4:4:4" ? "4:4:4" : "4:2:0",
      });
    }
    if (kind === "gif") image = image.gif();
    if (kind === "webp") image = image.webp({ quality: QUALITY });

    return {
      bytes: await image.toBuffer(),
      contentType: CONTENT_TYPES[kind],
      ext: EXTENSIONS[kind],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("pixel limit")) {
      return "That image is too large in pixels. Make it smaller and try again.";
    }
    return "That image is damaged or isn't a real picture.";
  }
}
