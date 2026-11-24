import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/current-user";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp, hashIp } from "@/lib/ip-hash";
import { signedDownloadUrl, downloadFileName, ownsOrder } from "@/lib/orders";
import {
  grantBySession,
  grantForUser,
  isUuid,
  recordDownload,
  type DownloadGrant,
} from "@/lib/downloads";

// ============================================================
// Скачивание купленной карты (2026-09-26).
//
// Раньше страницы /purchases и /marketplace/success подписывали ссылку
// на файл при рендере и клали её прямо в кнопку. Факт скачивания при
// этом не видел никто — а при споре о списании это первое, что
// спрашивает банк (docs/STRIPE.md → Payments security).
//
// Теперь кнопка ведёт сюда. Порядок:
//   1) кто пришёл и есть ли у него оплаченный заказ с этой картой;
//   2) лимит частоты — ПОСЛЕ прав, как везде (rate-limit.ts);
//   3) запись в журнал;
//   4) редирект на свежую подписанную ссылку.
//
// ⚠️ Ссылку сюда рисует обычный <a>, не next/link: тот заранее
// подгружает видимые ссылки и записал бы скачивание, которого не было.
//
// Человек обязан быть вошедшим — всегда (с 2026-11-10, аудит S-04).
// Какой заказ имеется в виду, называется одним из двух способов:
//   ?session=cs_…  кнопка со страницы успеха — заказ этой сессии Stripe,
//                  и он обязан принадлежать вошедшему (ownsOrder);
//   без session    кнопка из списка покупок — любой его заказ с картой.
// ============================================================

export const dynamic = "force-dynamic";

// Отказ одинаковый для «нет такой карты» и «ты её не покупал»: по
// разнице ответов нельзя было бы выяснять, что куплено чужими.
function notFound() {
  return new NextResponse("Download not found.", { status: 404 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("product") ?? "";
  const sessionId = url.searchParams.get("session");

  if (!isUuid(productId)) return notFound();

  // Скачивание начинает ЧЕЛОВЕК, а не страница (аудит 2026-11, S-21).
  //
  // Это GET, и он пишет в журнал, по которому решаются споры о списании.
  // Значит, любой тег на чужой странице, который сам ходит по адресу —
  // <img>, <script>, <iframe>, — «скачивал» бы карту от имени смотрящего.
  // Браузер честно сообщает, ради чего делает запрос (Sec-Fetch-Dest):
  // переход по ссылке и кнопка Download — это document, всё остальное
  // сюда не относится. Заголовка нет (старый браузер, curl) — пропускаем:
  // вход и право на файл проверяются ниже в любом случае.
  const dest = request.headers.get("sec-fetch-dest");
  if (dest && dest !== "document" && dest !== "empty") return notFound();

  let grant: DownloadGrant | null;
  let actor: string;

  try {
    // ⚠️ Вход нужен ВСЕГДА, и с id сессии тоже (аудит 2026-11, S-04).
    // Раньше `?session=cs_…` был пропуском сам по себе: ссылка работала
    // без входа и бессрочно у любого, к кому попала. Гостевой покупки
    // нет с 24.07 — у заказа есть хозяин, и файл отдаётся ему. Id сессии
    // теперь лишь называет, КАКОЙ заказ; право даёт аккаунт (ownsOrder).
    const supabase = await createSupabaseServer();
    const user = await getCurrentUser(supabase);
    if (!user) {
      // Сессия истекла, пока вкладка была открыта, — вернуть человека к
      // покупкам после входа, а не показывать голый отказ.
      return NextResponse.redirect(new URL("/login?next=/purchases", url), 303);
    }
    actor = user.id;

    if (sessionId) {
      const bySession = await grantBySession(sessionId, productId);
      grant = bySession && ownsOrder(bySession, user) ? bySession : null;
    } else {
      grant = await grantForUser(user.id, productId);
    }
  } catch (err) {
    console.error("[download] проверка права упала:", err instanceof Error ? err.message : err);
    return new NextResponse("Something went wrong. Try again in a moment.", { status: 500 });
  }

  if (!grant) return notFound();

  const limited = await enforceRateLimit("download", actor);
  if (limited) return limited;

  if (!grant.filePath) {
    // Кнопки при пустом файле нет ни на одной странице («File coming
    // soon»), так что сюда приходят только по старой или набранной
    // руками ссылке.
    return notFound();
  }

  // Соль та же, что у счётчика просмотров: хэши из двух таблиц
  // сравнимы между собой, а IP из квитанции Stripe можно прогнать через
  // ту же функцию. Без соли журнал не пишем — но файл всё равно отдаём.
  const salt = process.env.VIEW_HASH_SALT;
  if (salt) {
    await recordDownload({
      grant,
      productId,
      source: sessionId ? "success" : "purchases",
      ipHash: hashIp(clientIp(request.headers), salt),
      userAgent: request.headers.get("user-agent"),
    });
  } else {
    console.error("[download] VIEW_HASH_SALT не задан — скачивание не записано в журнал");
  }

  const signed = await signedDownloadUrl(
    grant.filePath,
    downloadFileName(grant.title, grant.filePath)
  );
  if (!signed) {
    return new NextResponse(
      "We couldn't prepare this download. Try again, or contact us and we'll send the file.",
      { status: 502 }
    );
  }

  // 303: «иди туда GET-ом». Кэшировать нельзя ни ответ, ни редирект —
  // ссылка живёт час и у каждого своя.
  const response = NextResponse.redirect(signed, 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
