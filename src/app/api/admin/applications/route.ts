import { NextResponse } from "next/server";
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

    // Карты НЕ снимаем с витрины: отзыв статуса закрывает загрузку
    // нового, а уже проданное и опубликованное — отдельное решение,
    // для него есть каталог с причиной по каждой карте.
    await notify(userId, {
      kind: "creator_revoked",
      title: "Your creator status was removed",
      body: revokeReason,
      href: "/resources",
    });

    return NextResponse.json({ ok: true });
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

    // Права выданы — только теперь можно сказать «добро пожаловать».
    // Порядок важен: уведомление до выдачи прав отправило бы человека на
    // форму загрузки, с которой его развернёт гейт.
    await notify(application.user_id, {
      kind: "creator_approved",
      title: "You're a creator now",
      body: "Your application was approved — you can upload maps to the marketplace.",
      href: "/creator/upload",
    });
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
