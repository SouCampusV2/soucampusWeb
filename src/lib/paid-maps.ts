// Кто может ставить карте цену. Отдельный файл без зависимостей: правило
// читает и шлюз (/api/creator/map), и клиентская форма (PriceField).

/**
 * Платная цена — только у студии, пока у креаторов нет выплат (решение
 * владельца 24.11, в день живых платежей Stripe).
 *
 * Почему: Stripe Connect не включён, деньги за любую карту приходят на
 * счёт владельца. Чужая платная карта значила бы, что владелец продаёт
 * чужой товар и должен автору деньги, которые перевести нечем. Пока так —
 * креатор выставляет карту бесплатно, а платную версию продаёт на
 * BuiltByBit и ставит ссылку в описании (ссылки туда разрешены,
 * description-links.ts). Снимается вместе с выплатами авторам (IDEAS.md,
 * «Как принимать деньги и как платить авторам»).
 *
 * Отдельно от checkMapSubmission, потому что зависит не от карты, а от
 * того, КТО её сохраняет: шлюз знает is_admin, чистая проверка карты —
 * нет.
 */
export const FREE_ONLY_MESSAGE =
  "Paid maps aren't open to creators yet: payouts to authors aren't set up. Publish the map for free, or sell it on BuiltByBit and link it in the description.";

export function checkPriceRight(priceCents: number, isAdmin: boolean): string | null {
  return priceCents > 0 && !isAdmin ? FREE_ONLY_MESSAGE : null;
}
