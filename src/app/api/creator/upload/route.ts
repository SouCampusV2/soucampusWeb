import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PRODUCT_FILES_BUCKET } from "@/lib/orders";
import {
  HEAD_BYTES,
  MAP_FILE_EXTENSIONS,
  MAP_FILE_MAX_BYTES,
  checkMapBytes,
  formatBytes,
  safeExtension,
} from "@/lib/upload-limits";

// ============================================================
// Шлюз записи, путь №1: файл карты в Storage (2026-09-11).
//
// Это шаг 2 плана из docs/ARCHITECTURE.md § 5.3–5.4 и ПЕРВЫЙ путь,
// уехавший с прямой записи из браузера на свой обработчик. Взят он не
// потому, что лёгкий, а потому, что дорогой: файл отсюда раздаётся
// покупателям под нашим брендом, и до сегодняшнего дня его содержимое
// не проверял никто.
//
// ------------------------------------------------------------
// Как было и почему так нельзя
// ------------------------------------------------------------
// Браузер звал storage.upload() напрямую, а единственным запретом была
// политика бакета: «первый сегмент пути = твой auth.uid()». То есть
// база проверяла ровно один факт — кладёшь ли ты в свою папку. Ни
// размера, ни расширения, ни сигнатуры она не знает и знать не может.
//
// Всё остальное — checkMapFile(), лимит в 15 МБ, разрешённые
// расширения — жило в форме, в браузере. Это ровно тот случай, который
// в проекте ловили пять раз за август: запрет, стоящий не там, где
// стоит разрешение, не запрещает ничего. Отключить проверку в форме —
// правка одной строки в консоли.
//
// ------------------------------------------------------------
// Почему файл всё равно летит мимо нас, и это не полумера
// ------------------------------------------------------------
// Очевидная схема «POST файла на свой обработчик» здесь не работает:
// у функции Vercel потолок тела запроса ~4.5 МБ, а карта у нас до 15.
// Половина загрузок просто не доехала бы.
//
// Поэтому путь разрезан надвое, и сервер стоит по обе стороны:
//
//   sign    — решает, МОЖНО ли, кому, куда и какого размера. Путь в
//             бакете строит сам; выдаёт одноразовый токен ровно на этот
//             путь. Байты не трогает.
//   confirm — спрашивает у Storage, что в итоге легло: настоящий размер
//             (info) и первые байты (ranged-запрос). Не сошлось —
//             объект удаляется, наружу идёт внятная причина.
//
// Ключевое: токен выдаётся на ОДИН заранее известный путь. Клиент не
// называет, куда писать, — он получает разрешение на конкретное место.
// Поэтому ни «../», ни чужая папка, ни расширение .exe в ключ объекта
// не попадают: их там некому подставить.
//
// ⚠️ Окно между sign и confirm существует, и его надо назвать вслух.
// Между двумя вызовами в бакете лежит непроверенный объект. Он
// безопасен ровно потому, что на него никто не может сослаться: строка
// товара ещё не создана (или ещё указывает на старый файл), а скачивают
// файл только по подписанной ссылке из products.file_path после
// покупки. Если confirm не позвали вовсе — объект остаётся сиротой, и
// его подберёт /api/creator/cleanup-storage, которая собирает всё, на
// что не ссылается ни одна строка.
//
// ⚠️ ЗДЕСЬ ЖЕ МЕСТО ДЛЯ АНТИВИРУСА (приоритет №1 в CLAUDE.md). Ради
// него всё и затевалось: до шлюза сканировать было негде — наш сервер
// файла не видел. Теперь видит. Сканирование встанет в confirm, рядом с
// проверкой сигнатуры, и ему уже приготовлен единственный выход
// наружу — reject() ниже, который удаляет объект и объясняет отказ.
// ============================================================

export const dynamic = "force-dynamic";

type Action = "sign" | "confirm";

/**
 * Ответ на sign. token — одноразовый, привязан к path; грузить им файл
 * браузер будет через uploadToSignedUrl (см. src/lib/upload-client.ts).
 */
type SignedSlot = { path: string; token: string };

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: Action;
    fileName?: string;
    size?: number;
    path?: string;
  };
  const action = body.action;

  if (action !== "sign" && action !== "confirm") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Право загружать держит is_creator, а не is_admin — так решает база
  // (политика creators insert own products, миграция 20260811160000), и
  // переезд формы в админку 28.08 этого не изменил. Проверяем служебным
  // ключом: profiles закрыта RLS, читать её от лица пользователя ради
  // одного флага незачем.
  const db = getSupabaseAdmin();
  const { data: profile } = await db
    .from("profiles")
    .select("is_creator")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_creator) {
    return NextResponse.json(
      {
        error:
          "Your creator access is closed, so map files can't be uploaded from here. The reason is on your resources page.",
      },
      { status: 403 }
    );
  }

  // Лимит — после проверки прав и до самой работы. После прав — чтобы
  // посторонний не расходовал чужой счёт; до работы — потому что смысл
  // в том, чтобы работа не началась.
  //
  // Считается ВЫДАЧА РАЗРЕШЕНИЯ, а не загрузка: confirm лимита не
  // тратит, иначе один честный файл списывал бы два слота. Слот без
  // загрузки пропадает — так и задумано, разрешение и есть дорогое.
  if (action === "sign") {
    const limited = await enforceRateLimit("creator-upload", user.id);
    if (limited) return limited;
    return sign(user.id, body);
  }

  return confirm(user.id, body);
}

