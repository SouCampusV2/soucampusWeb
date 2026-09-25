import { describe, expect, it } from "vitest";
import { FAQ_ITEMS, FAQ_SECTIONS } from "@/lib/faq";
import { WIKI_ARTICLES } from "@/lib/wiki";

describe("FAQ", () => {
  it("вопросы не повторяются — они же ключи в разметке и в JSON-LD", () => {
    const questions = FAQ_ITEMS.map((item) => item.question);
    expect(new Set(questions).size).toBe(questions.length);
  });

  it("id разделов уникальны — это якоря страницы", () => {
    const ids = FAQ_SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("у каждого вопроса есть ответ", () => {
    for (const item of FAQ_ITEMS) {
      expect(item.answer.length, item.question).toBeGreaterThan(0);
      for (const paragraph of item.answer) expect(paragraph.trim()).not.toBe("");
    }
  });

  // Ссылка на статью вики, которой нет, — 404 посреди ответа. Статьи
  // переименовываются, а FAQ про это не узнает сам.
  it("ссылки на вики ведут на существующие статьи", () => {
    const slugs = new Set(WIKI_ARTICLES.map((article) => article.slug));
    for (const item of FAQ_ITEMS) {
      const href = item.link?.href;
      if (!href?.startsWith("/wiki/")) continue;
      expect(slugs.has(href.slice("/wiki/".length)), href).toBe(true);
    }
  });

  it("ссылки только внутрь сайта", () => {
    for (const item of FAQ_ITEMS) {
      if (!item.link) continue;
      expect(item.link.href.startsWith("/") && !item.link.href.startsWith("//")).toBe(true);
    }
  });
});
