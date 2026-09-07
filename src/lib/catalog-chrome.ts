// Внешний вид панели каталога — классы, общие для интерактивной версии и
// её серверного близнеца.
//
// ⚠️ ЗАЧЕМ ДВЕ ВЕРСИИ ОДНОЙ ПАНЕЛИ. `/marketplace` собирается статически,
// а `CategoryFilter` и `MarketplaceCatalog` клиентские и читают адрес
// (`useSearchParams`). Такое поддерево Next при сборке на сервере не
// рендерит вовсе — в HTML на его месте пусто. До 2026-09-07 у
// `<Suspense>` вокруг них не было `fallback`, и пустота имела высоту
// НОЛЬ: сервер отдавал шапку, сразу под ней баннер заказа, а каталог
// появлялся уже в браузере и сдвигал баннер на пол-экрана. Замерено на
// живом сайте: **CLS 0.452** при пороге 0.1.
//
// Лечится это тем, что `fallback` **рендерится на сервере**: если внутри
// него нарисовать ту же панель и те же ряды подборок, HTML станет полным,
// а клиент нарисует поверх ровно то же самое.
//
// ⚠️ ПОЭТОМУ КЛАССЫ ЖИВУТ ЗДЕСЬ, А НЕ В ДВУХ ФАЙЛАХ. Разъехавшись даже на
// пару пикселей, две версии дадут ровно тот сдвиг, ради устранения
// которого всё и затевалось. Это тот же случай, что с семью копиями
// свечения и семью форматами даты, только цена ошибки видна прибором.
//
// Разное у них ТОЛЬКО поведение: серверная версия — ссылки и неподвижная
// рамка поиска, клиентская — кнопки, состояние и попап.

/** Пилюля категории. Цвет добавляется отдельно, из TOGGLE_PILL_COLORS. */
export const CATALOG_PILL =
  "cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors";

/** Ряд пилюль. */
export const CATALOG_PILL_ROW = "flex flex-wrap items-center gap-2";

/** Внешняя обёртка панели: отступ сверху и раскладка «поиск ↔ пилюли». */
export const CATALOG_BAR_OUTER = "mt-8";
export const CATALOG_BAR_ROW =
  "flex flex-col gap-3 sm:flex-row-reverse sm:items-start sm:justify-between sm:gap-6";

/** Поиск и кнопка фильтров стоят одной группой. */
export const CATALOG_SEARCH_GROUP = "flex w-full items-start gap-2 sm:w-auto";

/** Форма поиска. */
export const CATALOG_SEARCH_FORM = "relative w-full sm:max-w-xs";

/**
 * Само поле ввода.
 *
 * ⚠️ Высота здесь задаётся `py-2.5` + `text-sm`, и менять её можно только
 * вместе с кнопкой фильтров ниже: они стоят в одной строке, и разъехавшись
 * по высоте, поднимут всю панель.
 */
export const CATALOG_SEARCH_INPUT =
  "w-full rounded-full border border-zinc-950/[0.08] bg-transparent py-2.5 pl-10 pr-9 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden";

/**
 * Кнопка «Filters».
 *
 * ⚠️ `h-[42px]` не случайно и не «на глаз»: это ровно высота поля поиска
 * (py-2.5 сверху и снизу + строка text-sm + рамка). Числом, а не
 * `items-stretch`, потому что кнопка живёт в своей обёртке с попапом.
 */
export const CATALOG_FILTER_BUTTON =
  "relative flex h-[42px] cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors";
