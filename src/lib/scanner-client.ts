// Вызов сервиса soucampus-scanner (Java + ClamAV на VPS, 2026-11-01).
// Серверный модуль: секрет сервиса в браузер попасть не должен.
//
// Пока SCANNER_URL не задан, сервиса нет и ответ "skipped": остаются проверки
// самого сайта (map-scan.ts, image-clean.ts). Как только адрес задан, правило
// другое: ЛЮБОЙ сбой — это отказ, а не пропуск. Иначе упавший сервис молча
// открывал бы дверь, и выглядело бы это как работающая проверка.
//
// docs/SCANNER.md

export type ScanKind = "map" | "image";

export type ScanOutcome =
  | { verdict: "skipped" | "clean" }
  /** Файл негоден: удалить и объяснить человеку. */
  | { verdict: "rejected" | "infected"; reason: string }
  /** Проверить не удалось: файл остаётся непроверенным, человек повторит. */
  | { verdict: "error"; reason: string };

const UNAVAILABLE = "The file check is temporarily unavailable. Try again in a minute.";

// Функция Vercel живёт до 300 с, большой архив clamd разбирает десятки секунд.
const TIMEOUT_MS = 150_000;

/**
 * Спросить сервис про объект. signedUrl — короткоживущая ссылка на чтение:
 * сервис скачивает файл сам, потому что тело запроса к нему ходит через нас,
 * а файл до 15 МБ через функцию Vercel прогонять незачем.
 */
export async function scanWithService(
  signedUrl: string,
  kind: ScanKind,
  fileName: string,
  fetchFn: typeof fetch = fetch
): Promise<ScanOutcome> {
  const base = process.env.SCANNER_URL;
  if (!base) return { verdict: "skipped" };

  const secret = process.env.SCANNER_SECRET;
  if (!secret) {
    console.error("Сканер: SCANNER_URL задан, а SCANNER_SECRET нет");
    return { verdict: "error", reason: UNAVAILABLE };
  }

  try {
    const response = await fetchFn(`${base.replace(/\/+$/, "")}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Scanner-Secret": secret },
      body: JSON.stringify({ url: signedUrl, kind, fileName }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "error",
    });
    if (!response.ok) {
      console.error("Сканер ответил статусом:", response.status);
      return { verdict: "error", reason: UNAVAILABLE };
    }
    const body = (await response.json()) as { verdict?: unknown; reason?: unknown };
    const reason = typeof body.reason === "string" ? body.reason : UNAVAILABLE;

    if (body.verdict === "clean") return { verdict: "clean" };
    if (body.verdict === "rejected" || body.verdict === "infected") {
      return { verdict: body.verdict, reason };
    }
    if (body.verdict !== "error") console.error("Сканер: непонятный ответ:", body.verdict);
    return { verdict: "error", reason };
  } catch (err) {
    console.error("Сканер недоступен:", err instanceof Error ? err.message : err);
    return { verdict: "error", reason: UNAVAILABLE };
  }
}
