import { describe, it, expect } from "vitest";
import {
  MAP_FILE_EXTENSIONS,
  MAP_FILE_MAX_BYTES,
  IMAGE_MAX_BYTES,
  HEAD_BYTES,
  checkMapBytes,
  checkImageBytes,
  safeExtension,
} from "./upload-limits";

// Проверки загружаемых файлов — 2026-09-11.
//
// ⚠️ Тесты появились ВМЕСТЕ со шлюзом, и это не совпадение. Пока
// checkMapFile жил только в браузере, покрывать его было почти нечем:
// он принимал File и упирался в размер, а главное — его всё равно
// отключала одна строка в консоли. Тестировать защиту, которую
// выключает тот, от кого защищаемся, — самоуспокоение.
//
// Теперь те же функции исполняет сервер (/api/creator/upload читает
// первые байты уже загруженного объекта), они чистые, и вот их-то
// стоит держать под тестом: именно здесь решается, доедет ли
// переименованный .exe до покупателя.

/** Голова файла: сигнатура плюс добивка до HEAD_BYTES. */
function head(...bytes: number[]): Uint8Array {
  const out = new Uint8Array(HEAD_BYTES);
  out.set(bytes.slice(0, HEAD_BYTES));
  return out;
}

const ZIP = head(0x50, 0x4b, 0x03, 0x04);
const GZIP = head(0x1f, 0x8b);
const PNG = head(0x89, 0x50, 0x4e, 0x47);

