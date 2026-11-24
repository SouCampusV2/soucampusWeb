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

/** Хранилище, у которого можно подписать ссылку на чтение (Supabase Storage). */
export type SignableStorage = {
  createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null }>;
};

export type StoredFileCheck =
  /**
   * scanned — прошёл ли файл антивирус на самом деле. false, когда сервис
   * не подключён (нет SCANNER_URL): файл годен по проверкам сайта, но
   * «✓ Checked for viruses» про него сказать нельзя (24.11).
   */
  | { ok: true; scanned: boolean }
  /** Файл негоден — роут удаляет его своим reject() и показывает причину. */
  | { ok: false; problem: string; infected: boolean }
  /** Проверить не вышло — ответ 500/503, файл остаётся непроверенным. */
  | { ok: false; unavailable: string; status: 500 | 503 };

/**
 * Один шаг «подписать ссылку → спросить сервис → разобрать вердикт» для карт
 * и картинок (17.11, владелец: «пускай это будет одна проверка»). До этого
 * оба роута, /api/creator/upload и /api/creator/image, держали по копии этих
 * строк — отчёты 09.11 и 16.11 дважды находили дублирование. Сервис и так
 * один (soucampus-scanner), теперь и путь к нему с сайта один. У роутов
 * остаётся только своё: уборка в reject() и текст в журнале.
 */
export async function checkStoredFile(
  storage: SignableStorage,
  path: string,
  kind: ScanKind,
  scan: typeof scanWithService = scanWithService
): Promise<StoredFileCheck> {
  // Ссылка живёт три минуты: сервис скачивает файл сам.
  const { data: signed } = await storage.createSignedUrl(path, 180);
  if (!signed?.signedUrl) return { ok: false, unavailable: "upload unavailable", status: 500 };

  const result = await scan(signed.signedUrl, kind, path);
  if (result.verdict === "rejected" || result.verdict === "infected") {
    return { ok: false, problem: result.reason, infected: result.verdict === "infected" };
  }
  if (result.verdict === "error") return { ok: false, unavailable: result.reason, status: 503 };
  return { ok: true, scanned: result.verdict === "clean" };
}
