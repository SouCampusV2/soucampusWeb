import { describe, it, expect } from "vitest";
import { sanitizeDescription } from "./sanitize";

// Санитайзер — единственное, что стоит между креаторским HTML и
// браузером покупателя, поэтому проверяем обе стороны: что опасное
// вырезано И что легальная вёрстка выжила. Второе не менее важно —
// слишком жадный санитайзер молча съедает описания, и это заметят
// нескоро.

describe("sanitizeDescription — что должно быть вырезано", () => {
  it("выбрасывает script вместе с содержимым", () => {
    const out = sanitizeDescription('<p>ok</p><script>alert("xss")</script>');
    expect(out).not.toContain("script");
    expect(out).not.toContain("alert");
    expect(out).toContain("<p>ok</p>");
  });

  it("снимает обработчики событий, оставляя сам тег", () => {
    const out = sanitizeDescription('<img src="https://x.test/a.png" onerror="steal()">');
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("steal");
    expect(out).toContain("src=");
  });

  it("не пропускает javascript: в ссылке", () => {
    const out = sanitizeDescription('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain("javascript:");
    // Текст ссылки остаётся — вырезается адрес, а не абзац.
    expect(out).toContain("click");
  });

  it("выбрасывает iframe и style — их наш редактор не вставляет", () => {
    const out = sanitizeDescription('<iframe src="https://evil.test"></iframe><style>*{}</style>');
    expect(out).not.toContain("iframe");
    expect(out).not.toContain("style");
  });

  it("не даёт задать произвольный класс или id", () => {
    const out = sanitizeDescription('<p class="fixed inset-0 z-50" id="x">text</p>');
    expect(out).toBe("<p>text</p>");
  });
});

describe("sanitizeDescription — что должно выжить", () => {
  it("оставляет форматирование текста", () => {
    const html = "<h2>Title</h2><p><strong>bold</strong> <em>italic</em> <s>gone</s></p>";
    expect(sanitizeDescription(html)).toBe(html);
  });

  it("оставляет списки и цитаты", () => {
    const html = "<ul><li>one</li><li>two</li></ul><blockquote>quote</blockquote>";
    expect(sanitizeDescription(html)).toBe(html);
  });

  it("оставляет таблицу целиком, вместе с colspan", () => {
    const html =
      '<table><thead><tr><th colspan="2">Versions</th></tr></thead>' +
      "<tbody><tr><td>1.20</td><td>yes</td></tr></tbody></table>";
    expect(sanitizeDescription(html)).toBe(html);
  });

  it("оставляет картинку из нашего Storage", () => {
    const url = "https://abc.supabase.co/storage/v1/object/public/product-images/a.png";
    const out = sanitizeDescription(`<img src="${url}" alt="screenshot">`);
    expect(out).toContain(url);
    expect(out).toContain('alt="screenshot"');
  });

  it("оставляет обычную ссылку и сам дописывает rel", () => {
    const out = sanitizeDescription('<a href="https://example.test" target="_blank">link</a>');
    expect(out).toContain('href="https://example.test"');
    // noopener обязателен: без него открытая вкладка получает доступ к
    // window.opener нашей страницы.
    expect(out).toContain("noopener");
  });
});
