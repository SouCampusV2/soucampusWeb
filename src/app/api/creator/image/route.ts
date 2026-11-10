import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/products";
import { getAdminUser } from "@/lib/admin";
import { cleanImage } from "@/lib/image-clean";
import { scanWithService } from "@/lib/scanner-client";
import {
  AVATARS_BUCKET,
  AVATAR_NAME,
  BANNER_NAME,
  PENDING_PREFIX,
  PORTFOLIO_IMAGES_BUCKET,
  IMAGE_EXTENSIONS,
  IMAGE_MAX_BYTES,
  HEAD_BYTES,
  checkImageBytes,
  checkImageContentType,
  formatBytes,
  safeExtension,
} from "@/lib/upload-limits";

// ============================================================
// Шлюз записи, пути №5 и №9: картинки в Storage (2026-09-21).
//
// Два последних бакета, в которые браузер писал напрямую:
//   product-images — обложка и картинки описания карты;
//   avatars        — аватар в профиле.
//
// Устроено ровно как путь №1 (файл карты, /api/creator/upload): sign
// выдаёт одноразовый токен на путь, который построил СЕРВЕР, confirm
// читает первые байты того, что легло. Разница только в проверке
// (checkImageBytes вместо checkMapBytes) и в том, что бакета два.
//
// ------------------------------------------------------------
// Почему это важно, хотя «это всего лишь картинки»
// ------------------------------------------------------------
// Обложку карты видит КАЖДЫЙ посетитель витрины, аватар — каждый
// читатель комментариев. До сегодня единственным запретом была политика
// бакета «первый сегмент пути = твой auth.uid()», то есть один факт:
// своя ли папка. Ни размера, ни типа файла она не знает и знать не
// может. Всё остальное — 5 МБ на картинку и проверка сигнатуры — жило в
// форме, то есть в браузере, то есть у загружающего.
//
// ------------------------------------------------------------
// ⚠️ Аватар грузится в ДВА шага, и не ради красоты
// ------------------------------------------------------------
// У аватара путь фиксированный (<user_id>/avatar) и запись идёт поверх
// старого файла: так мусор не копится. Это хорошо ровно до первого
// ОТКАЗА — негодный файл уже затёр прежний аватар, и удалить его значит
// оставить человека без картинки, а profiles.avatar_url — ссылкой в
// никуда.
//
// Поэтому байты сначала ложатся во временный путь и только пройдя
// проверку переезжают на место. Отказ не трогает то, что уже есть.
//
// Баннер профиля (2026-10-25) устроен ровно как аватар: тот же бакет,
// тот же временный путь, другое имя на месте — <user_id>/banner.
//
// Фото портфолио (2026-10-25) — как картинки карты, но в своём бакете
// portfolio-images и только у АДМИНА: портфолио — витрина студии, а не
// площадка, и писать в него больше некому.
//
// ------------------------------------------------------------
// ⚠️ С 2026-11-01 временный путь у ВСЕХ картинок
// ------------------------------------------------------------
// Раньше confirm мог просто не случиться: загрузил картинку и сразу вписал
// адрес в карту. Теперь на постоянное место файл кладёт только confirm, и
// кладёт не исходные байты, а собранные заново (lib/image-clean.ts). Ссылку
// на pending- не примут ни шлюз карты, ни описание, ни база (для профиля).
// ============================================================

export const dynamic = "force-dynamic";

type Action = "sign" | "confirm";
/**
 * product — картинки карты (обложка, галерея, описание);
 * avatar и banner — профиль, оба в бакете avatars;
 * portfolio — фото работ студии, только админ.
 */
type Kind = "product" | "avatar" | "banner" | "portfolio";
const KINDS: readonly Kind[] = ["product", "avatar", "banner", "portfolio"];

/** Файл профиля встаёт на постоянное имя; картинки карты — нет. */
function isProfileImage(kind: Kind): kind is "avatar" | "banner" {
  return kind === "avatar" || kind === "banner";
}

