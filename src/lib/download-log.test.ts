import { describe, expect, it } from "vitest";
import { downloadHref, escapeLike, isUuid, SESSION_ID_PATTERN } from "@/lib/downloads";

const PRODUCT = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

describe("downloadHref", () => {
  it("ведёт на обработчик, а не на файл", () => {
    expect(downloadHref(PRODUCT)).toBe(`/api/download?product=${PRODUCT}`);
  });

  it("со страницы успеха несёт сессию как пропуск", () => {
    const href = downloadHref(PRODUCT, "cs_test_abc123456789");
    const params = new URL(href, "https://x.test").searchParams;
    expect(params.get("product")).toBe(PRODUCT);
    expect(params.get("session")).toBe("cs_test_abc123456789");
  });
});

describe("isUuid", () => {
  it("принимает id карты", () => {
    expect(isUuid(PRODUCT)).toBe(true);
  });

  it("отбрасывает всё остальное до похода в базу", () => {
    expect(isUuid("")).toBe(false);
    expect(isUuid("my-map")).toBe(false);
    expect(isUuid(`${PRODUCT},x`)).toBe(false);
  });
});

describe("SESSION_ID_PATTERN", () => {
  it("пропускает только сессии Stripe — ключ бесплатного заказа угадываем", () => {
    expect(SESSION_ID_PATTERN.test("cs_live_a1B2c3D4e5F6")).toBe(true);
    expect(SESSION_ID_PATTERN.test(`free:${PRODUCT}:${PRODUCT}`)).toBe(false);
  });
});

describe("escapeLike", () => {
  it("гасит подстановочные знаки LIKE", () => {
    expect(escapeLike("50%_off")).toBe("50\\%\\_off");
  });

  it("не даёт почте разобрать фильтр or(...) на части", () => {
    // Точка, запятая и скобки — синтаксис PostgREST внутри or().
    expect(escapeLike("a.b@x.com")).toBe("a_b@x_com");
    expect(escapeLike("x),user_id.eq.(y")).not.toMatch(/[,().]/);
  });
});
