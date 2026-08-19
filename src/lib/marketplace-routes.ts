// Какие адреса считаются «страницами магазина».
//
// Список был вшит в Navbar: там он решал, показывать пилюлю портфолио или
// магазинную. Потом тот же вопрос понадобился PricingSection («не
// показывать тарифы в магазине»), и второй такой же список неизбежно
// разъехался бы с первым — ровно так уже разъезжались семь копий
// градиента и семь форматов даты. Поэтому список один и живёт здесь.
//
// Что сюда входит и почему. Не только сам маркетплейс: вход, регистрация,
// сброс пароля и личный кабинет — часть флоу покупки (покупка требует
// аккаунта), и переключение оформления посреди «войти → забыл → задать
// новый» выглядело бы так, будто человека выкинуло на другой сайт.
// Профиль продавца — тоже магазин, это его витрина.

const EXACT = new Set([
  "/marketplace",
  "/cart",
  "/support",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/link-expired",
  "/settings",
  "/purchases",
  "/notifications",
]);

const PREFIXES = ["/marketplace/", "/profile", "/resources", "/creator"];

export function isMarketplaceRoute(pathname: string): boolean {
  if (EXACT.has(pathname)) return true;
  return PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
