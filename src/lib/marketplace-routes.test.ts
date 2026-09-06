import { describe, it, expect } from "vitest";
import { isMarketplaceRoute } from "./marketplace-routes";

// Чистая функция-граница «портфолио или магазин». В сеть не ходит,
// гоняется в CI без ключей (тот же подход, что в creators.test.ts).
//
// Почему это стоит теста: от одного ответа зависят две разные вещи —
// какой навбар показать и показывать ли блок тарифов. Список рос
// вручную и уже дважды пополнялся задним числом (страницы сброса
// пароля, профиль продавца). Тест фиксирует именно те случаи, которые
// добавляли не сразу и о которых легко забыть при следующей правке.

describe("isMarketplaceRoute", () => {
  it("сам маркетплейс и страница карты", () => {
    expect(isMarketplaceRoute("/marketplace")).toBe(true);
    expect(isMarketplaceRoute("/marketplace/emberfall-manor")).toBe(true);
  });

  it("корзина и поддержка", () => {
    expect(isMarketplaceRoute("/cart")).toBe(true);
    expect(isMarketplaceRoute("/support")).toBe(true);
  });

  it("вход и весь путь сброса пароля — тоже магазин", () => {
    for (const path of [
      "/login",
      "/signup",
      "/forgot-password",
      "/reset-password",
      "/link-expired",
    ]) {
      expect(isMarketplaceRoute(path)).toBe(true);
    }
  });

  it("личный кабинет", () => {
    expect(isMarketplaceRoute("/settings")).toBe(true);
    expect(isMarketplaceRoute("/purchases")).toBe(true);
    expect(isMarketplaceRoute("/notifications")).toBe(true);
    expect(isMarketplaceRoute("/resources")).toBe(true);
    expect(isMarketplaceRoute("/resources/some-map/edit")).toBe(true);
  });

  it("вики — магазинная сторона", () => {
    // Попасть в неё можно только из магазина: ссылка стоит в
    // SHOP_NAV_LINKS и в футерной колонке Marketplace. С 02.09 по
    // 06.09 навбар там был портфолийный — про вики просто забыли, когда
    // её заводили, и заметил это владелец глазами.
    expect(isMarketplaceRoute("/wiki")).toBe(true);
    expect(isMarketplaceRoute("/wiki/installing-a-map")).toBe(true);
    expect(isMarketplaceRoute("/wiki/missing-blocks")).toBe(true);
  });

  it("профиль продавца — витрина магазина", () => {
    // ⚠️ Здесь стоял /creator/upload, и проверка ПРОХОДИЛА всё время,
    // пока сама страница отдавала 404: она спрашивает, какой рисовать
    // навбар, а не открывается ли адрес вообще. Форма уехала в админку
    // 28.08, под /creator страниц не осталось — строку убрали.
    // Правила next.config.ts тестами по-прежнему не покрыты.
    expect(isMarketplaceRoute("/creator/upload")).toBe(false);
    // Профиль. Оба адреса, потому что снаружи он /@name, а внутри
    // /u/name (rewrite в next.config.ts): usePathname() отдаёт первый,
    // но зайти напрямую можно и по второму.
    expect(isMarketplaceRoute("/@soucampus")).toBe(true);
    expect(isMarketplaceRoute("/u/soucampus")).toBe(true);
  });

  it("старые адреса профиля, оставленные редиректами", () => {
    expect(isMarketplaceRoute("/profile")).toBe(true);
    expect(isMarketplaceRoute("/profile/edit")).toBe(true);
  });

  it("страницы портфолио магазином не считаются", () => {
    for (const path of [
      "/",
      "/portfolio",
      "/portfolio/ironholt",
      "/about",
      "/contact",
      "/terms",
      "/reviews/erik",
    ]) {
      expect(isMarketplaceRoute(path)).toBe(false);
    }
  });

  it("не путается на похожем начале адреса", () => {
    // /marketplace-news не наш раздел, но начинается так же — префикс
    // намеренно с косой чертой, чтобы такой адрес не проходил.
    expect(isMarketplaceRoute("/marketplace-news")).toBe(false);
  });
});
