import { deflateRawSync, gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { MAX_UNPACKED_BYTES, checkEntryName, scanMapFile } from "./map-scan";

// Настоящие архивы, собранные здесь же: мок ответил бы то, что мы в него
// заложили, а вопрос ровно в том, что парсер сделает с чужими байтами.

type TestEntry = {
  name: string;
  data?: Uint8Array;
  method?: 0 | 8;
  flags?: number;
  /** Соврать о размере в заголовках. */
  claimedSize?: number;
  /** Права и тип файла в стиле Unix (0xA1FF — символическая ссылка). */
  unixMode?: number;
};

function zip(entries: TestEntry[], options: { prefix?: number; trailing?: number } = {}): Uint8Array {
  const parts: Buffer[] = [Buffer.alloc(options.prefix ?? 0)];
  const central: Buffer[] = [];
  let offset = options.prefix ?? 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const raw = Buffer.from(entry.data ?? new Uint8Array());
    const method = entry.method ?? 8;
    const body = method === 8 ? deflateRawSync(raw) : raw;
    const size = entry.claimedSize ?? raw.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(entry.flags ?? 0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(entry.flags ?? 0, 8);
    header.writeUInt16LE(method, 10);
    header.writeUInt32LE(body.length, 20);
    header.writeUInt32LE(size, 24);
    header.writeUInt16LE(name.length, 28);
    header.writeUInt32LE(((entry.unixMode ?? 0) << 16) >>> 0, 38);
    header.writeUInt32LE(offset, 42);
    central.push(header, name);

    parts.push(local, name, body);
    offset += local.length + name.length + body.length;
  }

  const directory = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(directory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return new Uint8Array(
    Buffer.concat([...parts, directory, eocd, Buffer.alloc(options.trailing ?? 0)])
  );
}

const text = (value: string) => new Uint8Array(Buffer.from(value));
const nbt = new Uint8Array([0x0a, 0x00, 0x00, 0x01, 0x02, 0x03]);
const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);

// Аудит 2026-11, S-23.
describe("scanMapFile: ссылки и дополненный список расширений", () => {
  it("отклоняет запись-ссылку", async () => {
    const file = zip([
      { name: "World/level.dat", data: gzipSync(nbt) },
      { name: "World/saves", data: text("/etc"), method: 0, unixMode: 0xa1ff },
    ]);
    expect(await scanMapFile(file, "map.zip")).toMatch(/link to another location/);
  });

  it("обычные права файла ссылкой не считает", async () => {
    const file = zip([{ name: "World/level.dat", data: gzipSync(nbt), unixMode: 0x81a4 }]);
    expect(await scanMapFile(file, "map.zip")).toBeNull();
  });

  it("отклоняет html, chm и ярлык .desktop", async () => {
    for (const name of ["readme.html", "docs/help.chm", "install.desktop", "pic.SVG"]) {
      expect(checkEntryName(name), name).toMatch(/aren't allowed/);
    }
  });
});

describe("scanMapFile: zip", () => {
  it("пропускает обычный мир", async () => {
    const file = zip([
      { name: "World/", method: 0 },
      { name: "World/level.dat", data: gzipSync(nbt) },
      { name: "World/region/r.0.0.mca", data: new Uint8Array(8192) },
      { name: "World/datapacks/pack.mcmeta", data: text("{}") },
      { name: "README.txt", data: text("Have fun") },
    ]);
    expect(await scanMapFile(file, "u/1-map.zip")).toBeNull();
  });

  it("пропускает архив без сжатия и с кириллицей в имени", async () => {
    const file = zip([{ name: "Мир/схема.schem", data: gzipSync(nbt), method: 0 }]);
    expect(await scanMapFile(file, "map.zip")).toBeNull();
  });

  it("отказывает exe и jar по расширению", async () => {
    expect(await scanMapFile(zip([{ name: "a/tool.exe", data: text("x") }]), "m.zip")).toMatch(/tool\.exe/);
    expect(await scanMapFile(zip([{ name: "mods/hack.JAR", data: text("x") }]), "m.zip")).toMatch(/hack\.JAR/);
  });

  it("находит программу под чужим именем по первым байтам", async () => {
    expect(await scanMapFile(zip([{ name: "region/r.0.0.mca", data: exe }]), "m.zip")).toMatch(/Windows program/);
    const elf = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02]);
    expect(await scanMapFile(zip([{ name: "level.dat", data: elf }]), "m.zip")).toMatch(/Linux program/);
  });

  it("находит программу внутри gzip и за расширением .gz", async () => {
    expect(await scanMapFile(zip([{ name: "level.dat", data: gzipSync(exe) }]), "m.zip")).toMatch(/Windows program/);
    expect(await scanMapFile(zip([{ name: "tool.exe.gz", data: gzipSync(text("x")) }]), "m.zip")).toMatch(/tool\.exe\.gz/);
  });

  it("проверяет вложенный архив, как бы он ни назывался", async () => {
    const inner = zip([{ name: "tool.exe", data: text("x") }]);
    expect(await scanMapFile(zip([{ name: "world.mcworld", data: inner }]), "m.zip")).toMatch(/tool\.exe/);
    const clean = zip([{ name: "level.dat", data: gzipSync(nbt) }]);
    expect(await scanMapFile(zip([{ name: "variant.zip", data: clean }]), "m.zip")).toBeNull();
  });

  it("не пускает архив глубже двух вложений", async () => {
    const one = zip([{ name: "a.txt", data: text("x") }]);
    const two = zip([{ name: "1.zip", data: one }]);
    const three = zip([{ name: "2.zip", data: two }]);
    expect(await scanMapFile(three, "m.zip")).toBeNull();
    const four = zip([{ name: "3.zip", data: three }]);
    expect(await scanMapFile(four, "m.zip")).toMatch(/too many archives/);
  });

  it("отказывает rar и 7z, которые нечем открыть", async () => {
    expect(await scanMapFile(zip([{ name: "a.rar", data: text("x") }]), "m.zip")).toMatch(/a\.rar/);
    const rar = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a]);
    expect(await scanMapFile(zip([{ name: "a.dat", data: rar }]), "m.zip")).toMatch(/RAR archive/);
  });

  it("отказывает зашифрованному архиву", async () => {
    expect(await scanMapFile(zip([{ name: "a.dat", data: text("x"), flags: 1 }]), "m.zip")).toMatch(/password/);
  });

  it("останавливает zip-бомбу настоящей распаковкой", async () => {
    // Заголовок честный, данные настоящие: поверх потолка на один мегабайт.
    const bomb = new Uint8Array(MAX_UNPACKED_BYTES + 1024 * 1024);
    const problem = await scanMapFile(zip([{ name: "bomb.dat", data: bomb }]), "m.zip");
    expect(problem).toMatch(/512 MB/);
  }, 30_000);

  it("ловит заголовок, занизивший размер", async () => {
    const data = new Uint8Array(1024 * 1024);
    const file = zip([{ name: "a.dat", data, claimedSize: 10 }]);
    expect(await scanMapFile(file, "m.zip")).toMatch(/damaged/);
  });

  it("отказывает файлу с программой впереди архива", async () => {
    expect(await scanMapFile(zip([{ name: "a.txt", data: text("x") }], { prefix: 64 }), "m.zip")).toMatch(/hidden data/);
  });

  it("отказывает данным после конца архива", async () => {
    expect(await scanMapFile(zip([{ name: "a.txt", data: text("x") }], { trailing: 8 }), "m.zip")).toMatch(/damaged/);
  });

  it("отказывает записям, ссылающимся на одни и те же байты", async () => {
    const file = Buffer.from(zip([{ name: "a.dat", data: text("x") }, { name: "b.dat", data: text("y") }]));
    // Вторая запись каталога указывает на первую запись файла.
    const secondHeader = file.lastIndexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    file.writeUInt32LE(0, secondHeader + 42);
    expect(await scanMapFile(new Uint8Array(file), "m.zip")).toMatch(/hidden data/);
  });

  it("отказывает пустому и битому архиву", async () => {
    expect(await scanMapFile(zip([]), "m.zip")).toMatch(/empty/);
    expect(await scanMapFile(text("PK not really a zip file at all"), "m.zip")).toMatch(/damaged/);
  });

  it("gzip под именем .zip — отказ", async () => {
    expect(await scanMapFile(gzipSync(nbt), "m.zip")).toMatch(/damaged/);
  });
});

