// Юридические тексты, которые обязаны совпадать дословно в нескольких
// местах (2026-09-26, аудит перед живыми платежами — docs/STRIPE.md →
// Legal). Модуль нейтральный: его читают и клиентские компоненты
// (галочка в корзине и у «Buy now»), и сервер (/api/checkout, Stripe),
// и /terms. Поэтому здесь нет ни одного серверного импорта.

/**
 * Продавец. Право ЕС требует от торгующего онлайн имя, географический
 * адрес и почту в легкодоступном месте. Имя — то же, что оператор
 * данных на /privacy (там свой CONTROLLER, это одно лицо).
 */
export const SELLER = {
  name: "Yevhenii Stavytskyi",
  address: "Muhu tn 10, Tallinn, Estonia",
} as const;

/**
 * Отказ от права на отзыв (решение владельца 2026-09-26: вариант A —
 * возврата после оплаты нет, кроме неисправного файла).
 *
 * По праву ЕС у покупателя цифрового товара 14 дней на отказ от покупки.
 * Теряет он это право, только если ЯВНО согласился на немедленную выдачу
 * И подтвердил, что понимает потерю права. Отсюда две части одной фразы
 * — выкинуть любую значит остаться без отказа вовсе.
 *
 * ⚠️ Поменял текст — подними WAIVER_VERSION. Версия уходит в метаданные
 * сессии Stripe вместе с согласием: в споре важно, НА КАКОЙ текст
 * человек поставил галочку, а текст на сайте к тому моменту может быть
 * уже другим.
 */
export const WAIVER_TEXT =
  "I want my download straight away, and I understand that once it’s available I lose my 14-day right to cancel this purchase.";

export const WAIVER_VERSION = "2026-09-26";

/** Коротко — под кнопкой оплаты на стороне Stripe (custom_text.submit). */
export const WAIVER_STRIPE_NOTE =
  "You agreed to immediate delivery of digital content and to losing your 14-day right to cancel. Refunds are given only for files that are broken or not as described.";
