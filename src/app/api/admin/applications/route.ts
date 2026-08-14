import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { notify } from "@/lib/notifications";

// Решение по заявке на статус креатора и отзыв уже выданного статуса.
//
// Одобрение — это ДВЕ записи в разных таблицах: отметить заявку и выдать
// profiles.is_creator. Обе идут служебным ключом, и иначе быть не может:
// у creator_applications нет политики update вовсе, а is_creator защищён
// триггером protect_is_creator от правки из браузера (миграция
// 20260809120000). То есть выдать себе креаторство можно только отсюда,
// пройдя проверку getAdminUser.
export const dynamic = "force-dynamic";

const MAX_REASON_LENGTH = 500;

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  const { applicationId, action, reason, userId } = body as {
    applicationId?: unknown;
    action?: unknown;
    reason?: unknown;
    userId?: unknown;
  };

  if (action !== "approve" && action !== "reject" && action !== "revoke") {
    return NextResponse.json({ error: "bad action" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Отзыв — про ЧЕЛОВЕКА, а не про заявку: заявки у него может не быть
  // вовсе (креаторство выдано backfill'ом старым авторам), поэтому и
  // адресуется он user_id, и обрабатывается до всей логики очереди.
  if (action === "revoke") {
    if (typeof userId !== "string" || userId.length === 0) {
      return NextResponse.json({ error: "bad userId" }, { status: 400 });
    }
    if (typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json({ error: "reason required" }, { status: 400 });
    }
    const revokeReason = reason.trim().slice(0, MAX_REASON_LENGTH);

    const { data: revoked, error: revokeError } = await db
      .from("profiles")
      .update({
        is_creator: false,
        creator_revoked_at: new Date().toISOString(),
        creator_revoked_reason: revokeReason,
      })
      .eq("id", userId)
      .eq("is_creator", true)
      .select("id")
      .maybeSingle();

    if (revokeError) {
      console.error("Отзыв креаторства не удался:", revokeError.message);
      return NextResponse.json({ error: "update failed" }, { status: 500 });
    }
    if (!revoked) {
      // Уже не креатор: два клика или две вкладки. Не ошибка сервера, но
      // и не «сделано» — сообщаем честно, как в очереди карт.
      return NextResponse.json({ error: "already handled" }, { status: 409 });
    }

    // Карты уходят с витрины ВМЕСТЕ со статусом (решение владельца
    // 2026-08-14). Прежде отзыв закрывал только загрузку нового, а уже
    // опубликованное оставалось продаваться — то есть у человека,
    // лишённого статуса за чужие работы, эти работы висели на витрине,
    // пока владелец не пройдёт по каталогу вручную.
    //
    // hidden_by = 'revoked', а не 'moderator': по этому значению карты
    // потом вернутся сами, когда статус выдадут снова, и при этом не
    // заденут те, что сняты по своим отдельным причинам.
    //
    // Трогаем только ЖИВЫЕ и неудалённые: карта, снятая за конкретную
    // провинность, обязана остаться снятой и после возврата статуса.
    const hiddenSlugs = await setMapsHidden(db, userId, revokeReason);

    // Журнал — по каждой карте, тем же форматом, что у ручного снятия:
    // иначе в истории карты появлялся бы разрыв, который ничем не
    // объяснить через полгода.
    if (hiddenSlugs.length > 0) {
      const { error: logError } = await db.from("moderation_log").insert(
        hiddenSlugs.map((s) => ({
          product_id: s.id,
          actor_id: admin.id,
          action: "suspend",
          reason: revokeReason,
        }))
      );
      if (logError) console.error("Журнал модерации:", logError.message);
    }

    await notify(userId, {
      kind: "creator_revoked",
      title: "Your creator status was removed",
      // Про карты говорим прямо и числом: человек всё равно увидит пустую
      // витрину, и узнать об этом из уведомления честнее, чем обнаружить
      // самому.
      body:
        hiddenSlugs.length > 0
          ? `${revokeReason}\n\n${hiddenSlugs.length} ${
              hiddenSlugs.length === 1 ? "map is" : "maps are"
            } off the marketplace while your access is closed. Buyers keep the files they paid for.`
          : revokeReason,
      href: "/resources",
    });

    revalidateMaps(hiddenSlugs);

    return NextResponse.json({ ok: true, hidden: hiddenSlugs.length });
  }

  if (typeof applicationId !== "string" || applicationId.length === 0) {
    return NextResponse.json({ error: "bad applicationId" }, { status: 400 });
  }

  let rejectionReason: string | null = null;
  if (action === "reject") {
    if (typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json({ error: "reason required" }, { status: 400 });
    }
    rejectionReason = reason.trim().slice(0, MAX_REASON_LENGTH);
  }

  // Меняем только строку, ещё стоящую в очереди: два клика или две
  // вкладки не должны переписывать уже принятое решение. Тот же приём,
  // что в /api/admin/moderation.
  const { data: application, error } = await db
    .from("creator_applications")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      rejection_reason: rejectionReason,
      decided_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("status", "pending")
    .select("id, user_id")
    .maybeSingle();

  if (error) {
    console.error("Заявка: обновление не удалось:", error.message);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
  if (!application) {
    return NextResponse.json({ error: "already handled" }, { status: 409 });
  }

  if (action === "approve") {
    const { error: grantError } = await db
      .from("profiles")
      .update({ is_creator: true })
      .eq("id", application.user_id);

    if (grantError) {
      // Заявка уже помечена одобренной, а права не выданы — худшее из
      // состояний, потому что человек видит «одобрено» и не может
      // загрузить карту. Возвращаем заявку в очередь, чтобы владелец
      // нажал ещё раз, а не разбирался, почему всё сломалось.
      console.error("Заявка: выдача прав не удалась:", grantError.message);
      await db
        .from("creator_applications")
        .update({ status: "pending", decided_at: null })
        .eq("id", application.id);

      return NextResponse.json({ error: "grant failed" }, { status: 500 });
    }

    // Вернулся статус — вернулись и карты, снятые вместе с ним. Иначе
    // человек с восстановленным доступом смотрит на пустую витрину и
    // вынужден просить вернуть каждую карту по отдельности, хотя решение
    // уже принято одно на всех.
    //
    // Возвращаем СРАЗУ на витрину, а не «скрытыми»: эти карты уже прошли
    // модерацию и стояли живыми — их сняло не решение по карте, а
    // временное состояние автора. Ровно поэтому же не трогаем те, у
    // которых hidden_by другой.
    const restored = await setMapsVisible(db, application.user_id);

    // Права выданы — только теперь можно сказать «добро пожаловать».
    // Порядок важен: уведомление до выдачи прав отправило бы человека на
    // форму загрузки, с которой его развернёт гейт.
    await notify(application.user_id, {
      kind: "creator_approved",
      title: "You're a creator now",
      body:
        restored.length > 0
          ? `Your application was approved — you can upload maps to the marketplace again. ${restored.length} ${
              restored.length === 1 ? "map is" : "maps are"
            } back on sale.`
          : "Your application was approved — you can upload maps to the marketplace.",
      href: "/creator/upload",
    });

    revalidateMaps(restored);
  } else {
    await notify(application.user_id, {
      kind: "creator_rejected",
      title: "Your creator application wasn't approved",
      body: rejectionReason,
      href: "/resources",
    });
  }

  return NextResponse.json({ ok: true });
}

type MapRef = { id: string; slug: string };
type Db = ReturnType<typeof getSupabaseAdmin>;

/**
 * Снять с витрины всё живое, что выложил этот человек.
 *
 * Возвращает снятое, потому что вызывающему нужны и число (для текста
 * уведомления), и адреса (для сброса ISR): выяснять это вторым запросом
 * после update было бы уже поздно — карты перестанут подходить под
 * условие.
 */
async function setMapsHidden(
  db: Db,
  userId: string,
  reason: string
): Promise<MapRef[]> {
  const { data, error } = await db
    .from("products")
    .update({
      is_published: false,
      hidden_by: "revoked",
      suspension_reason: reason,
    })
    .eq("creator_id", userId)
    .eq("is_published", true)
    .is("deleted_at", null)
    .select("id, slug");

  if (error) {
    // Статус уже отозван, и это главное: загружать человек больше не
    // может. Сорвавшееся снятие карт не отменяет отзыв — иначе владелец
    // остался бы и со статусом на месте, и без объяснения. Пишем в лог,
    // карты снимаются из каталога руками.
    console.error("Отзыв: карты не сняты:", error.message);
    return [];
  }
  return (data ?? []) as MapRef[];
}

/** Вернуть на витрину то, что ушло вместе со статусом, и только это. */
async function setMapsVisible(db: Db, userId: string): Promise<MapRef[]> {
  const { data, error } = await db
    .from("products")
    .update({ is_published: true, hidden_by: null, suspension_reason: null })
    .eq("creator_id", userId)
    .eq("hidden_by", "revoked")
    .is("deleted_at", null)
    .select("id, slug");

  if (error) {
    console.error("Возврат статуса: карты не вернулись:", error.message);
    return [];
  }
  return (data ?? []) as MapRef[];
}

/**
 * Сбросить кэш витрины после массового снятия или возврата.
 *
 * Витрина живёт на ISR (revalidate = 60), и без сброса снятая карта
 * оставалась бы открытой по прямой ссылке до минуты. Для страницы,
 * которую убрали за ворованный контент, это слишком долго.
 */
function revalidateMaps(maps: MapRef[]) {
  if (maps.length === 0) return;
  revalidatePath("/marketplace");
  for (const map of maps) revalidatePath(`/marketplace/${map.slug}`);
}
