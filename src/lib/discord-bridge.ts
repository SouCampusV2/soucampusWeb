import { createHmac, timingSafeEqual } from "node:crypto";
import { checkImageBytes, checkImageContentType, IMAGE_MAX_BYTES } from "@/lib/upload-limits";

// Мост от Discord-бота BoCampus (его репозиторий: docs/PHASE4.md).
//
// Бот шлёт POST /api/discord/bridge с подписью, как Stripe шлёт вебхук:
// общий секрет DISCORD_BRIDGE_SECRET, HMAC-SHA256 от "<timestamp>.<сырое
// тело>", hex в заголовке x-bocampus-signature, время — в
// x-bocampus-timestamp (unix-секунды).
//
// ⚠️ Формат подписи должен совпадать с ботом байт в байт. Его держит
// общий тестовый вектор: discord-bridge.test.ts здесь и
// tests/siteBridge.test.js у бота. Поменял схему с одной стороны —
// красный тест на другой.

/** Сколько секунд запрос считается свежим. Старше — повтор чужого запроса. */
export const BRIDGE_MAX_SKEW_SECONDS = 5 * 60;

export function signBridgeBody(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

/**
 * null — подпись верна и свежая; строка — причина отказа (в лог, не наружу).
 * Сравнение — timingSafeEqual: по времени ответа нельзя подбирать подпись
 * по символу.
 */
export function verifyBridgeSignature(
  secret: string,
  timestamp: string | null,
  signature: string | null,
  body: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): string | null {
  if (!secret) return "secret not configured";
  if (!timestamp || !signature) return "missing headers";
  const ts = Number(timestamp);
  if (!Number.isInteger(ts) || Math.abs(nowSeconds - ts) > BRIDGE_MAX_SKEW_SECONDS) return "stale timestamp";
  const expected = Buffer.from(signBridgeBody(secret, timestamp, body), "hex");
  const given = Buffer.from(signature, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return "bad signature";
  return null;
}

export type BridgeKind = "portfolio_draft" | "review";

export type PortfolioDraft = {
  ticketId: string;
  need: string;
  theme: string;
  version: string;
  sizeLabel: string;
  sizeX: number | null;
  sizeZ: number | null;
  priceAmount: number | null;
  priceLabel: string;
  deadlineDays: number | null;
  completedAt: number | null;
  images: string[];
};

export type ReviewFromDiscord = {
  ticketId: string;
  rating: number;
  comment: string;
  name: string;
};

const MAX_TEXT = 4000;
const MAX_IMAGES = 8;
const str = (v: unknown, max = MAX_TEXT) => typeof v === "string" && v.length <= max;
const numOrNull = (v: unknown) => v === null || (typeof v === "number" && Number.isFinite(v));

/** null — тело годится; строка — что не так. Проверяем всё: секрет может утечь. */
export function checkBridgeBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return "body must be an object";
  const { key, kind, payload } = body as { key?: unknown; kind?: unknown; payload?: unknown };
  if (!str(key, 100) || !/^(portfolio|review):[a-z0-9]{6,32}$/.test(key as string)) return "bad key";
  if (kind !== "portfolio_draft" && kind !== "review") return "bad kind";
  if (!payload || typeof payload !== "object") return "bad payload";
  const p = payload as Record<string, unknown>;

  // ticketId едет в путь Storage (discord/<ticketId>/0.png) — значит,
  // только [a-z0-9] и ровно хвост ключа. Иначе «../» в ticketId положил
  // бы фото мимо своей папки, а два разных ticketId под одним ключом
  // сделали бы ключ идемпотентности враньём. Дописано при переносе на
  // сайт 26.10; формат подписи это не меняет.
  const keyTail = (key as string).split(":")[1];
  if (p.ticketId !== keyTail) return "ticketId must match the key";
  if ((kind === "review") !== (key as string).startsWith("review:")) return "kind must match the key";

  if (kind === "review") {
    if (!str(p.ticketId, 32) || !str(p.comment) || !str(p.name, 100)) return "bad review fields";
    if (typeof p.rating !== "number" || !Number.isInteger(p.rating) || p.rating < 1 || p.rating > 5) return "bad rating";
    return null;
  }

  for (const f of ["ticketId", "need", "theme", "version", "sizeLabel", "priceLabel"]) {
    if (!str(p[f])) return `bad ${f}`;
  }
  for (const f of ["sizeX", "sizeZ", "priceAmount", "deadlineDays", "completedAt"]) {
    if (!numOrNull(p[f])) return `bad ${f}`;
  }
  if (!Array.isArray(p.images) || p.images.length > MAX_IMAGES || !p.images.every((u) => isDiscordCdnUrl(u))) {
    return "bad images";
  }
  return null;
}

/**
 * Скачивать будем только с CDN Discord и только по https. Иначе обработчик,
 * которому прислали «картинку», стал бы ходить по любому адресу из нашей
 * сети (SSRF) — вплоть до внутренних адресов Vercel.
 */
export function isDiscordCdnUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["cdn.discordapp.com", "media.discordapp.net"].includes(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Скачать фото из Discord с потолком размера и проверить, что это картинка
 * (байты И тип — те же проверки, что у загрузки из админки).
 * Возвращает байты и расширение или причину отказа.
 */
export async function fetchDiscordImage(
  url: string,
  fetchFn: typeof fetch = fetch
): Promise<{ bytes: Uint8Array; ext: string; contentType: string } | { error: string }> {
  if (!isDiscordCdnUrl(url)) return { error: "not a Discord CDN url" };
  const res = await fetchFn(url, { redirect: "error" });
  if (!res.ok || !res.body) return { error: `HTTP ${res.status}` };
  const contentType = res.headers.get("content-type");
  const typeProblem = checkImageContentType(contentType);
  if (typeProblem) return { error: typeProblem };

  // Читаем потоком и обрываем на потолке: content-length может врать.
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > IMAGE_MAX_BYTES) {
      await reader.cancel();
      return { error: "image too large" };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  const problem = checkImageBytes(bytes.slice(0, 16), size, "discord-image");
  if (problem) return { error: problem };
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" }[
    (contentType ?? "").split(";")[0].trim().toLowerCase()
  ] ?? "png";
  return { bytes, ext, contentType: (contentType ?? "").split(";")[0].trim() };
}