// ------------------------------------------------------------
// sign — «можно, вот сюда»
// ------------------------------------------------------------
async function sign(
  userId: string,
  body: { fileName?: string; size?: number }
): Promise<NextResponse> {
  const fileName = typeof body.fileName === "string" ? body.fileName : "";
  const size = typeof body.size === "number" ? body.size : NaN;

  if (!fileName || !Number.isFinite(size) || size < 0) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Размер здесь — ЗАЯВЛЕННЫЙ, то есть ничего не доказывающий: его
  // называет клиент. Проверяем всё равно, чтобы не заводить слот под
  // заведомо негодную загрузку и сказать человеку «слишком большой» до
  // того, как он потратит десять минут на отправку. Настоящий размер
  // сверяет confirm, уже у Storage.
  if (size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }
  if (size > MAP_FILE_MAX_BYTES) {
    return NextResponse.json(
      {
        error: `The map file must be ${formatBytes(MAP_FILE_MAX_BYTES)} or smaller — yours is ${formatBytes(size)}.`,
      },
      { status: 400 }
    );
  }

  const ext = safeExtension(fileName, "zip");
  if (!(MAP_FILE_EXTENSIONS as readonly string[]).includes(ext)) {
    return NextResponse.json(
      {
        error:
          "That doesn't look like a .zip, .schem or .schematic file. Pack a world folder into a zip archive first.",
      },
      { status: 400 }
    );
  }

  // Путь строит СЕРВЕР. Раньше его собирал браузер, и это была не
  // экономия, а раздача прав: строка, которую пишет клиент, становилась
  // ключом объекта. Форма папки прежняя (<user_id>/<stamp>-map.<ext>) —
  // её знает уборка Storage и на неё же смотрела снятая политика.
  const path = `${userId}/${Date.now()}-map.${ext}`;

  const { data, error } = await getSupabaseAdmin()
    .storage.from(PRODUCT_FILES_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    // Наружу тихо, внутрь громко: сообщения Storage рассказывают про
    // устройство бакетов и политик, а на другом конце любой креатор.
    console.error("Шлюз загрузки: не выдался токен:", error?.message);
    return NextResponse.json({ error: "upload unavailable" }, { status: 500 });
  }

  const slot: SignedSlot = { path: data.path, token: data.token };
  return NextResponse.json(slot);
}

// ------------------------------------------------------------
// confirm — «что в итоге легло»
// ------------------------------------------------------------
async function confirm(
  userId: string,
  body: { path?: string; fileName?: string }
): Promise<NextResponse> {
  const path = typeof body.path === "string" ? body.path : "";
  const fileName = typeof body.fileName === "string" ? body.fileName : "";

  // Проверка владения путём — не формальность. Путь приходит от
  // клиента, и без этой строки креатор просил бы проверить (а при
  // отказе — УДАЛИТЬ) чужой файл, зная только его ключ.
  if (!path.startsWith(`${userId}/`) || path.includes("..")) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const db = getSupabaseAdmin();
  const storage = db.storage.from(PRODUCT_FILES_BUCKET);

  const { data: info, error: infoError } = await storage.info(path);
  if (infoError || !info) {
    return NextResponse.json(
      { error: "The upload didn't arrive. Try attaching the file again." },
      { status: 404 }
    );
  }

  /** Отказ = объект не остаётся лежать. Сюда же придёт антивирус. */
  async function reject(reason: string): Promise<NextResponse> {
    const { error: removeError } = await storage.remove([path]);
    if (removeError) {
      // Не роняем ответ: человеку важен отказ, а недоубранный объект
      // подберёт cleanup-storage — на него всё равно никто не ссылается.
      console.error("Шлюз загрузки: отклонённый файл не удалился:", removeError.message);
    }
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  const size = typeof info.size === "number" ? info.size : 0;

  // Настоящий размер — у Storage, а не со слов клиента. Подписанный
  // токен даёт право записать в путь, но не обещает, что запишут
  // ровно то, что обещали при sign.
  if (size === 0) {
    return reject("That file is empty.");
  }
  if (size > MAP_FILE_MAX_BYTES) {
    return reject(
      `The map file must be ${formatBytes(MAP_FILE_MAX_BYTES)} or smaller — yours is ${formatBytes(size)}.`
    );
  }

  const head = await readHead(db, path, size);
  if (!head) {
    console.error("Шлюз загрузки: не прочитались первые байты:", path);
    return NextResponse.json({ error: "upload unavailable" }, { status: 500 });
  }

  // Имя нужно ровно для одного решения — засчитывать ли голый NBT
  // (см. NBT_SIGNATURE в upload-limits.ts). Если клиент его не прислал,
  // берём имя из пути: оно кончается на настоящее расширение, которое
  // проверил и поставил sign.
  const problem = checkMapBytes(head, size, fileName || path);
  if (problem) return reject(problem);

  return NextResponse.json({ ok: true, path, size });
}

/**
 * Первые HEAD_BYTES байтов объекта — ranged-запросом по подписанной
 * ссылке.
 *
 * Почему не download(): он тянет файл целиком. Пятнадцать мегабайт в
 * функцию ради двенадцати байтов — это и время, и память, и трафик, и
 * всё это на каждой загрузке. Range отдаёт ровно голову.
 */
async function readHead(
  db: ReturnType<typeof getSupabaseAdmin>,
  path: string,
  size: number
): Promise<Uint8Array | null> {
  const { data, error } = await db.storage
    .from(PRODUCT_FILES_BUCKET)
    .createSignedUrl(path, 60);
  if (error || !data?.signedUrl) return null;

  const last = Math.min(HEAD_BYTES, size) - 1;
  const response = await fetch(data.signedUrl, {
    headers: { Range: `bytes=0-${last}` },
  });
  // 206 — диапазон отдан, 200 — отдали целиком (файл короче диапазона).
  // Оба ответа годятся: нам нужны первые байты, а не именно частичный
  // ответ. Всё остальное — отказ.
  if (!response.ok) return null;

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer.slice(0, HEAD_BYTES));
}