describe("checkMapBytes", () => {
  it("пропускает обычный zip", () => {
    expect(checkMapBytes(ZIP, 1024, "castle.zip")).toBeNull();
  });

  it("пропускает пустой и многотомный zip — это тоже настоящие архивы", () => {
    expect(checkMapBytes(head(0x50, 0x4b, 0x05, 0x06), 22, "empty.zip")).toBeNull();
    expect(checkMapBytes(head(0x50, 0x4b, 0x07, 0x08), 512, "split.zip")).toBeNull();
  });

  it("пропускает gzip-схематику", () => {
    expect(checkMapBytes(GZIP, 4096, "house.schem")).toBeNull();
  });

  it("пропускает .litematic — тот же gzip, и шлюз знает расширение", () => {
    expect(checkMapBytes(GZIP, 4096, "castle.litematic")).toBeNull();
    expect((MAP_FILE_EXTENSIONS as readonly string[]).includes("litematic")).toBe(true);
  });

  it("не пускает .bp напрямую — его сигнатуру мы не знаем", () => {
    expect((MAP_FILE_EXTENSIONS as readonly string[]).includes("bp")).toBe(false);
  });

  it("отклоняет переименованный файл — главный случай, ради которого всё", () => {
    // MZ — заголовок windows-исполняемого. Расширение говорит .zip, но
    // расширение говорит загружающий, а байты — сам файл.
    const exe = head(0x4d, 0x5a, 0x90, 0x00);
    expect(checkMapBytes(exe, 1024, "map.zip")).toMatch(/doesn't look like/);
  });

  it("картинку под видом карты тоже отклоняет", () => {
    expect(checkMapBytes(PNG, 1024, "map.zip")).toMatch(/doesn't look like/);
  });

  it("голый NBT засчитывает ТОЛЬКО схематике", () => {
    const nbt = head(0x0a, 0x00, 0x00);
    // 0x0A — это просто перевод строки, признак слабый. Поэтому он
    // работает в паре с расширением и сам по себе ничего не открывает.
    expect(checkMapBytes(nbt, 512, "house.schematic")).toBeNull();
    expect(checkMapBytes(nbt, 512, "house.zip")).toMatch(/doesn't look like/);
  });

  it("расширение проверяется без учёта регистра", () => {
    const nbt = head(0x0a);
    expect(checkMapBytes(nbt, 512, "HOUSE.SCHEM")).toBeNull();
  });

  it("пустой файл отклоняется до всякой сигнатуры", () => {
    expect(checkMapBytes(ZIP, 0, "castle.zip")).toBe("That file is empty.");
  });

  it("размер сверяется по границе включительно", () => {
    expect(checkMapBytes(ZIP, MAP_FILE_MAX_BYTES, "big.zip")).toBeNull();
    expect(checkMapBytes(ZIP, MAP_FILE_MAX_BYTES + 1, "big.zip")).toMatch(/15 MB or smaller/);
  });

  it("обрезанная голова не проходит за сигнатуру", () => {
    // Файл короче сигнатуры: startsWith обязан ответить «нет», а не
    // сравнить то, чего нет, с undefined.
    expect(checkMapBytes(new Uint8Array([0x50, 0x4b]), 2, "tiny.zip")).toMatch(
      /doesn't look like/
    );
  });
});

describe("checkImageBytes", () => {
  it("пропускает png, jpeg и gif", () => {
    expect(checkImageBytes(PNG, 2048, "cover.png")).toBeNull();
    expect(checkImageBytes(head(0xff, 0xd8, 0xff), 2048, "cover.jpg")).toBeNull();
    expect(checkImageBytes(head(0x47, 0x49, 0x46), 2048, "cover.gif")).toBeNull();
  });

  it("у webp проверяет и метку формата, а не только RIFF", () => {
    const riff = [0x52, 0x49, 0x46, 0x46];
    const webp = head(...riff, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50); // "WEBP"
    const wav = head(...riff, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45); // "WAVE"
    expect(checkImageBytes(webp, 2048, "cover.webp")).toBeNull();
    // RIFF — контейнер не только для картинок; без второй проверки сюда
    // проехал бы звуковой файл.
    expect(checkImageBytes(wav, 2048, "cover.webp")).toMatch(/isn't a valid WebP/);
  });

  it("zip под видом картинки отклоняется", () => {
    expect(checkImageBytes(ZIP, 2048, "cover.png")).toMatch(/isn't a PNG/);
  });

  it("размер сверяется по границе включительно", () => {
    expect(checkImageBytes(PNG, IMAGE_MAX_BYTES, "cover.png")).toBeNull();
    expect(checkImageBytes(PNG, IMAGE_MAX_BYTES + 1, "cover.png")).toMatch(/10 MB or smaller/);
  });
});

describe("safeExtension", () => {
  it("вычищает попытку выйти из своей папки", () => {
    // Имя файла целиком задаёт загружающий, а расширение едет в ключ
    // объекта. Обещание здесь — «на выходе только буквы и цифры», а не
    // какая-то конкретная строка: из "map.zip/../../other" получается
    // "other", и это нормально — важно, что ни слэша, ни точки не
    // осталось, то есть подставить сегмент пути через имя файла нельзя.
    expect(safeExtension("map.zip/../../other", "zip")).toMatch(/^[a-z0-9]{1,8}$/);
    expect(safeExtension("map.zip/..", "zip")).toMatch(/^[a-z0-9]{1,8}$/);
    expect(safeExtension("../../etc/passwd", "zip")).toMatch(/^[a-z0-9]{1,8}$/);
  });

  it("приводит к нижнему регистру и обрезает длинное", () => {
    expect(safeExtension("MAP.ZIP", "bin")).toBe("zip");
    expect(safeExtension("map.averylongextension", "bin")).toBe("averylon");
  });

  it("без расширения отдаёт запасное", () => {
    expect(safeExtension("map", "zip")).toBe("zip");
    expect(safeExtension("map.", "zip")).toBe("zip");
  });

  it("⚠️ чистит, но НЕ решает: exe проходит её насквозь", () => {
    // Ровно поэтому у сервера есть отдельный перечень позволенного —
    // safeExtension про мусор в строке, а не про то, что разрешено.
    expect(safeExtension("map.exe", "zip")).toBe("exe");
    expect((MAP_FILE_EXTENSIONS as readonly string[]).includes("exe")).toBe(false);
  });
});
