import type { Transform } from "node:stream";
import { createGunzip, createInflateRaw } from "node:zlib";

// ============================================================
// Проверка СОДЕРЖИМОГО файла карты (2026-11-01).
//
// upload-limits.ts смотрит первые 12 байт: это отсекает переименованный
// exe, но правильный zip может содержать что угодно. Здесь файл разбирается
// целиком. Модуль серверный (node:zlib), поэтому отдельно от upload-limits:
// тот импортируют клиентские формы.
//
// Что ловим:
//   - исполняемые файлы внутри, по расширению И по первым байтам: exe,
//     переименованный в world.dat, расширение не выдаст;
//   - архивы, которые нечем открыть (rar, 7z, зашифрованный zip): то, что
//     нельзя проверить, считается непроверенным, а не чистым;
//   - zip-бомбы: распаковка идёт НА САМОМ ДЕЛЕ, с общим потолком. Размеру
//     из заголовка верить нельзя, его пишет автор архива;
//   - пути наружу (../ и абсолютные), которые при распаковке у покупателя
//     записали бы файл мимо папки.
//
// ⚠️ Это НЕ антивирус. Вредонос внутри .mca или в файле с безобидным
// расширением и незнакомыми байтами здесь не виден, а вирус по сигнатуре
// найдёт только ClamAV. Поэтому каждую чужую карту по-прежнему смотрит
// владелец в очереди. docs/SCANNER.md.
//
// ⚠️ Запрещённых расширений список, а не разрешённых, намеренно: в мире
// Minecraft и наборах ресурсов десятки законных форматов, и разрешённый
// список отказывал бы честным авторам при каждом новом.
// ============================================================

/** Сколько всего можно распаковать из одного файла, с вложенными архивами. */
export const MAX_UNPACKED_BYTES = 512 * 1024 * 1024;
/** Файлов и папок на весь архив, с вложенными. */
export const MAX_ENTRIES = 20_000;
/** Архив в архиве: сам файл — глубина 0. Глубже двух не бывает у честных. */
export const MAX_ZIP_DEPTH = 2;
/** Вложенный архив читается в память целиком, поэтому свой потолок. */
const MAX_NESTED_ZIP_BYTES = 64 * 1024 * 1024;
/** Сколько первых байтов распакованного файла смотреть. */
const SNIFF_BYTES = 4096;

const BLOCKED_EXTENSIONS = new Set([
  // Windows: запускается двойным щелчком
  "exe", "com", "scr", "pif", "msi", "msp", "cpl", "dll", "sys", "ocx", "drv",
  "bat", "cmd", "ps1", "psm1", "vbs", "vbe", "js", "jse", "wsf", "wsh", "hta",
  "lnk", "url", "reg", "inf", "scf", "docm", "xlsm", "pptm",
  // Дополнено 12.11 по аудиту (S-23): открываются двойным щелчком и
  // исполняют код или уводят на чужой сайт, а в списке их не было. Это
  // по-прежнему ЧЁРНЫЙ список — он ловит известное, а не всё опасное.
  "html", "htm", "xhtml", "svg", "chm", "msc", "jnlp", "xll", "xlam", "dotm",
  "sct", "wsc", "gadget", "appx", "msix", "appinstaller", "diagcab", "ps1xml",
  "psd1", "vhd", "vhdx", "desktop", "one", "website",
  // Java: мод с вредоносом — самый вероятный случай для Minecraft
  "jar", "class", "war",
  // Linux и macOS
  "sh", "bash", "command", "py", "so", "dylib", "deb", "rpm", "app", "dmg", "pkg", "apk",
  // Архивы, которые нечем проверить
  "rar", "7z", "tar", "tgz", "tbz2", "bz2", "xz", "zst", "lz", "lzma", "cab", "iso", "img",
]);

const BAD_MAP_FILE = (detail: string) =>
  `This map file can't be accepted: ${detail}`;