type Body = {
  action?: Action;
  kind?: Kind;
  fileName?: string;
  size?: number;
  path?: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const { action } = body;

  if (
    (action !== "sign" && action !== "confirm") ||
    !KINDS.includes(body.kind as Kind)
  ) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  // Проверено строкой выше; includes тип не сужает, поэтому явно.
  const kind = body.kind as Kind;

  // Право на картинки карты держит is_creator — то же, что на файл
  // карты и на строку товара. Аватар и баннер есть у любого вошедшего:
  // это его собственный профиль, и никаких прав картинка не даёт.
  // Портфолио — только админу. 404, а не 403: посторонний не должен по
  // разнице ответов узнать, что такой вид загрузки вообще есть.
  if (kind === "portfolio" && !(await getAdminUser())) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (kind === "product") {
    const { data: profile } = await getSupabaseAdmin()
      .from("profiles")
      .select("is_creator")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_creator) {
      return NextResponse.json(
        {
          error:
            "Your creator access is closed, so map images can't be uploaded from here. The reason is on your resources page.",
        },
        { status: 403 }
      );
    }
  }

  // Лимит — после прав и до работы. Считается выдача слота, а не
  // загрузка: confirm счёта не тратит, иначе одна честная картинка
  // списывала бы два.
  if (action === "sign") {
    const limited = await enforceRateLimit("image-upload", user.id);
    if (limited) return limited;
    return sign(user.id, kind, body);
  }

  // У confirm свой счёт — см. "upload-confirm" в rate-limit.ts.
  const confirmLimited = await enforceRateLimit("upload-confirm", user.id);
  if (confirmLimited) return confirmLimited;

  return confirm(user.id, kind, body);
}

/** Куда пишет этот вид загрузки. */
function bucketOf(kind: Kind): string {
  if (kind === "product") return PRODUCT_IMAGES_BUCKET;
  if (kind === "portfolio") return PORTFOLIO_IMAGES_BUCKET;
  return AVATARS_BUCKET;
}

