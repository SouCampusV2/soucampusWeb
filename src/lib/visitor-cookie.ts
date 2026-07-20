import { createHmac, randomUUID, timingSafeEqual } from "crypto";

// Идентификатор посетителя приходит из cookie, то есть ИЗ БРАУЗЕРА —
// значит его можно выдумать. Пока значение было просто UUID, любой мог
// прислать произвольный id, и сервер считал его "уже знакомым
// посетителем", а такие не проходят проверку лимита с одного адреса.
// То есть защиту от накрутки обходила одна строка в curl.
//
// Поэтому cookie подписывается: "<uuid>.<подпись>". Подпись — HMAC от
// uuid на секрете, который есть только у сервера. Подобрать её нельзя,
// а подделанная не пройдёт проверку — и такой посетитель снова считается
// новым, со всеми ограничениями.
//
// Это НЕ защита персональных данных (в id и нет ничего личного), а
// защита целостности: гарантия, что id выдал наш сервер.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sign(id: string, secret: string) {
  return createHmac("sha256", secret).update(id).digest("base64url");
}

/** Новый идентификатор + готовое значение cookie с подписью. */
export function issueVisitorId(secret: string) {
  const id = randomUUID();
  return { id, cookieValue: `${id}.${sign(id, secret)}` };
}

/**
 * Возвращает id, если cookie подписана нашим секретом, иначе null.
 * null означает "относиться как к новому посетителю" — и для пустой
 * cookie, и для испорченной, и для подделанной. Вызывающему коду
 * различать эти случаи незачем.
 */
export function readVisitorId(
  cookieValue: string | undefined,
  secret: string
): string | null {
  if (!cookieValue) return null;

  // lastIndexOf, а не split: в подписи base64url точки не встречаются,
  // но так разбор не сломается, даже если однажды формат изменится.
  const dot = cookieValue.lastIndexOf(".");
  if (dot <= 0) return null;

  const id = cookieValue.slice(0, dot);
  const signature = cookieValue.slice(dot + 1);
  if (!UUID_RE.test(id)) return null;

  const expected = sign(id, secret);
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);

  // Разная длина — timingSafeEqual бросит исключение, поэтому сначала
  // сравниваем размеры. Само сравнение — постоянного времени: обычное
  // === выходит на первом несовпавшем символе, и по времени ответа
  // подпись можно подбирать посимвольно.
  if (given.length !== want.length) return null;
  return timingSafeEqual(given, want) ? id : null;
}