/** Первые байты исполняемых файлов и архивов, которые мы не умеем открыть. */
function sniffForbidden(head: Uint8Array): string | null {
  const at = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  if (head.length >= 2 && at(0x4d, 0x5a)) return "a Windows program";
  if (at(0x7f, 0x45, 0x4c, 0x46)) return "a Linux program";
  if (
    at(0xfe, 0xed, 0xfa, 0xce) ||
    at(0xfe, 0xed, 0xfa, 0xcf) ||
    at(0xce, 0xfa, 0xed, 0xfe) ||
    at(0xcf, 0xfa, 0xed, 0xfe)
  ) {
    return "a macOS program";
  }
  if (at(0xca, 0xfe, 0xba, 0xbe)) return "compiled Java code";
  if (at(0x23, 0x21, 0x2f)) return "a script";
  if (at(0xd0, 0xcf, 0x11, 0xe0)) return "an installer or a macro document";
  if (at(0x52, 0x61, 0x72, 0x21)) return "a RAR archive";
  if (at(0x37, 0x7a, 0xbc, 0xaf)) return "a 7z archive";
  return null;
}

/** Последнее расширение; `.gz` снимается, чтобы `tool.exe.gz` не прошёл. */
function extensionOf(name: string): string {
  const base = name.split("/").pop() ?? "";
  // Windows отбрасывает точки и пробелы в конце: «tool.exe. » это exe.
  const clean = base.replace(/[. ]+$/, "").toLowerCase();
  const withoutGz = clean.endsWith(".gz") ? clean.slice(0, -3) : clean;
  return withoutGz.includes(".") ? (withoutGz.split(".").pop() ?? "") : "";
}

/** Имя внутри архива: null — годится, строка — что с ним не так. */
export function checkEntryName(name: string): string | null {
  const normalized = name.replace(/\\/g, "/");
  if (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split("/").includes("..")
  ) {
    return `it contains a file with an unsafe path (“${name}”).`;
  }
  // Управляющие символы и письмо справа налево: «exe.txt» глазами, exe на деле.
  if (/[\u0000-\u001f\u007f‪-‮⁦-⁩]/.test(normalized)) {
    return "it contains a file with a disguised name.";
  }
  if (normalized.includes(":")) {
    return `it contains a file with an unsafe name (“${name}”).`;
  }
  if (normalized.length > 1024) return "it contains a file with an overlong name.";
  if (BLOCKED_EXTENSIONS.has(extensionOf(normalized))) {
    return `it contains “${normalized.split("/").pop()}”. Programs, scripts and archives we can't open aren't allowed inside a map.`;
  }
  return null;
}

// ------------------------------------------------------------
// Распаковка с потолком
// ------------------------------------------------------------

/** Общий счёт на весь файл: вложенные архивы тратят тот же бюджет. */
type Budget = { bytes: number; entries: number };

const OVER_BUDGET = "over budget";

/**
 * Прогнать поток через распаковщик, не храня результат: только счёт и
 * первые байты. Потолок проверяется на каждом куске, поэтому бомба
 * обрывается, не успев занять память. `keepUpTo` оставляет результат
 * целиком, если он не больше этого числа.
 */
function drain(
  stream: Transform,
  input: Uint8Array,
  budget: Budget,
  keepUpTo: number
): Promise<{ size: number; head: Uint8Array; whole: Buffer | null }> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const kept: Buffer[] = [];
    let keptBytes = 0;
    stream.on("data", (chunk: Buffer) => {
      size += chunk.length;
      budget.bytes -= chunk.length;
      if (budget.bytes < 0) {
        stream.destroy(new Error(OVER_BUDGET));
        return;
      }
      if (keptBytes < keepUpTo) {
        kept.push(chunk);
        keptBytes += chunk.length;
      }
    });
    stream.on("error", reject);
    stream.on("end", () => {
      const joined = Buffer.concat(kept);
      resolve({
        size,
        head: joined.subarray(0, SNIFF_BYTES),
        whole: size <= keepUpTo ? joined : null,
      });
    });
    stream.end(input);
  });
}

// ------------------------------------------------------------
// Разбор zip
// ------------------------------------------------------------

