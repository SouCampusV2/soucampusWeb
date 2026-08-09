import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Решение по заявке на статус креатора.
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

  const { applicationId, action, reason } = body as {
    applicationId?: unknown;
    action?: unknown;
    reason?: unknown;
  };

  if (typeof applicationId !== "string" || applicationId.length === 0) {
    return NextResponse.json({ error: "bad applicationId" }, { status: 400 });
  }
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "bad action" }, { status: 400 });
  }

  let rejectionReason: string | null = null;
  if (action === "reject") {
    if (typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json({ error: "reason required" }, { status: 400 });
    }
    rejectionReason = reason.trim().slice(0, MAX_REASON_LENGTH);
  }

  const db = getSupabaseAdmin();

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
  }

  return NextResponse.json({ ok: true });
}
