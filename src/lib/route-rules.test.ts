// Правила маршрутизации из next.config.ts — единственное место сайта,
// которое ДО 2026-09-03 не покрывал ни один тест.
//
// ⚠️ ЗАЧЕМ ЭТОТ ФАЙЛ СУЩЕСТВУЕТ. 21 августа редирект
// "/creator/:username" → "/@:username" встал НИЖЕ в списке, чем правило
// про "/creator/upload"… точнее, правила про upload тогда не было вовсе,
// и :username поймал слово «upload» как имя человека. Форма загрузки
// карты уехала на профиль несуществующего пользователя и отдавала 404
// СЕМЬ ДНЕЙ при полностью целом файле страницы.
//
// Всё это время тесты были зелёными, и один из них даже назывался про
// маршруты: marketplace-routes.test.ts спрашивает, КАКОЙ РИСОВАТЬ НАВБАР
// по адресу, а не открывается ли адрес. Разные вопросы. Здесь — второй.
//
// ⚠️ ЧЕГО ЭТОТ ТЕСТ НЕ ДЕЛАЕТ. Ниже своя, УПРОЩЁННАЯ модель сопоставления
// адресов, а не настоящий матчер Next (он живёт внутри path-to-regexp и
// наружу не отдаётся). Модель знает ровно то, что используется в нашем
// конфиге: литералы, ":имя" (ровно один сегмент) и ":имя*" (сколько
// угодно, включая ноль). Появится в конфиге что-то сложнее — модификатор
// "?", regex в скобках, has/missing-условия, — и тест начнёт врать
// уверенным голосом. Поэтому в самом низу стоит сторож, который падает,
// когда в конфиге появляется правило формы, которую модель не понимает.
//
// Сам конфиг импортируется НАСТОЯЩИЙ. Переписывать правила в тест копией
// было бы бессмысленно: копия рассказывала бы про себя.
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { isMarketplaceRoute } from "./marketplace-routes";

type Rule = {
  source: string;
  destination: string;
  permanent?: boolean;
};

// Модель. ":имя*" забирает вместе с предшествующим слэшем, потому что
// "/shop/:path*" в Next совпадает и с самим "/shop" — ноль сегментов.
function toRegex(source: string): RegExp {
  const body = source
    .split("/")
    .map((segment) =>
      segment.replace(/[.+^${}()|[\]\\]/g, "\\$&"),
    )
    .join("/")
    .replace(/\/:(\w+)\*/g, "(?:/(.*))?")
    .replace(/:(\w+)/g, "([^/]+)");
  return new RegExp(`^${body}$`);
}

function paramNames(source: string): string[] {
  return [...source.matchAll(/:(\w+)\*?/g)].map((m) => m[1]);
}

// Куда уводит первое совпавшее правило, или null, если не совпало ни одно.
// «Первое совпавшее» — это и есть поведение Next, и именно на нём
// держится порядок правил в конфиге.
function resolve(rules: Rule[], pathname: string): string | null {
  for (const rule of rules) {
    const match = toRegex(rule.source).exec(pathname);
    if (!match) continue;

    const names = paramNames(rule.source);
    let destination = rule.destination;
    names.forEach((name, index) => {
      const value = match[index + 1] ?? "";
      destination = destination
        .replace(`:${name}*`, value)
        .replace(`:${name}`, value);
    });
    // "/marketplace/" с пустым хвостом — след от правила с нулём
    // сегментов ("/shop" через "/shop/:path*"): слэш на конце лишний.
    return destination.length > 1 ? destination.replace(/\/$/, "") : destination;
  }
  return null;
}

// Конкретный адрес, который заведомо попадает в это правило: параметры
// заменены безобидным словом. Нужен, чтобы спросить у более ранних
// правил, не перехватывают ли они его.
function sampleFor(source: string): string {
  return source.replace(/:(\w+)\*/g, "sample").replace(/:(\w+)/g, "sample");
}

const redirects = (await nextConfig.redirects!()) as Rule[];
const rewrites = (await nextConfig.rewrites!()) as Rule[];