describe("scanMapFile: схематики", () => {
  it("пропускает gzip с NBT и голый NBT", async () => {
    expect(await scanMapFile(gzipSync(nbt), "castle.schem")).toBeNull();
    expect(await scanMapFile(gzipSync(nbt), "castle.litematic")).toBeNull();
    expect(await scanMapFile(nbt, "castle.schematic")).toBeNull();
  });

  it("отказывает gzip с чем-то другим внутри", async () => {
    expect(await scanMapFile(gzipSync(exe), "castle.schem")).toMatch(/valid schematic/);
  });

  it("отказывает zip под именем схематики", async () => {
    expect(await scanMapFile(zip([{ name: "a.txt", data: text("x") }]), "castle.schem")).toMatch(/valid schematic/);
  });

  it("битый gzip — отказ, а не падение", async () => {
    const broken = gzipSync(nbt).subarray(0, 8);
    expect(await scanMapFile(broken, "castle.schem")).not.toBeNull();
  });
});

describe("checkEntryName", () => {
  it("пускает обычные имена", () => {
    for (const name of ["World/level.dat", "r.0.0.mca", "pack/assets/a.png", "No extension", "a.b/c.txt", "__MACOSX/._a"]) {
      expect(checkEntryName(name)).toBeNull();
    }
  });

  it("не выпускает путь из папки распаковки", () => {
    for (const name of ["../evil.txt", "a/../../evil.txt", "..\\evil.txt", "/etc/passwd", "C:\\Windows\\a.txt"]) {
      expect(checkEntryName(name)).toMatch(/unsafe path/);
    }
  });

  it("видит exe за точками и пробелами в конце и за письмом справа налево", () => {
    expect(checkEntryName("tool.exe. ")).not.toBeNull();
    expect(checkEntryName("tool\u202Etxt.exe")).toMatch(/disguised/);
  });
});
