import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { cleanImage, type CleanImage } from "./image-clean";

// Настоящие картинки: вопрос в том, что останется от байтов после пересборки.

const SECRET = "<script>alert('tail')</script>";

function solid(width = 16, height = 16) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 100, b: 50 } },
  });
}

async function cleaned(input: Uint8Array): Promise<CleanImage> {
  const result = await cleanImage(input);
  if (typeof result === "string") throw new Error(result);
  return result;
}

describe("cleanImage", () => {
  it("срезает то, что дописано после картинки", async () => {
    for (const encoded of [await solid().png().toBuffer(), await solid().jpeg().toBuffer(), await solid().webp().toBuffer()]) {
      const polyglot = Buffer.concat([encoded, Buffer.from(SECRET)]);
      const { bytes } = await cleaned(polyglot);
      expect(bytes.includes(SECRET)).toBe(false);
    }
  });

  it("убирает EXIF, включая комментарий автора", async () => {
    const input = await solid()
      .jpeg()
      .withExif({ IFD0: { ImageDescription: "SECRET-LOCATION" } })
      .toBuffer();
    expect(input.includes("SECRET-LOCATION")).toBe(true);
    const { bytes } = await cleaned(input);
    expect(bytes.includes("SECRET-LOCATION")).toBe(false);
    expect((await sharp(bytes).metadata()).exif).toBeUndefined();
  });

  it("применяет поворот из EXIF, прежде чем его потерять", async () => {
    const input = await solid(32, 16).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    expect((await sharp(input).metadata()).orientation).toBe(6);
    const meta = await sharp((await cleaned(input)).bytes).metadata();
    expect([meta.width, meta.height]).toEqual([16, 32]);
  });

  it("определяет формат по содержимому и сохраняет его", async () => {
    const cases = [
      [await solid().png().toBuffer(), "image/png", "png"],
      [await solid().jpeg().toBuffer(), "image/jpeg", "jpg"],
      [await solid().webp().toBuffer(), "image/webp", "webp"],
      [await solid().gif().toBuffer(), "image/gif", "gif"],
    ] as const;
    for (const [input, contentType, ext] of cases) {
      const result = await cleaned(input);
      expect(result.contentType).toBe(contentType);
      expect(result.ext).toBe(ext);
    }
  });

  it("сохраняет анимацию", async () => {
    const strip = Buffer.alloc(8 * 16 * 3, 0);
    strip.fill(255, 8 * 8 * 3);
    const gif = await sharp(strip, { raw: { width: 8, height: 16, channels: 3, pageHeight: 8 } }).gif().toBuffer();
    expect((await sharp(gif).metadata()).pages).toBe(2);
    expect((await sharp((await cleaned(gif)).bytes).metadata()).pages).toBe(2);
  });

  it("отказывает SVG, даже настоящему", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><script>1</script></svg>');
    expect(typeof (await cleanImage(svg))).toBe("string");
  });

  it("отказывает TIFF: он раскрывается, но в список не входит", async () => {
    expect(await cleanImage(await solid().tiff().toBuffer())).toMatch(/isn't a PNG/);
  });

  it("отказывает заголовку без картинки за ним", async () => {
    const fake = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(SECRET)]);
    expect(await cleanImage(fake)).toMatch(/damaged/);
  });

  it("отказывает обрезанной картинке", async () => {
    const whole = await solid(256, 256).png().toBuffer();
    expect(typeof (await cleanImage(whole.subarray(0, whole.length / 2)))).toBe("string");
  });

  it("отказывает картинке больше потолка в пикселях", async () => {
    // PNG 11000×11000 одного цвета весит килобайты, а в памяти это 360 МБ.
    const big = await solid(11000, 11000).png({ compressionLevel: 9 }).toBuffer();
    expect(await cleanImage(big)).toMatch(/too large in pixels/);
  }, 30_000);
});
