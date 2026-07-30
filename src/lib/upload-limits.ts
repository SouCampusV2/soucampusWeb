// Лимиты и проверки загружаемых файлов — один источник на форму загрузки
// и на всё, что появится позже (редактирование карты, замена файла).
//
// Числа заданы владельцем (2026-07-30) и намеренно скромные: хранилище
// Supabase платное, а карта на 200 МБ — это почти всегда неупакованный
// мир, а не то, что реально нужно покупателю.

export const MAP_FILE_MAX_BYTES = 15 * 1024 * 1024; // 15 МБ на схематику/мир
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2 МБ на одну картинку
export const IMAGES_TOTAL_MAX_BYTES = 10 * 1024 * 1024; // 10 МБ на всю галерею
export const MAX_IMAGES = 8;

export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb % 1 === 0 ? mb : mb.toFixed(1)} MB`;
}

// ------------------------------------------------------------
// Проверка, что файл — действительно то, чем прикидывается.
//
// Расширение и MIME-тип приходят ОТ БРАУЗЕРА, то есть от загружающего:
// переименовать что угодно в .zip — дело секунды. Единственный честный
// признак — сигнатура в первых байтах самого файла.
//
// Это НЕ антивирус: правильный zip может содержать что угодно внутри.
// Проверка отсекает грубое (переименованный exe), но не заменяет
// нормального сканирования — см. docs/IDEAS.md, «Проверка файлов».
// ------------------------------------------------------------

/** Разрешённые контейнеры карт. Всё остальное — отказ. */
const MAP_SIGNATURES: { label: string; bytes: number[] }[] = [
  // ZIP (и всё, что на нём основано). Пустой архив — 50 4B 05 06,
  // многотомный — 50 4B 07 08; принимаем все три варианта.
  { label: "zip", bytes: [0x50, 0x4b, 0x03, 0x04] },
  { label: "zip", bytes: [0x50, 0x4b, 0x05, 0x06] },
  { label: "zip", bytes: [0x50, 0x4b, 0x07, 0x08] },
  // GZIP — .schematic обычно это сжатый NBT.
  { label: "gzip", bytes: [0x1f, 0x8b] },
];

/** Сигнатуры настоящих картинок. */
const IMAGE_SIGNATURES: { label: string; bytes: number[] }[] = [
  { label: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { label: "jpeg", bytes: [0xff, 0xd8, 0xff] },
  { label: "gif", bytes: [0x47, 0x49, 0x46] },
  // WEBP: "RIFF" в начале, "WEBP" с 8-го байта — второе проверяем отдельно.
  { label: "webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

function startsWith(head: Uint8Array, signature: number[]): boolean {
  if (head.length < signature.length) return false;
  return signature.every((byte, i) => head[i] === byte);
}

async function readHead(file: File, length = 12): Promise<Uint8Array> {
  const slice = await file.slice(0, length).arrayBuffer();
  return new Uint8Array(slice);
}

/** null — файл годится; строка — понятная человеку причина отказа. */
export async function checkMapFile(file: File): Promise<string | null> {
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAP_FILE_MAX_BYTES) {
    return `The map file must be ${formatBytes(MAP_FILE_MAX_BYTES)} or smaller — yours is ${formatBytes(file.size)}.`;
  }

  const head = await readHead(file);
  const ok = MAP_SIGNATURES.some((sig) => startsWith(head, sig.bytes));
  if (!ok) {
    return "That doesn't look like a .zip or .schematic file. Pack the world or schematic into a zip archive first.";
  }
  return null;
}

/** null — картинка годится; строка — причина отказа. */
export async function checkImageFile(file: File): Promise<string | null> {
  if (file.size === 0) return "That image is empty.";
  if (file.size > IMAGE_MAX_BYTES) {
    return `Each image must be ${formatBytes(IMAGE_MAX_BYTES)} or smaller — “${file.name}” is ${formatBytes(file.size)}.`;
  }

  const head = await readHead(file);
  const match = IMAGE_SIGNATURES.find((sig) => startsWith(head, sig.bytes));
  if (!match) return `“${file.name}” isn't a PNG, JPEG, GIF or WebP image.`;
  // RIFF — контейнер не только для WebP (там же живёт, например, WAV),
  // поэтому у него проверяем ещё и метку формата.
  if (match.label === "webp") {
    const tag = String.fromCharCode(...head.slice(8, 12));
    if (tag !== "WEBP") return `“${file.name}” isn't a valid WebP image.`;
  }
  return null;
}

/**
 * Расширение файла для пути в Storage — только буквы и цифры, не длиннее
 * 8 символов.
 *
 * Имя файла целиком задаёт загружающий, а расширение отсюда едет прямо в
 * ключ объекта. Без чистки файл с именем вида `map.zip/../../other`
 * подставил бы в путь слэши и попытку выйти из своей папки. RLS Storage
 * такое, скорее всего, отсекла бы (политика смотрит на первый сегмент
 * пути), но полагаться на «скорее всего» в вопросе чужих папок нельзя —
 * дешевле не пускать мусор в путь вообще.
 */
export function safeExtension(fileName: string, fallback: string): string {
  const raw = fileName.includes(".") ? fileName.split(".").pop() ?? "" : "";
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return cleaned || fallback;
}
