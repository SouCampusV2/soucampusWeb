import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/current-user";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp, hashIp } from "@/lib/ip-hash";
import { signedDownloadUrl, downloadFileName } from "@/lib/orders";
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
// Пропуск — одно из двух:
//   ?session=cs_…  страница успеха, человек может быть гостем. Id сессии
//                  Stripe работает пропуском так же, как для самой
//                  страницы (разбор — getPaidOrder в orders.ts).
//   без session    список покупок, человек обязан быть вошедшим.
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

  let grant: DownloadGrant | null;
  let actor: string;

  try {
    if (sessionId) {
      grant = await grantBySession(sessionId, productId);
      actor = `session:${sessionId}`;
    } else {
      const supabase = await createSupabaseServer();
      const user = await getCurrentUser(supabase);
      if (!user) {
        // Сессия истекла, пока вкладка была открыта, — вернуть человека к
        // покупкам после входа, а не показывать голый отказ.
        return NextResponse.redirect(new URL("/login?next=/purchases", url), 303);
      }
      grant = await grantForUser(user.id, user.email, productId);
      actor = user.id;
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
