import type { EditableSpecs, ProductCategory, ProductState } from "@/lib/products";
import { SHOP_CATEGORIES } from "@/lib/products";

// ============================================================
// Форма того, что браузер присылает шлюзу записи карты, и правила, по
// которым это принимается. Шлюз записи, путь №2 (2026-09-13).
//
// ПОЧЕМУ ОТДЕЛЬНЫЙ МОДУЛЬ. Здесь встречаются две стороны: формы
// (клиентские компоненты) и обработчик /api/creator/map (сервер со
// служебным ключом). Тот же приём, что notification-shape.ts и
// comment-shape.ts: общая ФОРМА данных живёт там, куда можно смотреть с
// обеих сторон, и клиент не тянет за собой ничего серверного.
//
// ⚠️ EditableSpecs/EMPTY_SPECS/specsToColumns заодно переехали из
// SpecFields.tsx в products.ts. Тот помечен "use client", и обработчик,
// импортируя из него чистую функцию, тащил бы за ней клиентскую границу
// — а место характеристик и так рядом с остальной формой карты.
// ============================================================

/**
 * То, что форма присылает шлюзу. Ни состояния, ни автора, ни slug здесь
 * нет намеренно: их назначает сервер. Клиент называет СОДЕРЖИМОЕ — ровно
 * то же разделение, что в пути №1, где путь в бакете строил сервер.
 */
export type MapSubmission = {
  title: string;
  summary: string;
  /** HTML из Tiptap — санитизируется при показе (sanitize.ts), не здесь. */
  description: string;
  /** Обложка — выбранная автором картинка галереи. */
  coverUrl: string;
  /** Остальные картинки, по порядку. */
  galleryUrls: string[];
  priceCents: number;
  category: ProductCategory;
  /**
   * Путь файла карты в бакете product-files. При правке null означает
   * «файл не меняли»; при создании обязателен.
   */
  filePath: string | null;
  specs: EditableSpecs;
  reactionOptionId: string | null;
};

// ------------------------------------------------------------
// Потолки.
//
// ⚠️ Числа НЕ равны тем, что в базе (products_text_len), и это осознанно
// — то же разделение, что описано в самой миграции 20260820140000: база
// про «не клади мегабайт», обработчик про «это похоже на карту».
// Поставить их вплотную значит получить непонятную ошибку сохранения при
// первом же послаблении в интерфейсе.
// ------------------------------------------------------------
export const TITLE_MAX = 120;
export const SUMMARY_MAX = 300;
export const DESCRIPTION_MAX = 200_000;
/** Картинок всего (обложка + галерея) — столько же, сколько берёт GalleryPicker. */
export const GALLERY_MAX = 15;
/**
 * Потолок цены — €1000. Решение о продукте, а не о схеме, поэтому живёт
 * в коде: поднять — деплой, а не миграция (тот же раздел обязанностей,
 * что у чисел в rate-limit.ts). Нужен он не от злоумышленника —
 * переплата никому не вредит, — а от опечатки: «2500» вместо «25.00»
 * уходит на витрину ценой в две с половиной тысячи евро.
 */
export const PRICE_MAX_CENTS = 100_000;

const CATEGORY_SLUGS = new Set<string>(SHOP_CATEGORIES.map((c) => c.slug));

/**
 * Наша ли это картинка.
 *
 * Два разрешённых вида, и оба наши:
 *   - публичная ссылка бакета product-images;
 *   - свой же статический файл («/portfolio/…») — на таких стоит
 *     засеянный каталог, и правка такой карты не должна ломаться.
 *
 * ⚠️ Чужой хост запрещён не из аккуратности. Обложку показывает витрина
 * ВСЕМ посетителям, то есть браузер каждого сам сходит по этому адресу:
 * имея право положить туда что угодно, автор собирал бы IP всех, кто
 * открыл магазин. Это тот же вопрос, что пункт 11 приоритетов (img в
 * описании), просто здесь он закрывается заодно — картинки товара
 * пишутся через шлюз, а описание пока нет.
 */
export function isOwnImageUrl(url: string, supabaseUrl: string): boolean {
  if (typeof url !== "string" || url.length === 0 || url.length > 2048) return false;
  // Свой статический файл. «//evil.com» сюда НЕ попадает: это
  // протокол-относительный адрес, ведущий наружу — ровно та ловушка,
  // которую ловит safeHref в уведомлениях.
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  if (!supabaseUrl) return false;
  const base = supabaseUrl.replace(/\/+$/, "");
  return url.startsWith(`${base}/storage/v1/object/public/product-images/`);
}

function badText(value: unknown, max: number): boolean {
  return typeof value !== "string" || value.trim().length === 0 || value.length > max;
}

/**
 * Проверка присланного — чистая функция, поэтому под тестами.
 *
 * Возвращает текст для ЧЕЛОВЕКА или null, если всё в порядке. Текст
 * человеческий, а не машинный, по той же причине, что в пути №1: на
 * другом конце автор, а не отладчик, и «bad request» он читает как
 * поломку сайта.
 */
