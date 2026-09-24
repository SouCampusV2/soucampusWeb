import { describe, it, expect } from "vitest";
import { crc32, inflateSync } from "node:zlib";
import { encodePng } from "./png";

// Кодировщик PNG для превью ссылки. Ошибку в нём не увидеть глазами до
// того, как Telegram покажет пустое превью, — поэтому формат проверяется
// разбором байт обратно: подпись, размеры, контрольные суммы, пиксели.

function readChunks(png: Buffer) {
  const chunks: { type: string; data: Buffer; crcOk: boolean }[] = [];
  let at = 8;
  while (at < png.length) {
    const length = png.readUInt32BE(at);
    const type = png.toString("ascii", at + 4, at + 8);
    const data = png.subarray(at + 8, at + 8 + length);
    const crc = png.readUInt32BE(at + 8 + length);
    const crcOk = (crc32(png.subarray(at + 4, at + 8 + length)) >>> 0) === crc;
    chunks.push({ type, data, crcOk });
    at += 12 + length;
  }
  return chunks;
}

describe("encodePng", () => {
  const w = 3;
  const h = 2;
  const rgba = new Uint8Array(w * h * 4).map((_, i) => (i * 37) % 256);
  const png = encodePng(rgba, w, h);

  it("starts with the PNG signature", () => {
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it("writes IHDR, IDAT, IEND with valid checksums", () => {
    const chunks = readChunks(png);
    expect(chunks.map((c) => c.type)).toEqual(["IHDR", "IDAT", "IEND"]);
    expect(chunks.every((c) => c.crcOk)).toBe(true);
    const ihdr = chunks[0].data;
    expect([ihdr.readUInt32BE(0), ihdr.readUInt32BE(4), ihdr[8], ihdr[9]]).toEqual([w, h, 8, 6]);
  });

  it("round-trips the pixels", () => {
    const raw = inflateSync(readChunks(png)[1].data);
    const back: number[] = [];
    for (let y = 0; y < h; y++) back.push(...raw.subarray(y * (w * 4 + 1) + 1, (y + 1) * (w * 4 + 1)));
    expect(back).toEqual([...rgba]);
  });

  it("refuses a buffer of the wrong size", () => {
    expect(() => encodePng(new Uint8Array(5), w, h)).toThrow();
  });
});
