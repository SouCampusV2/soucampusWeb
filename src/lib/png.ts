import { crc32, deflateSync } from "node:zlib";

// Минимальный кодировщик PNG: RGBA-пиксели → байты файла. Только для
// сервера (node:zlib). Нужен превью ссылки (opengraph-image.tsx): карту
// мира считает world-gen.ts массивом пикселей, а next/og принимает
// картинки только файлами или data-URL — холста на сервере нет.
//
// Формат — ровно то, что требует спецификация PNG, без необязательных
// блоков: подпись, IHDR (размеры, 8 бит на канал, RGBA), IDAT (сжатые
// строки, у каждой в начале байт фильтра 0 — «без фильтра»), IEND.

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type: string, data: Buffer) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  // CRC считается по типу и данным, без длины.
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, crc]);
}

/** RGBA, по 4 байта на пиксель, строками сверху вниз. */
export function encodePng(rgba: Uint8Array, width: number, height: number): Buffer {
  if (rgba.length !== width * height * 4) throw new Error("encodePng: size mismatch");
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // бит на канал
  ihdr[9] = 6; // RGBA
  // [10..12] — сжатие, фильтр, чересстрочность: все 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // фильтр строки: нет
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