export function checkMapSubmission(
  input: MapSubmission,
  supabaseUrl: string
): string | null {
  if (badText(input.title, TITLE_MAX)) {
    return `Give the map a title, up to ${TITLE_MAX} characters.`;
  }
  if (badText(input.summary, SUMMARY_MAX)) {
    return `Write a short summary, up to ${SUMMARY_MAX} characters.`;
  }
  if (badText(input.description, DESCRIPTION_MAX)) {
    return "Write a description.";
  }
  // «free» — не категория, а цена 0 (см. filterByCategory в products.ts).
  // Пришла она сюда — значит запрос собран мимо формы.
  if (!CATEGORY_SLUGS.has(input.category) || input.category === "free") {
    return "Pick a category from the list.";
  }
  if (
    !Number.isInteger(input.priceCents) ||
    input.priceCents < 0 ||
    input.priceCents > PRICE_MAX_CENTS
  ) {
    return `Enter a price between €0 and €${PRICE_MAX_CENTS / 100}.`;
  }
  if (!Array.isArray(input.galleryUrls) || input.galleryUrls.length + 1 > GALLERY_MAX) {
    return `You can have up to ${GALLERY_MAX} images.`;
  }
  for (const url of [input.coverUrl, ...input.galleryUrls]) {
    if (!isOwnImageUrl(url, supabaseUrl)) {
      return "Images have to be uploaded here — links to other sites aren't accepted.";
    }
  }
  const specsProblem = checkSpecs(input.specs);
  if (specsProblem) return specsProblem;
  if (input.reactionOptionId !== null && typeof input.reactionOptionId !== "string") {
    return "Pick a reaction from the list, or none at all.";
  }
  return null;
}

/**
 * Характеристики.
 *
 * ⚠️ Значения со словарями product-specs.ts НЕ сверяются, и это то же
 * решение, что у фильтров витрины: словарь там про вкус и пополняется
 * без миграции, а выбросив «неизвестное» значение, мы сделали бы старую
 * карту ненаходимой её же характеристикой. Проверяем ОБЪЁМ — сколько
 * значений и какой длины, — то есть ровно то, чем стережёт база
 * (ограничение products_specs_len).
 */
function checkSpecs(specs: EditableSpecs): string | null {
  if (!specs || typeof specs !== "object") {
    return "Something's off with the map details.";
  }
  const lists: [unknown, number][] = [
    [specs.mcVersions, 40],
    [specs.mapTypes, 12],
    [specs.gameModes, 12],
    [specs.themes, 12],
    [specs.fileFormats, 8],
  ];
  for (const [list, max] of lists) {
    if (!Array.isArray(list) || list.length > max) {
      return "Too many map details picked.";
    }
    if (list.some((v) => typeof v !== "string" || v.length > 32)) {
      return "Something's off with the map details.";
    }
  }
  if (
    specs.mapSize !== null &&
    (typeof specs.mapSize !== "string" || specs.mapSize.length > 32)
  ) {
    return "Something's off with the map details.";
  }
  return null;
}

// ------------------------------------------------------------
// Машина состояний при правке автором.
// ------------------------------------------------------------

/** Что правка автора делает с состоянием карты. */
export type EditOutcome = {
  state: ProductState;
  submissionKind: "after_takedown" | "after_rejection" | "file_changed";
};

/**
 * Куда уезжает карта, когда её правит автор.
 *
 * ⚠️ ЭТО ПОВТОРЕНИЕ ТРИГГЕРА guard_product_author_edit, и повторение
 * СОЗНАТЕЛЬНОЕ — значит, о нём надо сказать вслух, а не сделать молча.
 *
 * Пока правка шла из браузера, решал триггер. Шлюз пишет служебным
 * ключом, а триггер первой строкой проверяет
 * `auth.role() = 'authenticated'` и для служебной роли возвращает new как
 * есть. Иначе и нельзя: под той же ролью ходит модерация, которая как раз
 * состояния и назначает, — а отличить «наш сервер от имени автора» от
 * «наш сервер от имени владельца» база не может. Различать их —
 * обязанность того, кто знает, какую кнопку нажали, то есть обработчика.
 *
 * Триггер при этом НЕ удаляется. Он остаётся вторым рубежом на случай
 * бага здесь или ещё не мигрировавшего пути — defense in depth, ровно
 * как записано в ARCHITECTURE.md § 5.4, шаг 5.
 *
 * null означает «состояние не трогаем»: обычная правка живой карты без
 * замены файла ничего не меняет.
 */
export function outcomeOfAuthorEdit(
  state: ProductState,
  fileChanged: boolean
): EditOutcome | null {
  if (state === "suspended") {
    return { state: "pending", submissionKind: "after_takedown" };
  }
  if (state === "rejected") {
    return { state: "pending", submissionKind: "after_rejection" };
  }
  // Без этого можно было бы провести безобидную карту через модерацию, а
  // потом подложить покупателям что угодно под нашим брендом.
  if (state === "live" && fileChanged) {
    return { state: "pending", submissionKind: "file_changed" };
  }
  return null;
}