type Entry = {
  name: string;
  flags: number;
  method: number;
  compressedSize: number;
  size: number;
  offset: number;
  dataStart: number;
  /**
   * Права и тип файла в стиле Unix — старшие 16 бит «внешних атрибутов»
   * записи. По ним видно, что запись — ссылка, а не файл.
   */
  unixMode: number;
};

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const UINT32_MAX = 0xffffffff;
const REPACK = "please pack it again with a regular zip tool.";

class ZipProblem extends Error {}

/** Конец центрального каталога. Комментарий обязан дойти ровно до конца файла. */
function findEocd(view: DataView): number {
  const lowest = Math.max(0, view.byteLength - 22 - 0xffff);
  for (let at = view.byteLength - 22; at >= lowest; at--) {
    if (
      view.getUint32(at, true) === EOCD_SIGNATURE &&
      at + 22 + view.getUint16(at + 20, true) === view.byteLength
    ) {
      return at;
    }
  }
  throw new ZipProblem(`the archive is damaged, ${REPACK}`);
}

/** Размеры и смещение, которые не влезли в 32 бита, лежат в поле zip64. */
function readZip64(
  view: DataView,
  extraStart: number,
  extraEnd: number,
  fields: { size: number; compressedSize: number; offset: number }
) {
  for (let at = extraStart; at + 4 <= extraEnd; ) {
    const id = view.getUint16(at, true);
    const length = view.getUint16(at + 2, true);
    if (id === 0x0001) {
      let cursor = at + 4;
      const next = () => {
        if (cursor + 8 > at + 4 + length) throw new ZipProblem(`the archive is damaged, ${REPACK}`);
        const value = Number(view.getBigUint64(cursor, true));
        cursor += 8;
        return value;
      };
      if (fields.size === UINT32_MAX) fields.size = next();
      if (fields.compressedSize === UINT32_MAX) fields.compressedSize = next();
      if (fields.offset === UINT32_MAX) fields.offset = next();
      return;
    }
    at += 4 + length;
  }
}

/**
 * Прочитать каталог и сверить его с тем, что реально лежит в файле.
 *
 * ⚠️ Сверка нужна потому, что распаковщики читают zip по-разному: одни по
 * каталогу в конце, другие потоком с начала. Архив, где это две разные
 * истории, показал бы нам чистый список, а покупателю — другой файл. Отсюда
 * требование: записи идут встык, без дыр и наложений. Наложения заодно
 * закрывают бомбы, где сотни записей ссылаются на одни и те же байты.
 */
