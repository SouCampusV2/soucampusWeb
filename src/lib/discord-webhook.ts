// Один запрос к вебхуку Discord на всех (2026-11-03).
//
// Объявления (discord-announce.ts) и посты витрины (discord-showcase.ts)
// писались в разные часы 26–27.10 и каждый завёл свой fetch на вебхук —
// одинаковый до буквы, вместе со строкой ошибки «Discord answered …».
// Отчёт 02.11 нашёл копию. Сегодня она ничего не ломает, но следующая
// правка формата ошибки попала бы в один файл и забыла бы второй.
//
// Здесь только транспорт: адрес с параметрами, метод, JSON, текст отказа.
// Что отправлять и как читать ответ — дело вызывающего: у объявления это
// «ушло или нет», у поста — id сообщения для правки и удаления.

/** Дописать параметры к адресу вебхука — он может уже нести свой `?thread_id=`. */
export function withParams(url: string, params: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}${params}`;
}

export function callWebhook(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
  fetchFn: typeof fetch = fetch
): Promise<Response> {
  return fetchFn(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** Текст отказа для админки: код и начало ответа Discord, без простыни. */
export async function webhookError(res: Response): Promise<string> {
  return `Discord answered ${res.status}: ${(await res.text()).slice(0, 300)}`;
}