// ------------------------------------------------------------
// sign — «можно, вот сюда»
// ------------------------------------------------------------
async function sign(
  userId: string,
  kind: Kind,
  body: Body
): Promise<NextResponse> {
  const fileName = typeof body.fileName === "string" ? body.fileName : "";
  const size = typeof body.size === "number" ? body.size : NaN;

  if (!fileName || !Number.isFinite(size) || size < 0) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Размер здесь ЗАЯВЛЕННЫЙ — его называет клиент, и доказывает он
  // ровно ничего. Проверяем, чтобы не заводить слот под заведомо
  // негодную загрузку; настоящий размер спросит confirm у Storage.
  if (size === 0) {
    return NextResponse.json({ error: "That image is empty." }, { status: 400 });
  }
  if (size > IMAGE_MAX_BYTES) {
    return NextResponse.json(
      {
        error: `Each image must be ${formatBytes(IMAGE_MAX_BYTES)} or smaller — yours is ${formatBytes(size)}.`,
      },
      { status: 400 }
    );
  }

  const ext = safeExtension(fileName, "jpg");
  if (!(IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
    return NextResponse.json(
      { error: "That isn't a PNG, JPEG, GIF or WebP image." },
      { status: 400 }
    );
  }

  // Путь строит СЕРВЕР — клиент называет только содержимое. Форма
  // прежняя (<user_id>/…): на первый сегмент смотрела снятая политика,
  // и по нему же перечисляет папки уборка Storage.
  //
  // Все картинки едут во ВРЕМЕННЫЙ путь: на постоянный их кладёт confirm,
  // уже перекодированными (см. шапку файла).
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${userId}/${PENDING_PREFIX}${stamp}.${ext}`;

  const { data, error } = await getSupabaseAdmin()
    .storage.from(bucketOf(kind))
    .createSignedUploadUrl(path);

  if (error || !data) {
    // Наружу тихо, внутрь громко: сообщения Storage рассказывают про
    // устройство бакетов и политик, а на другом конце любой креатор.
    console.error("Шлюз картинок: не выдался токен:", error?.message);
    return NextResponse.json({ error: "upload unavailable" }, { status: 500 });
  }

  return NextResponse.json({ path: data.path, token: data.token });
}

// ------------------------------------------------------------
// confirm — «что в итоге легло»
// ------------------------------------------------------------
async function confirm(
  userId: string,
  kind: Kind,
  body: Body
): Promise<NextResponse> {
  const path = typeof body.path === "string" ? body.path : "";
  const fileName = typeof body.fileName === "string" ? body.fileName : "";

  // Путь приходит от клиента. Без этой строки человек просил бы
  // проверить (а при отказе — УДАЛИТЬ) чужой объект, зная только ключ.
  // Только pending-: готовая картинка не может выдать себя за только что
  // загруженную, иначе отказ удалил бы то, что уже показано на сайте.
  if (!path.startsWith(`${userId}/${PENDING_PREFIX}`) || path.includes("..")) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const db = getSupabaseAdmin();
  const storage = db.storage.from(bucketOf(kind));

  const { data: info, error: infoError } = await storage.info(path);
  if (infoError || !info) {
    return NextResponse.json(
      { error: "The upload didn't arrive. Try attaching the image again." },
      { status: 404 }
    );
  }

  /** Отказ = объект не остаётся лежать. Сюда же придёт антивирус. */
  async function reject(reason: string): Promise<NextResponse> {
    const { error: removeError } = await storage.remove([path]);
    if (removeError) {
      console.error(
        "Шлюз картинок: отклонённый файл не удалился:",
        removeError.message
      );
    }
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  const size = typeof info.size === "number" ? info.size : 0;
  if (size === 0) return reject("That image is empty.");
  if (size > IMAGE_MAX_BYTES) {
    return reject(
      `Each image must be ${formatBytes(IMAGE_MAX_BYTES)} or smaller — yours is ${formatBytes(size)}.`
    );
  }

  const head = await readHead(db, bucketOf(kind), path, size);
  if (!head) {
    console.error("Шлюз картинок: не прочитались первые байты:", path);
    return NextResponse.json({ error: "upload unavailable" }, { status: 500 });
  }

  const problem = checkImageBytes(head, size, fileName || path);
  if (problem) return reject(problem);

  const typeProblem = checkImageContentType(info.contentType);
  if (typeProblem) return reject(typeProblem);

  // Антивирус: отдельный сервис (lib/scanner-client.ts). Пересборка ниже всё
  // равно уничтожит вложенное, но заражённый файл незачем принимать вовсе.
  const { data: signed } = await storage.createSignedUrl(path, 180);
  if (!signed?.signedUrl) {
    return NextResponse.json({ error: "upload unavailable" }, { status: 500 });
  }
  const scan = await scanWithService(signed.signedUrl, "image", path);
  if (scan.verdict === "rejected" || scan.verdict === "infected") {
    if (scan.verdict === "infected") console.warn("Шлюз картинок: антивирус нашёл файл у", userId);
    return reject(scan.reason);
  }
  if (scan.verdict === "error") {
    return NextResponse.json({ error: scan.reason }, { status: 503 });
  }

  // Собрать заново: хвосты и метаданные не переживут этот шаг. Не скачалось
  // или упало — отказ, а не пропуск: под pending- на файл сослаться нельзя.
  const { data: blob, error: downloadError } = await storage.download(path);
  if (downloadError || !blob) {
    console.error("Шлюз картинок: файл не скачался для проверки:", downloadError?.message);
    return NextResponse.json({ error: "upload unavailable" }, { status: 500 });
  }
  const clean = await cleanImage(new Uint8Array(await blob.arrayBuffer()));
  if (typeof clean === "string") return reject(clean);
  // Палитра и анимация могут вырасти при пересборке, а потолок бакета общий.
  if (clean.bytes.length > IMAGE_MAX_BYTES) {
    return reject(
      `Each image must be ${formatBytes(IMAGE_MAX_BYTES)} or smaller. Make this one a little smaller and try again.`
    );
  }

  // У аватара и баннера имя постоянное, запись поверх старого файла: отказов
  // дальше быть не может, так что остаться без картинки нечем. Остальным —
  // новое имя с настоящим расширением.
  const finalPath = isProfileImage(kind)
    ? `${userId}/${kind === "banner" ? BANNER_NAME : AVATAR_NAME}`
    : `${userId}/${path.slice(`${userId}/${PENDING_PREFIX}`.length).replace(/\.[^.]+$/, "")}.${clean.ext}`;

  const { error: writeError } = await storage.upload(finalPath, clean.bytes, {
    contentType: clean.contentType,
    upsert: true,
  });
  if (writeError) {
    console.error(`Шлюз картинок: ${kind} не записался:`, writeError.message);
    return NextResponse.json({ error: "upload unavailable" }, { status: 500 });
  }
  const { error: removeError } = await storage.remove([path]);
  if (removeError) {
    // Не роняем ответ: картинка уже на месте, а сироту подберёт уборка Storage.
    console.error("Шлюз картинок: временный файл не удалился:", removeError.message);
  }

  return NextResponse.json({ ok: true, path: finalPath, size: clean.bytes.length });
}

/**
 * Первые HEAD_BYTES байтов объекта — ranged-запросом по подписанной
 * ссылке. Не download(): тот тянет файл целиком ради двенадцати байтов.
 */
async function readHead(
  db: ReturnType<typeof getSupabaseAdmin>,
  bucket: string,
  path: string,
  size: number
): Promise<Uint8Array | null> {
  const { data, error } = await db.storage
    .from(bucket)
    .createSignedUrl(path, 60);
  if (error || !data?.signedUrl) return null;

  const last = Math.min(HEAD_BYTES, size) - 1;
  const response = await fetch(data.signedUrl, {
    headers: { Range: `bytes=0-${last}` },
  });
  // 206 — диапазон отдан, 200 — файл короче диапазона. Оба годятся.
  if (!response.ok) return null;

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer.slice(0, HEAD_BYTES));
}
