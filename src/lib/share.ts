import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

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
      types: { "application/json+oembed": `/oembed/${input.kind}` },
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
