import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/products";
import {
  AVATARS_BUCKET,
  AVATAR_NAME,
  IMAGE_EXTENSIONS,
  IMAGE_MAX_BYTES,
  HEAD_BYTES,
  checkImageBytes,
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
// ============================================================

export const dynamic = "force-dynamic";

type Action = "sign" | "confirm";
/** product — картинки карты (обложка, галерея, описание); avatar — профиль. */
type Kind = "product" | "avatar";

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
  const { action, kind } = body;

  if (
    (action !== "sign" && action !== "confirm") ||
    (kind !== "product" && kind !== "avatar")
  ) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Право на картинки карты держит is_creator — то же, что на файл
  // карты и на строку товара. Аватар есть у любого вошедшего: это его
  // собственный профиль, и никаких прав картинка не даёт.
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

  return confirm(user.id, kind, body);
}

/** Куда пишет этот вид загрузки. */
function bucketOf(kind: Kind): string {
  return kind === "product" ? PRODUCT_IMAGES_BUCKET : AVATARS_BUCKET;
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
  // Аватар едет во ВРЕМЕННЫЙ путь: на место его переставит confirm,
  // когда убедится, что это картинка (см. шапку файла).
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path =
    kind === "product"
      ? `${userId}/${stamp}.${ext}`
      : `${userId}/pending-${stamp}.${ext}`;

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
  if (!path.startsWith(`${userId}/`) || path.includes("..")) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  // Готовый аватар не может выдать себя за только что загруженный:
  // иначе confirm переставил бы файл сам на себя, а до того — удалил.
  if (kind === "avatar" && !path.startsWith(`${userId}/pending-`)) {
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

  if (kind === "product") {
    return NextResponse.json({ ok: true, path, size });
  }

  // Аватар: проверенный файл переезжает на постоянный путь. move не
  // перезаписывает, поэтому прежний снимаем сами — к этому моменту
  // новый уже проверен, так что остаться вообще без аватара нечем.
  const finalPath = `${userId}/${AVATAR_NAME}`;
  await storage.remove([finalPath]);
  const { error: moveError } = await storage.move(path, finalPath);
  if (moveError) {
    console.error("Шлюз картинок: аватар не переехал:", moveError.message);
    await storage.remove([path]);
    return NextResponse.json({ error: "upload unavailable" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path: finalPath, size });
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
