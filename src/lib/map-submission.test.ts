import { describe, expect, it } from "vitest";
import {
  GALLERY_MAX,
  PRICE_MAX_CENTS,
  checkMapSubmission,
  isOwnImageUrl,
  outcomeOfAuthorEdit,
  type MapSubmission,
} from "@/lib/map-submission";
import { EMPTY_SPECS } from "@/lib/products";

// Правила шлюза записи карты. Под тестами они по той же причине, по
// которой под тестами оказались проверки файла 11.09: пока эти правила
// жили в форме, их выключал тот, от кого они защищают, и проверять там
// было нечего. Теперь они на сервере — и их можно спросить.

const SUPABASE = "https://example.supabase.co";
const OWN_IMAGE = `${SUPABASE}/storage/v1/object/public/product-images/u1/1-0.jpg`;

function submission(patch: Partial<MapSubmission> = {}): MapSubmission {
  return {
    title: "Emberfall Manor",
    summary: "A manor on a cliff",
    description: "<p>Built over three weeks.</p>",
    coverUrl: OWN_IMAGE,
    galleryUrls: [],
    priceCents: 2500,
    category: "building",
    filePath: "u1/1-map.zip",
    specs: EMPTY_SPECS,
    reactionOptionId: null,
    ...patch,
  };
}

describe("checkMapSubmission", () => {
  it("пропускает обычную карту", () => {
    expect(checkMapSubmission(submission(), SUPABASE)).toBeNull();
  });

  it("требует заголовок, а пробелы за него не считает", () => {
    expect(checkMapSubmission(submission({ title: "   " }), SUPABASE)).toMatch(/title/);
  });

  it("не пускает «free» как категорию — это цена, а не тег", () => {
    expect(
      checkMapSubmission(submission({ category: "free" }), SUPABASE)
    ).toMatch(/category/);
  });

  it("не пускает выдуманную категорию", () => {
    expect(
      checkMapSubmission(
        submission({ category: "whatever" as MapSubmission["category"] }),
        SUPABASE
      )
    ).toMatch(/category/);
  });

  it("бесплатная карта — законная цена", () => {
    expect(checkMapSubmission(submission({ priceCents: 0 }), SUPABASE)).toBeNull();
  });

  it("отбивает цену выше потолка", () => {
    expect(
      checkMapSubmission(submission({ priceCents: PRICE_MAX_CENTS + 1 }), SUPABASE)
    ).toMatch(/price/i);
  });

  it("отбивает дробные и отрицательные центы", () => {
    expect(checkMapSubmission(submission({ priceCents: 10.5 }), SUPABASE)).toMatch(/price/i);
    expect(checkMapSubmission(submission({ priceCents: -1 }), SUPABASE)).toMatch(/price/i);
  });

  it("считает обложку в общее число картинок", () => {
    const gallery = Array.from({ length: GALLERY_MAX - 1 }, () => OWN_IMAGE);
    expect(checkMapSubmission(submission({ galleryUrls: gallery }), SUPABASE)).toBeNull();
    expect(
      checkMapSubmission(submission({ galleryUrls: [...gallery, OWN_IMAGE] }), SUPABASE)
    ).toMatch(/images/);
  });

  it("не пускает картинку с чужого сервера — ни обложкой, ни в галерее", () => {
    expect(
      checkMapSubmission(submission({ coverUrl: "https://evil.com/a.jpg" }), SUPABASE)
    ).toMatch(/uploaded here/);
    expect(
      checkMapSubmission(submission({ galleryUrls: ["https://evil.com/a.jpg"] }), SUPABASE)
    ).toMatch(/uploaded here/);
  });

  it("считает перебор характеристик перебором", () => {
    const themes = Array.from({ length: 13 }, (_, i) => `t${i}`);
    expect(
      checkMapSubmission(
        submission({ specs: { ...EMPTY_SPECS, themes } }),
        SUPABASE
      )
    ).toMatch(/details/);
  });
});

describe("isOwnImageUrl", () => {
  it("пускает наш бакет и свой статический файл", () => {
    expect(isOwnImageUrl(OWN_IMAGE, SUPABASE)).toBe(true);
    expect(isOwnImageUrl("/portfolio/emberfall-manor.png", SUPABASE)).toBe(true);
  });

  it("не пускает чужой хост, другой бакет и протокол-относительный адрес", () => {
    expect(isOwnImageUrl("https://evil.com/a.jpg", SUPABASE)).toBe(false);
    expect(
      isOwnImageUrl(`${SUPABASE}/storage/v1/object/public/avatars/a.jpg`, SUPABASE)
    ).toBe(false);
    // ⚠️ Та же ловушка, что ловит safeHref в уведомлениях: адрес
    // начинается со слэша, но ведёт наружу.
    expect(isOwnImageUrl("//evil.com/a.jpg", SUPABASE)).toBe(false);
  });

  it("без адреса проекта не пускает ничего внешнего", () => {
    expect(isOwnImageUrl(OWN_IMAGE, "")).toBe(false);
  });
});

describe("outcomeOfAuthorEdit — повторяет guard_product_author_edit", () => {
  it("снятую площадкой возвращает в очередь", () => {
    expect(outcomeOfAuthorEdit("suspended", false)).toEqual({
      state: "pending",
      submissionKind: "after_takedown",
    });
  });

  it("отклонённую возвращает в очередь", () => {
    expect(outcomeOfAuthorEdit("rejected", false)).toEqual({
      state: "pending",
      submissionKind: "after_rejection",
    });
  });

  it("живую с подменённым файлом снимает с витрины", () => {
    expect(outcomeOfAuthorEdit("live", true)).toEqual({
      state: "pending",
      submissionKind: "file_changed",
    });
  });

  it("живую без подмены файла не трогает", () => {
    expect(outcomeOfAuthorEdit("live", false)).toBeNull();
  });

  it("ждущую разбора и спрятанную автором не трогает", () => {
    expect(outcomeOfAuthorEdit("pending", true)).toBeNull();
    expect(outcomeOfAuthorEdit("hidden", true)).toBeNull();
  });
});