function readEntries(bytes: Uint8Array): Entry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 22) throw new ZipProblem(`the archive is damaged, ${REPACK}`);

  const eocd = findEocd(view);
  const count = view.getUint16(eocd + 10, true);
  const directorySize = view.getUint32(eocd + 12, true);
  const directoryStart = view.getUint32(eocd + 16, true);

  if (view.getUint16(eocd + 4, true) !== 0 || view.getUint16(eocd + 6, true) !== 0) {
    throw new ZipProblem("multi-part archives aren't supported, pack it into one zip.");
  }
  // Настоящий zip64 у файла до 15 МБ бывает только от экзотики: не разбираем.
  if (count === 0xffff || directoryStart === UINT32_MAX || directorySize === UINT32_MAX) {
    throw new ZipProblem(`this zip format isn't supported, ${REPACK}`);
  }
  if (count === 0) throw new ZipProblem("the archive is empty.");
  if (directoryStart + directorySize !== eocd) {
    throw new ZipProblem(`the archive is damaged, ${REPACK}`);
  }

  const decoder = new TextDecoder();
  const entries: Entry[] = [];
  let at = directoryStart;
  for (let i = 0; i < count; i++) {
    if (at + 46 > eocd || view.getUint32(at, true) !== CENTRAL_SIGNATURE) {
      throw new ZipProblem(`the archive is damaged, ${REPACK}`);
    }
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const fields = {
      compressedSize: view.getUint32(at + 20, true),
      size: view.getUint32(at + 24, true),
      offset: view.getUint32(at + 42, true),
    };
    const nameStart = at + 46;
    const extraStart = nameStart + nameLength;
    const end = extraStart + extraLength + commentLength;
    if (end > eocd) throw new ZipProblem(`the archive is damaged, ${REPACK}`);
    readZip64(view, extraStart, extraStart + extraLength, fields);

    entries.push({
      name: decoder.decode(bytes.subarray(nameStart, extraStart)),
      flags: view.getUint16(at + 8, true),
      method: view.getUint16(at + 10, true),
      ...fields,
      dataStart: 0,
      unixMode: view.getUint32(at + 38, true) >>> 16,
    });
    at = end;
  }
  if (at !== eocd) throw new ZipProblem(`the archive is damaged, ${REPACK}`);

  // Локальные заголовки: имя и метод обязаны совпасть с каталогом.
  const ordered = [...entries].sort((a, b) => a.offset - b.offset);
  let expected = 0;
  for (const [index, entry] of ordered.entries()) {
    if (entry.offset !== expected) {
      throw new ZipProblem(`the archive has hidden data, ${REPACK}`);
    }
    if (entry.offset + 30 > directoryStart || view.getUint32(entry.offset, true) !== LOCAL_SIGNATURE) {
      throw new ZipProblem(`the archive is damaged, ${REPACK}`);
    }
    const localNameLength = view.getUint16(entry.offset + 26, true);
    const localExtraLength = view.getUint16(entry.offset + 28, true);
    const localName = decoder.decode(
      bytes.subarray(entry.offset + 30, entry.offset + 30 + localNameLength)
    );
    if (localName !== entry.name || view.getUint16(entry.offset + 8, true) !== entry.method) {
      throw new ZipProblem(`the archive has hidden data, ${REPACK}`);
    }
    // Потоковый распаковщик верит локальному размеру: он обязан совпасть.
    const localCompressed = view.getUint32(entry.offset + 18, true);
    if (
      !(entry.flags & 0x08) &&
      localCompressed !== UINT32_MAX &&
      localCompressed !== entry.compressedSize
    ) {
      throw new ZipProblem(`the archive has hidden data, ${REPACK}`);
    }
    entry.dataStart = entry.offset + 30 + localNameLength + localExtraLength;
    const dataEnd = entry.dataStart + entry.compressedSize;
    if (dataEnd > directoryStart) throw new ZipProblem(`the archive is damaged, ${REPACK}`);

    expected = dataEnd;
    // Размеры после данных: 12–24 байта, только если флаг об этом говорит.
    if (entry.flags & 0x08) {
      const next = ordered[index + 1]?.offset ?? directoryStart;
      if (next < dataEnd || next - dataEnd > 24) {
        throw new ZipProblem(`the archive has hidden data, ${REPACK}`);
      }
      expected = next;
    }
  }
  if (expected !== directoryStart) {
    throw new ZipProblem(`the archive has hidden data, ${REPACK}`);
  }
  return entries;
}

async function scanZip(bytes: Uint8Array, budget: Budget, depth: number): Promise<void> {
  const entries = readEntries(bytes);
  budget.entries -= entries.length;
  if (budget.entries < 0) throw new ZipProblem("it contains too many files.");

  for (const entry of entries) {
    const nameProblem = checkEntryName(entry.name);
    if (nameProblem) throw new ZipProblem(nameProblem);

    // Запись-ссылка (symlink) — отказ (аудит 2026-11, S-23). Имена с
    // «..» мы ловили, а ссылку — нет: запись `saves → /куда-угодно`
    // плюс следующий файл `saves/level.dat` некоторые распаковщики
    // пишут уже ЗА пределы папки карты. В мире Minecraft ссылок не
    // бывает, так что честному архиву отказ не грозит. 0xA000 — тип
    // «символическая ссылка» в старших битах прав.
    if ((entry.unixMode & 0xf000) === 0xa000) {
      throw new ZipProblem("it contains a link to another location instead of a real file.");
    }

    if (entry.flags & 0x01) {
      throw new ZipProblem("the archive is password-protected, so it can't be checked.");
    }
    if (entry.method !== 0 && entry.method !== 8) {
      throw new ZipProblem(`this compression method isn't supported, ${REPACK}`);
    }
    if (entry.name.endsWith("/") && entry.size === 0) continue;

    const data = bytes.subarray(entry.dataStart, entry.dataStart + entry.compressedSize);
    const keepUpTo = depth < MAX_ZIP_DEPTH ? MAX_NESTED_ZIP_BYTES : SNIFF_BYTES;
    let head: Uint8Array;
    let whole: Buffer | null = null;
    let size: number;
    if (entry.method === 0) {
      budget.bytes -= data.length;
      if (budget.bytes < 0) throw new Error(OVER_BUDGET);
      size = data.length;
      head = data.subarray(0, SNIFF_BYTES);
      whole = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    } else {
      ({ size, head, whole } = await drain(createInflateRaw(), data, budget, keepUpTo));
    }
    // Заголовок соврал о размере: честный упаковщик так не делает.
    if (size !== entry.size) throw new ZipProblem(`the archive is damaged, ${REPACK}`);

    await checkContent(entry.name, head, whole, budget, depth);
  }
}

