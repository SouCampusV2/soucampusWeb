// Лимиты и проверки загружаемых файлов — один источник на форму загрузки
// и на всё, что появится позже (редактирование карты, замена файла).
//
// Числа заданы владельцем (2026-07-30) и намеренно скромные: хранилище
// Supabase платное, а карта на 200 МБ — это почти всегда неупакованный
// мир, а не то, что реально нужно покупателю.

export const MAP_FILE_MAX_BYTES = 15 * 1024 * 1024; // 15 МБ на схематику/мир
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 МБ на одну картинку
export const IMAGES_TOTAL_MAX_BYTES = 30 * 1024 * 1024; // 30 МБ на всю галерею
export const MAX_IMAGES = 15;

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
//
// ⚠️ ФУНКЦИИ ЗДЕСЬ ЗОВУТСЯ С ДВУХ СТОРОН, и это главное, что о них надо
// знать (2026-09-11). До шлюза записи они жили только в браузере, то
// есть не проверяли ничего: отключить их можно было правкой одной
// строки в консоли. Теперь те же правила исполняет сервер — обработчик
// /api/creator/upload читает первые байты уже загруженного объекта и
// зовёт checkMapBytes. Поэтому ядро проверок — ЧИСТЫЕ функции над
// Uint8Array (их же покрывают тесты), а варианты с File — тонкие
// обёртки для формы, которая показывает человеку ошибку до загрузки.
//
// Браузерная проверка осталась УДОБСТВОМ: она бережёт время и трафик.
// Защищает — серверная.
// ------------------------------------------------------------

/** Что принимаем от креатора — для атрибута accept у поля файла. */
export const MAP_FILE_ACCEPT = ".zip,.schem,.schematic";

/**
 * Расширения файла карты, которые вообще может выдать шлюз.
 *
 * Список нужен серверу: расширение едет в ключ объекта, и решать, каким
 * оно будет, должен не загружающий. safeExtension чистит строку от
 * мусора, но «чистая» строка `exe` остаётся `exe` — отсекает её вот
 * этот перечень.
 */
export const MAP_FILE_EXTENSIONS = ["zip", "schem", "schematic"] as const;

/**
 * Сколько первых байтов нужно, чтобы опознать формат.
 *
 * Двенадцать, а не четыре: у WEBP метка формата лежит с 8-го байта. На
 * сервере это же число — длина диапазона в ranged-запросе к Storage,
 * поэтому оно вынесено в константу, а не повторено цифрой в двух местах.
 */
export const HEAD_BYTES = 12;

// ZIP: обычный архив, пустой (50 4B 05 06) и многотомный (50 4B 07 08).
const ZIP_SIGNATURES = [
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x05, 0x06],
  [0x50, 0x4b, 0x07, 0x08],
];

// GZIP — в него завёрнуто большинство схематик.
const GZIP_SIGNATURE = [0x1f, 0x8b];

// Голый NBT начинается с TAG_Compound (0x0A). Признак слабый — это
// просто перевод строки, и текстовый файл может начаться с него же.
// Поэтому принимаем его ТОЛЬКО у файлов с расширением .schem/.schematic:
// само по себе расширение ничего не доказывает, но в паре с нужным
// первым байтом отсекает случайно переименованный .exe или картинку.
const NBT_SIGNATURE = [0x0a];

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

async function readHead(file: File, length = HEAD_BYTES): Promise<Uint8Array> {
  const slice = await file.slice(0, length).arrayBuffer();
  return new Uint8Array(slice);
}

/**
 * Ядро проверки файла карты: размер + сигнатура в первых байтах.
 *
 * null — файл годится; строка — понятная человеку причина отказа.
 * Тексты писались для формы и остаются такими же в ответе сервера:
 * человек по обе стороны один и тот же, и объяснять ему дважды разными
 * словами незачем.
 */
export function checkMapBytes(
  head: Uint8Array,
  size: number,
  fileName: string
): string | null {
  if (size === 0) return "That file is empty.";
  if (size > MAP_FILE_MAX_BYTES) {
    return `The map file must be ${formatBytes(MAP_FILE_MAX_BYTES)} or smaller — yours is ${formatBytes(size)}.`;
  }

  const name = fileName.toLowerCase();
  const isSchematic = name.endsWith(".schem") || name.endsWith(".schematic");

  const looksZip = ZIP_SIGNATURES.some((sig) => startsWith(head, sig));
  const looksGzip = startsWith(head, GZIP_SIGNATURE);
  // Голый NBT засчитываем только схематикам — см. NBT_SIGNATURE выше.
  const looksNbt = isSchematic && startsWith(head, NBT_SIGNATURE);

  if (looksZip || looksGzip || looksNbt) return null;

  return isSchematic
    ? `“${fileName}” doesn't look like a valid schematic — the file may be corrupted.`
    : "That doesn't look like a .zip, .schem or .schematic file. Pack a world folder into a zip archive first.";
}

/** Ядро проверки картинки. null — годится; строка — причина отказа. */
export function checkImageBytes(
  head: Uint8Array,
  size: number,
  fileName: string
): string | null {
  if (size === 0) return "That image is empty.";
  if (size > IMAGE_MAX_BYTES) {
    return `Each image must be ${formatBytes(IMAGE_MAX_BYTES)} or smaller — “${fileName}” is ${formatBytes(size)}.`;
  }

  const match = IMAGE_SIGNATURES.find((sig) => startsWith(head, sig.bytes));
  if (!match) return `“${fileName}” isn't a PNG, JPEG, GIF or WebP image.`;
  // RIFF — контейнер не только для WebP (там же живёт, например, WAV),
  // поэтому у него проверяем ещё и метку формата.
  if (match.label === "webp") {
    const tag = String.fromCharCode(...head.slice(8, 12));
    if (tag !== "WEBP") return `“${fileName}” isn't a valid WebP image.`;
  }
  return null;
}

/** null — файл годится; строка — понятная человеку причина отказа. */
export async function checkMapFile(file: File): Promise<string | null> {
  return checkMapBytes(await readHead(file), file.size, file.name);
}

/** null — картинка годится; строка — причина отказа. */
export async function checkImageFile(file: File): Promise<string | null> {
  return checkImageBytes(await readHead(file), file.size, file.name);
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
 *
 * ⚠️ Чистка — не проверка. `exe` пройдёт её без единой правки: она
 * убирает мусор, а не решает, что позволено. Перечень позволенного —
 * MAP_FILE_EXTENSIONS, и сверяет с ним сервер.
 */
export function safeExtension(fileName: string, fallback: string): string {
  const raw = fileName.includes(".") ? fileName.split(".").pop() ?? "" : "";
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return cleaned || fallback;
}
