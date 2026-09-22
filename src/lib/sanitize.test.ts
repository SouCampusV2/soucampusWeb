import { describe, it, expect } from "vitest";
import { sanitizeDescription } from "./sanitize";

// Адрес базы передаётся явно: в тестах переменной окружения нет, а без
// неё «нашего Storage» не существует и отказ получила бы любая картинка.
const SUPABASE = "https://abc.supabase.co";
const OWN_IMAGE = `${SUPABASE}/storage/v1/object/public/product-images/a.png`;
const clean = (html: string) => sanitizeDescription(html, SUPABASE);

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
    // Адрес НАШ намеренно: с чужим тег ушёл бы целиком, и тест зеленел бы
    // не потому, что снят onerror, а потому, что снято всё.
    const out = clean(`<img src="${OWN_IMAGE}" onerror="steal()">`);
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("steal");
    expect(out).toContain("src=");
  });

  it("выбрасывает картинку с чужого сервера целиком — иначе автор собирал бы IP посетителей", () => {
    const out = clean('<p>before</p><img src="https://tracker.test/pixel.png" alt="x"><p>after</p>');
    expect(out).not.toContain("<img");
    expect(out).not.toContain("tracker.test");
    // Вырезается картинка, а не описание вокруг неё.
    expect(out).toBe("<p>before</p><p>after</p>");
  });

  it("не пускает протокол-относительный адрес «//evil.test» — он ведёт наружу", () => {
    expect(clean('<img src="//evil.test/a.png">')).not.toContain("<img");
  });

  it("не пускает хост, лишь похожий на наш", () => {
    const lookalike = "https://abc.supabase.co.evil.test/storage/v1/object/public/product-images/a.png";
    expect(clean(`<img src="${lookalike}">`)).not.toContain("<img");
  });

  it("не пускает чужой бакет нашего же проекта — картинке описания место в product-images", () => {
    expect(clean(`<img src="${SUPABASE}/storage/v1/object/public/avatars/a.png">`)).not.toContain("<img");
  });

  it("без адреса базы не пускает ни одну внешнюю картинку — отказ, а не «пропустить всё»", () => {
    expect(sanitizeDescription(`<img src="${OWN_IMAGE}">`, "")).not.toContain("<img");
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
    const out = clean(`<img src="${OWN_IMAGE}" alt="screenshot">`);
    expect(out).toContain(OWN_IMAGE);
    expect(out).toContain('alt="screenshot"');
  });

  it("оставляет свой статический файл — на таких стоит засеянный каталог", () => {
    expect(clean('<img src="/portfolio/a.png">')).toContain('src="/portfolio/a.png"');
  });

  it("оставляет data: — такая картинка внутри разметки, наружу браузер не ходит", () => {
    const data = "data:image/png;base64,iVBORw0KGgo=";
    expect(clean(`<img src="${data}">`)).toContain(data);
  });

  it("оставляет обычную ссылку и сам дописывает rel", () => {
    const out = sanitizeDescription('<a href="https://example.test" target="_blank">link</a>');
    expect(out).toContain('href="https://example.test"');
    // noopener обязателен: без него открытая вкладка получает доступ к
    // window.opener нашей страницы.
    expect(out).toContain("noopener");
  });
});