/** Что внутри записи: первые байты, сжатие gzip, вложенный архив. */
async function checkContent(
  name: string,
  head: Uint8Array,
  whole: Buffer | null,
  budget: Budget,
  depth: number
): Promise<void> {
  const forbidden = sniffForbidden(head);
  if (forbidden) {
    throw new ZipProblem(`“${name.split("/").pop()}” is ${forbidden}, which isn't allowed inside a map.`);
  }

  // Вложенный архив опознаётся по байтам, а не по имени: .mcworld и .dat
  // могут оказаться zip'ом, и jar под чужим именем тоже.
  if (head.length >= 4 && head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) {
    if (depth >= MAX_ZIP_DEPTH) {
      throw new ZipProblem("it has too many archives inside archives.");
    }
    if (!whole) throw new ZipProblem("it contains an archive that's too large to check.");
    await scanZip(whole, budget, depth + 1);
    return;
  }

  // Сжатые gzip файлы законны (level.dat, .schem), но exe в нём не будет законным.
  if (head.length >= 2 && head[0] === 0x1f && head[1] === 0x8b && whole) {
    const inner = await drain(createGunzip(), whole, budget, SNIFF_BYTES).catch((err: Error) => {
      if (err.message === OVER_BUDGET) throw err;
      // Битый gzip внутри мира ничего не запустит: не наше дело, пропускаем.
      return null;
    });
    const innerProblem = inner && sniffForbidden(inner.head);
    if (innerProblem) {
      throw new ZipProblem(`“${name.split("/").pop()}” is ${innerProblem}, which isn't allowed inside a map.`);
    }
  }
}

/** Схематика: gzip с NBT внутри или голый NBT. Первый байт NBT всегда 0x0A. */
async function scanSchematic(bytes: Uint8Array, budget: Budget): Promise<void> {
  if (bytes[0] === 0x0a) return;
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    throw new ZipProblem("it isn't a valid schematic.");
  }
  const { head } = await drain(createGunzip(), bytes, budget, SNIFF_BYTES);
  if (head[0] !== 0x0a) throw new ZipProblem("it isn't a valid schematic.");
}

/**
 * Проверить файл карты целиком. null — годится, строка — причина для человека.
 *
 * Формат определяет расширение, которое поставил сервер: проверка байтов
 * в upload-limits пропускает и gzip под именем .zip, а здесь это отказ.
 */
export async function scanMapFile(bytes: Uint8Array, fileName: string): Promise<string | null> {
  const budget: Budget = { bytes: MAX_UNPACKED_BYTES, entries: MAX_ENTRIES };
  try {
    if (fileName.toLowerCase().endsWith(".zip")) {
      await scanZip(bytes, budget, 0);
    } else {
      await scanSchematic(bytes, budget);
    }
    return null;
  } catch (err) {
    if (err instanceof ZipProblem) return BAD_MAP_FILE(err.message);
    if (err instanceof Error && err.message === OVER_BUDGET) {
      return BAD_MAP_FILE("it unpacks to more than 512 MB.");
    }
    // Ошибка распаковщика на файле автора: данные не сходятся с заголовком.
    if (err instanceof Error && "code" in err && String(err.code).startsWith("Z_")) {
      return BAD_MAP_FILE("the file is damaged.");
    }
    throw err;
  }
}
