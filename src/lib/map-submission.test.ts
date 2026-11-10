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

  // Аудит 2026-11, S-09: Stripe не проводит платёж меньше €0.50.
  it("отбивает платную цену ниже минимума Stripe", () => {
    expect(checkMapSubmission(submission({ priceCents: 1 }), SUPABASE)).toMatch(/at least/i);
    expect(checkMapSubmission(submission({ priceCents: 49 }), SUPABASE)).toMatch(/at least/i);
    expect(checkMapSubmission(submission({ priceCents: 50 }), SUPABASE)).toBeNull();
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

describe("непроверенная загрузка", () => {
  const PENDING = `${SUPABASE}/storage/v1/object/public/product-images/u1/pending-1-a.jpg`;

  it("обложкой и в галерею не годится: иначе confirm можно не вызывать", () => {
    expect(isOwnImageUrl(PENDING, SUPABASE)).toBe(false);
    expect(checkMapSubmission(submission({ coverUrl: PENDING }), SUPABASE)).not.toBeNull();
    expect(checkMapSubmission(submission({ galleryUrls: [PENDING] }), SUPABASE)).not.toBeNull();
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

  // Аудит 2026-11, S-21.
  it("не пускает обратный слэш: браузер читает /\\ как //", () => {
    expect(isOwnImageUrl("/\\evil.com/a.png", SUPABASE)).toBe(false);
    expect(isOwnImageUrl("/portfolio\\a.png", SUPABASE)).toBe(false);
    expect(isOwnImageUrl("/\t/evil.com/a.png", SUPABASE)).toBe(false);
  });

  it("не пускает свои обработчики под видом картинки", () => {
    expect(isOwnImageUrl("/api/download?product=x", SUPABASE)).toBe(false);
    expect(isOwnImageUrl("/auth/callback?code=x", SUPABASE)).toBe(false);
    expect(isOwnImageUrl("/_next/image?url=x", SUPABASE)).toBe(false);
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

  it("ждущую разбора не трогает", () => {
    expect(outcomeOfAuthorEdit("pending", true)).toBeNull();
  });

  // Аудит 2026-11, S-13: спрятать → заменить файл → вернуть обходило
  // модерацию. Спрятанная карта одобрена, и новый файл в ней — заявка.
  it("спрятанную с подменённым файлом отправляет в очередь", () => {
    expect(outcomeOfAuthorEdit("hidden", true)).toEqual({
      state: "pending",
      submissionKind: "file_changed",
    });
  });

  it("спрятанную без подмены файла не трогает", () => {
    expect(outcomeOfAuthorEdit("hidden", false)).toBeNull();
  });
});
