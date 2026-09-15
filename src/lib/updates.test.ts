import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import { UPDATES, getAllUpdates, getUpdate, type UpdatePost } from "./updates";

// Посты — данные, которые пишутся руками, и ошибаются в них одним из
// немногих способов: слаг-дубль (второй пост недостижим), дата, которой
// нет в календаре, картинка с опечаткой в имени (дыра на месте обложки)
// или картинка с чужого сервера. Всё это ловится здесь, до сборки.

const PUBLIC_DIR = join(__dirname, "..", "..", "public");

function imagesOf(post: UpdatePost): string[] {
  const inBody = post.body.flatMap((section) =>
    section.blocks.flatMap((block) =>
      block.kind === "image" ? [block.src] : [],
    ),
  );
  return [post.cover.src, ...inBody];
}

describe("UPDATES", () => {
  it("слаги уникальны и годятся в адрес", () => {
    const slugs = UPDATES.map((post) => post.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("даты — настоящие дни вида YYYY-MM-DD", () => {
    for (const post of UPDATES) {
      expect(post.date, post.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // «2026-02-30» проходит регулярку, но Date переводит его в март:
      // сверка туда-обратно ловит несуществующий день.
      const roundTrip = new Date(`${post.date}T00:00:00Z`)
        .toISOString()
        .slice(0, 10);
      expect(roundTrip, post.slug).toBe(post.date);
    }
  });

  it("⚠️ картинки только свои, и файлы существуют", () => {
    for (const post of UPDATES) {
      for (const src of imagesOf(post)) {
        // "/…" — свой файл; "//…" — чужой сервер без протокола.
        expect(src.startsWith("/") && !src.startsWith("//"), src).toBe(true);
        expect(existsSync(join(PUBLIC_DIR, src)), src).toBe(true);
      }
    }
  });

  it("ссылки из постов ведут внутрь сайта", () => {
    for (const post of UPDATES) {
      if (!post.link) continue;
      expect(post.link.href.startsWith("/"), post.slug).toBe(true);
      expect(post.link.href.startsWith("//"), post.slug).toBe(false);
    }
  });
});

describe("getAllUpdates", () => {
  it("новые сверху", () => {
    const dates = getAllUpdates().map((post) => post.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("не теряет и не дублирует посты", () => {
    expect(getAllUpdates()).toHaveLength(UPDATES.length);
  });
});

describe("getUpdate", () => {
  it("находит пост по слагу и отдаёт null на чужой адрес", () => {
    expect(getUpdate(UPDATES[0].slug)).toBe(UPDATES[0]);
    expect(getUpdate("no-such-post")).toBeNull();
  });
});
