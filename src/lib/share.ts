import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// Карточка ссылки в Discord (и Telegram, X, Slack) — «пост», который
// появляется, когда владелец кидает адрес работы в канал.
//
// Карточку рисует НЕ наш код, а бот Discord: он сам открывает ссылку,
// читает <meta> в серверном HTML и строит из них превью. Отсюда главное
// правило — всё, что должно попасть в карточку, обязано быть в серверном
// HTML. Дорисованное в браузере бот не увидит никогда.
//
// Из чего собирается карточка и откуда каждая часть:
//   строка автора сверху   — oEmbed (author_name), файл /oembed/<kind>
//   цветная полоса слева   — <meta name="theme-color">, export viewport
//   название               — og:title
//   текст с хэштегами      — og:description (НЕ meta description: тот
//                            для поисковика, хэштеги в выдаче — мусор)
//   картинки               — og:image, до четырёх
//
// ⚠️ Discord запоминает карточку ссылки. Поправили страницу — старая
// ссылка в канале останется прежней; новая карточка будет у адреса с
// хвостом (…?v=2).
//
// Зачем общий помощник: до 04.10 каждая страница собирала openGraph сама,
// и Next ЗАМЕНЯЕТ объект openGraph страницы целиком, а не сливает с
// корневым — поэтому siteName, заданный в layout, на работах и постах
// молча пропадал. Здесь он стоит один раз на все карточки.

/** Цвет полосы слева у карточки — брендовый оранжевый (orange-500). */
export const SHARE_COLOR = "#f97316";

/** Сколько картинок отдаём. Больше четырёх Discord в сетку не кладёт. */
const MAX_IMAGES = 4;

/**
 * Виды карточек. У каждого свой файл oEmbed — свой текст строки автора.
 * Ключи участвуют в адресе /oembed/<kind>, поэтому только латиница.
 */
export const SHARE_KINDS = {
  portfolio: "Portfolio",
  updates: "What's new",
} as const;

export type ShareKind = keyof typeof SHARE_KINDS;

/**
 * Тело oEmbed: строка автора над карточкой. Одна функция на оба
 * обработчика (/oembed/<kind> и /oembed/<kind>/<slug>), чтобы поля не
 * разъехались. `date` — уже напечатанная дата, её дописывают только
 * посты: у работ настоящей даты нет (created_at — день переноса в базу,
 * у всех один), и показывать её было бы неправдой.
 *
 * Времени нет намеренно: подвал «X • дата время» Discord рисует только
 * своим интеграциям, а у поста и хранится один день (решение владельца
 * 04.10 — «пофиг на время»).
 */
export function oembedBody(kind: ShareKind, date?: string) {
  const author = ["SouCampus", SHARE_KINDS[kind], date].filter(Boolean).join(" · ");
  return {
    version: "1.0",
    type: "link",
    author_name: author,
    author_url: SITE_URL,
    provider_name: SITE_NAME,
    provider_url: SITE_URL,
  };
}

/** Хэштеги одной строкой. Пробелы и знаки из тега выбрасываются. */
export function hashtags(tags: string[]): string {
  return tags
    .map((tag) => tag.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean)
    .map((tag) => `#${tag}`)
    .join(" ");
}

type ShareInput = {
  kind: ShareKind;
  /** Путь страницы от корня — «/portfolio/pirate-rpg». */
  path: string;
  title: string;
  /** Текст карточки; хэштеги допишутся отдельной строкой. */
  text: string;
  tags: string[];
  /** Пути картинок, первая — главная. Лишние и повторы отсекаются. */
  images: string[];
  imageAlt: string;
  publishedTime?: string;
  /**
   * Свой файл oEmbed у страницы (/oembed/<kind>/<slug>) — когда в строке
   * автора есть что-то своё, например дата поста. Без него — общий файл
   * вида.
   */
  oembedSlug?: string;
};

/**
 * openGraph, twitter и alternates для страницы-«поста». canonical сюда
 * входит потому, что alternates — тоже один объект: ссылка на oEmbed и
 * canonical обязаны лежать в нём вместе, иначе одна затрёт другую.
 */
export function shareMetadata(input: ShareInput): Pick<
  Metadata,
  "openGraph" | "twitter" | "alternates"
> {
  const description = `${input.text}\n\n${hashtags(input.tags)}`;
  const images = [...new Set(input.images)].slice(0, MAX_IMAGES);

  return {
    alternates: {
      canonical: input.path,
      // <link rel="alternate" type="application/json+oembed"> — по нему
      // Discord находит строку автора. Адрес абсолютный через metadataBase.
      types: {
        "application/json+oembed": input.oembedSlug
          ? `/oembed/${input.kind}/${input.oembedSlug}`
          : `/oembed/${input.kind}`,
      },
    },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      locale: "en_US",
      title: input.title,
      description,
      url: input.path,
      publishedTime: input.publishedTime,
      images: images.map((url) => ({ url, alt: input.imageAlt })),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      images: images.slice(0, 1),
    },
  };
}