describe("редиректы next.config.ts", () => {
  it("магазин: /shop и всё под ним уходит на /marketplace", () => {
    expect(resolve(redirects, "/shop")).toBe("/marketplace");
    expect(resolve(redirects, "/shop/dragon-shrine")).toBe(
      "/marketplace/dragon-shrine",
    );
    // success_url прошлых покупок Stripe — ради него редирект и вечный.
    expect(resolve(redirects, "/shop/success")).toBe("/marketplace/success");
  });

  it("⚠️ /creator/upload ведёт в админку, а НЕ на профиль «upload»", () => {
    expect(resolve(redirects, "/creator/upload")).toBe("/admin/products/new");
    expect(resolve(redirects, "/creator/upload/submitted")).toBe(
      "/admin/products/new/submitted",
    );
    // Ровно эта строка была бы красной все семь дней августа.
    expect(resolve(redirects, "/creator/upload")).not.toBe("/@upload");
  });

  it("профиль по старому адресу уходит на /@имя", () => {
    expect(resolve(redirects, "/creator/soucampus")).toBe("/@soucampus");
  });

  it("живые адреса магазина не редиректятся никуда", () => {
    for (const pathname of [
      "/marketplace",
      "/marketplace/dragon-shrine",
      "/cart",
      "/admin/products/new",
      "/@soucampus",
      "/u/soucampus",
      "/wiki",
    ]) {
      expect(resolve(redirects, pathname)).toBeNull();
    }
  });

  it("⚠️ ни одно правило не съедено более ранним", () => {
    // Общее свойство вместо перечня случаев: тест поймает и ту ошибку,
    // которую никто не догадался предвидеть. Именно так пропала форма
    // загрузки — про неё отдельного случая никто бы не написал.
    redirects.forEach((rule, index) => {
      const sample = sampleFor(rule.source);
      const shadow = redirects
        .slice(0, index)
        .find((earlier) => toRegex(earlier.source).test(sample));
      expect(
        shadow?.source ?? null,
        `правило "${rule.source}" недостижимо: его перехватывает "${shadow?.source}", стоящее выше`,
      ).toBeNull();
    });
  });

  it("редиректы постоянные — адреса сменились навсегда", () => {
    for (const rule of redirects) {
      expect(rule.permanent, `"${rule.source}" должен быть 308`).toBe(true);
    }
  });

  it("редирект никуда не ведёт на адрес, который сам редиректится", () => {
    // Цепочка из двух переходов — лишний круг по сети и повод для петли.
    for (const rule of redirects) {
      const target = rule.destination.replace(/:(\w+)\*?/g, "sample");
      expect(resolve(redirects, target), `"${rule.source}" → "${target}" → ещё раз`).toBeNull();
    }
  });
});

describe("rewrite профиля", () => {
  it("/@имя показывает страницу /u/имя, не меняя адрес", () => {
    expect(resolve(rewrites, "/@soucampus")).toBe("/u/soucampus");
  });

  it("⚠️ /u/имя rewrite'ом НЕ трогается", () => {
    // Лечить дубль редиректом /u → /@ нельзя: редиректы выполняются
    // раньше rewrite'ов, и получилась бы бесконечная петля. Тест держит
    // это правило: пока /u/ не участвует в правилах, петле неоткуда взяться.
    expect(resolve(rewrites, "/u/soucampus")).toBeNull();
    expect(resolve(redirects, "/u/soucampus")).toBeNull();
    expect(redirects.some((rule) => rule.source.startsWith("/@"))).toBe(false);
  });

  it("навбар знает про ОБА адреса профиля", () => {
    // Знание из next.config.ts и знание из marketplace-routes.ts должны
    // сходиться: в августе они разошлись, и это стоило недели.
    expect(isMarketplaceRoute("/@soucampus")).toBe(true);
    expect(isMarketplaceRoute("/u/soucampus")).toBe(true);
  });
});

describe("сторож модели", () => {
  it("в конфиге нет правил формы, которую тест не понимает", () => {
    // Если это упало — не «почини тест», а прочитай сверху, чего модель
    // не умеет. Молча зелёный тест на непонятом правиле хуже красного.
    for (const rule of [...redirects, ...rewrites]) {
      expect(rule.source, `непонятный source: ${rule.source}`).toMatch(
        /^\/(?:[\w\-.@]|:\w+\*?|\/)*$/,
      );
      expect(rule).not.toHaveProperty("has");
      expect(rule).not.toHaveProperty("missing");
    }
  });
});
