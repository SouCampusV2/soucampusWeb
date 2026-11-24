import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkStoredFile, scanWithService, type ScanOutcome } from "./scanner-client";

const URL = "https://abc.supabase.co/storage/v1/object/sign/x?token=t";

const answer = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("scanWithService", () => {
  beforeEach(() => {
    vi.stubEnv("SCANNER_URL", "https://scanner.example.com/");
    vi.stubEnv("SCANNER_SECRET", "secret");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("без адреса сервиса проверка пропущена и в сеть не идёт", async () => {
    vi.stubEnv("SCANNER_URL", "");
    const fetchFn = answer(200, { verdict: "clean" });
    expect(await scanWithService(URL, "map", "a.zip", fetchFn)).toEqual({ verdict: "skipped" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("шлёт секрет и что проверять", async () => {
    const fetchFn = answer(200, { verdict: "clean" });
    expect(await scanWithService(URL, "map", "a.zip", fetchFn)).toEqual({ verdict: "clean" });
    const [target, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(target).toBe("https://scanner.example.com/scan");
    expect(init.headers["X-Scanner-Secret"]).toBe("secret");
    expect(JSON.parse(init.body)).toEqual({ url: URL, kind: "map", fileName: "a.zip" });
  });

  it("передаёт причину отказа и находки", async () => {
    expect(await scanWithService(URL, "map", "a", answer(200, { verdict: "rejected", reason: "exe" }))).toEqual({
      verdict: "rejected",
      reason: "exe",
    });
    expect((await scanWithService(URL, "image", "a", answer(200, { verdict: "infected", reason: "bad" }))).verdict).toBe(
      "infected"
    );
  });

  // Главное свойство: ни один сбой не превращается в «чисто».
  it.each([
    ["ответ error", answer(200, { verdict: "error", reason: "later" })],
    ["статус 500", answer(500, {})],
    ["статус 401", answer(401, {})],
    ["непонятный вердикт", answer(200, { verdict: "OK" })],
    ["ответ без вердикта", answer(200, {})],
    ["не JSON", vi.fn(async () => new Response("<html>")) as unknown as typeof fetch],
    ["обрыв сети", vi.fn(async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch],
  ])("%s — отказ, а не пропуск", async (_name, fetchFn) => {
    expect((await scanWithService(URL, "map", "a.zip", fetchFn)).verdict).toBe("error");
  });

  it("адрес без секрета — отказ, а не запрос без секрета", async () => {
    vi.stubEnv("SCANNER_SECRET", "");
    const fetchFn = answer(200, { verdict: "clean" });
    expect((await scanWithService(URL, "map", "a.zip", fetchFn)).verdict).toBe("error");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

// Общий шаг карт и картинок (17.11). Сам сервис подменён: здесь проверяется
// только то, во что роут превращает вердикт.
describe("checkStoredFile", () => {
  const storage = (signedUrl: string | null) => ({
    createSignedUrl: async () => ({ data: signedUrl ? { signedUrl } : null }),
  });
  const verdict = (outcome: ScanOutcome) => async () => outcome;

  it("чистый или пропущенный файл — ok", async () => {
    expect(await checkStoredFile(storage("u"), "p", "map", verdict({ verdict: "clean" }))).toEqual({ ok: true });
    expect(await checkStoredFile(storage("u"), "p", "image", verdict({ verdict: "skipped" }))).toEqual({ ok: true });
  });

  it("негодный и заражённый — причина для reject(), заражённый помечен", async () => {
    expect(await checkStoredFile(storage("u"), "p", "map", verdict({ verdict: "rejected", reason: "exe" }))).toEqual({
      ok: false,
      problem: "exe",
      infected: false,
    });
    expect(await checkStoredFile(storage("u"), "p", "image", verdict({ verdict: "infected", reason: "virus" }))).toEqual({
      ok: false,
      problem: "virus",
      infected: true,
    });
  });

  it("сервис недоступен — 503, ссылка не подписалась — 500", async () => {
    expect(await checkStoredFile(storage("u"), "p", "map", verdict({ verdict: "error", reason: "down" }))).toEqual({
      ok: false,
      unavailable: "down",
      status: 503,
    });
    expect(await checkStoredFile(storage(null), "p", "map", verdict({ verdict: "clean" }))).toEqual({
      ok: false,
      unavailable: "upload unavailable",
      status: 500,
    });
  });
});
