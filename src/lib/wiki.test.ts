import { describe, it, expect } from "vitest";
import { WIKI_ARTICLES, WIKI_SECTIONS } from "./wiki";

// Вики — данные, написанные руками. Ошибаются в них так: слаг-дубль
// (вторая статья недостижима), раздел, которого нет в оглавлении (статья
// живёт, но на /wiki её не найти), и внешняя ссылка не того вида.

describe("WIKI_ARTICLES", () => {
  it("слаги уникальны и годятся в адрес", () => {
    const slugs = WIKI_ARTICLES.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("у каждого раздела оглавления есть статьи", () => {
    for (const section of WIKI_SECTIONS) {
      const count = WIKI_ARTICLES.filter((a) => a.section === section.id).length;
      expect(count, section.id).toBeGreaterThan(0);
    }
  });

  it("⚠️ внешние ссылки — только https://", () => {
    // Адрес из данных становится href как есть. «javascript:…» или
    // «http://» здесь — это кликабельная дыра или страница без
    // шифрования, и сборка её не заметит. Ловим здесь.
    for (const article of WIKI_ARTICLES) {
      for (const section of article.body) {
        for (const block of section.blocks) {
          if (block.kind !== "links") continue;
          for (const link of block.items) {
            expect(new URL(link.href).protocol, link.href).toBe("https:");
            expect(link.label.trim(), link.href).not.toBe("");
          }
        }
      }
    }
  });
});
