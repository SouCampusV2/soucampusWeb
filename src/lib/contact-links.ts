// Проверка того, что человек вписал в «Portfolio link» и «Discord».
//
// Поводом стали заявки, где в портфолио лежало что угодно, кроме ссылки,
// а в дискорде — произвольный набор символов. Разбирать такую заявку
// нечем: ни посмотреть работы, ни связаться, — а понять это можно только
// открыв её вручную и попробовав.
//
// Чистые функции без обращения к сети: мы проверяем ФОРМУ, а не то, что
// по адресу действительно что-то есть. Проверить второе можно только
// запросом, а запрос по адресу, который прислал незнакомый человек, — это
// наш сервер, ходящий куда велят (SSRF). Форма отсекает мусор, остальное
// решает модератор, который и так открывает ссылку глазами.

/** Схемы, которые вообще имеют смысл в поле «ссылка на работы». */
const ALLOWED_PROTOCOLS = ["http:", "https:"];

export type LinkCheck = { ok: true; value: string } | { ok: false; error: string };

/**
 * Ссылка на портфолио. Пустая строка — это «не указал», и она законна:
 * поле необязательное.
 *
 * Без схемы (`planetminecraft.com/member/soucampus`) — дописываем https://
 * сами. Требовать её от человека значит отклонять правильный ответ из-за
 * формальности: то, что он вставил из адресной строки, почти всегда
 * начинается со схемы, а то, что напечатал руками, — почти никогда.
 *
 * javascript: и data: не проходят по белому списку протоколов. Это не
 * теория: ссылка попадает в href на странице админки, и `javascript:…`
 * там выполнился бы по клику владельца, у которого прав больше всех.
 */
export function checkPortfolioUrl(raw: string): LinkCheck {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: "" };

  // Схему дописываем ТОЛЬКО когда её нет вовсе. Проверка на "://", а не
  // на "http", — иначе `javascript:alert(1)` получил бы приставку
  // https:// и превратился в безобидную с виду строку, пройдя проверку.
  const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, error: "That doesn't look like a link." };
  }

  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    return { ok: false, error: "Only http:// and https:// links, please." };
  }

  // Точка в имени хоста — грубая, но рабочая проверка «это домен, а не
  // слово». `https://мойпортфолио` разбирается как валидный URL с хостом
  // «мойпортфолио», и без этой проверки прошло бы любое одно слово.
  if (!url.hostname.includes(".") || url.hostname.endsWith(".")) {
    return { ok: false, error: "That doesn't look like a link." };
  }

  return { ok: true, value: url.toString() };
}

// Ник в Discord: 2–32 символа, строчные буквы, цифры, точка и
// подчёркивание. Старый формат с дискриминатором (`name#1234`) ещё
// встречается у тех, кто давно не заходил, — принимаем и его.
const DISCORD_USERNAME = /^[a-z0-9._]{2,32}$/;
const DISCORD_LEGACY = /^.{2,32}#\d{4}$/;

/**
 * Discord: ник или ссылка-приглашение. Пустое поле законно.
 *
 * Приводим к нижнему регистру: ники в Discord регистронезависимы, и
 * `SouCampus` с `soucampus` — один человек. Ведущую @ срезаем — её
 * дописывают по привычке из других сетей.
 */
export function checkDiscord(raw: string): LinkCheck {
  const trimmed = raw.trim().replace(/^@/, "");
  if (!trimmed) return { ok: true, value: "" };

  // Ссылку-приглашение на сервер тоже принимаем: у части билдеров
  // контакт — это их собственный сервер, а не личный ник.
  if (trimmed.includes("://") || trimmed.startsWith("discord.gg/")) {
    const link = checkPortfolioUrl(trimmed);
    if (!link.ok) return link;
    const host = new URL(link.value).hostname.replace(/^www\./, "");
    if (host !== "discord.gg" && host !== "discord.com") {
      return { ok: false, error: "That link isn't a Discord invite." };
    }
    return link;
  }

  if (DISCORD_LEGACY.test(trimmed)) return { ok: true, value: trimmed };

  const lowered = trimmed.toLowerCase();
  if (!DISCORD_USERNAME.test(lowered)) {
    return {
      ok: false,
      error:
        "A Discord username is 2–32 characters: letters, numbers, dots and underscores.",
    };
  }

  return { ok: true, value: lowered };
}
