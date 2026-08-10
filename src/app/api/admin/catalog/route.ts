import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { notify } from "@/lib/notifications";

// Управление уже опубликованными картами: снять с витрины, вернуть,
// мягко удалить, восстановить.
//
// Отдельный обработчик от /api/admin/moderation намеренно: там решение по
// НОВОЙ заявке (одобрить/отклонить, строго из состояния pending), здесь —
// операции над живущим товаром. Смешать их значило бы получить один
// обработчик с шестью ветками и разными предусловиями в каждой.
//
// Всё идёт служебным ключом: ни одна политика не даёт менять is_published,
// и не должна — иначе снятие с витрины обходилось бы запросом из браузера.
export const dynamic = "force-dynamic";

const MAX_REASON_LENGTH = 500;

type Action = "suspend" | "unsuspend" | "delete" | "restore";
const ACTIONS: Action[] = ["suspend", "unsuspend", "delete", "restore"];

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    // 404, а не 403: существование админки не подтверждаем постороннему.
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

  const { productId, action, reason } = body as {
    productId?: unknown;
    action?: unknown;
    reason?: unknown;
  };

  if (typeof productId !== "string" || productId.length === 0) {
    return NextResponse.json({ error: "bad productId" }, { status: 400 });
  }
  if (typeof action !== "string" || !ACTIONS.includes(action as Action)) {
    return NextResponse.json({ error: "bad action" }, { status: 400 });
  }

  // Причина обязательна у снятия: карта пропадает с витрины и из дохода
  // автора, и он вправе знать, за что. Тот же принцип, что у отказа.
  let suspensionReason: string | null = null;
  if (action === "suspend") {
    if (typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json({ error: "reason required" }, { status: 400 });
    }
    suspensionReason = reason.trim().slice(0, MAX_REASON_LENGTH);
  }

  const db = getSupabaseAdmin();

  const { data: product, error: readError } = await db
    .from("products")
    .select("id, slug, title, creator_id, is_published, deleted_at, hidden_by")
    .eq("id", productId)
    .maybeSingle();

  if (readError) {
    console.error("Каталог: чтение не удалось:", readError.message);
    return NextResponse.json({ error: "read failed" }, { status: 500 });
  }
  if (!product) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const update: Record<string, unknown> = (() => {
    switch (action as Action) {
      case "suspend":
        // hidden_by = 'moderator' — именно это отличает бан от «автор
        // сам убрал»: вернуть такую карту креатор не сможет, проверка
        // стоит в /api/creator/product.
        return {
          is_published: false,
          hidden_by: "moderator",
          suspension_reason: suspensionReason,
        };
      case "unsuspend":
        return { is_published: true, hidden_by: null, suspension_reason: null };
      case "delete":
        // Мягко: строка остаётся, файл и скриншоты не трогаем — за них
        // заплачено, и покупатель продолжает скачивать.
        return { is_published: false, deleted_at: new Date().toISOString() };
      case "restore":
        // Возвращаем из удалённых СКРЫТОЙ, а не сразу на витрину:
        // восстановление — это отмена ошибки, а публиковать заново пусть
        // будет отдельным осознанным действием.
        return { deleted_at: null, is_published: false };
    }
  })();

  const { error: updateError } = await db
    .from("products")
    .update(update)
    .eq("id", productId);

  if (updateError) {
    console.error("Каталог: обновление не удалось:", updateError.message);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }

  // Журнал — после успешного обновления. Ошибку журнала не превращаем в
  // ошибку операции: карта уже снята, и откатывать это из-за незаписанной
  // строки истории было бы хуже, чем потерять строку истории.
  const { error: logError } = await db.from("moderation_log").insert({
    product_id: productId,
    actor_id: admin.id,
    action,
    reason: suspensionReason,
  });
  if (logError) console.error("Журнал модерации:", logError.message);

  // Автору сообщаем только о снятии: карта пропала с витрины и из его
  // дохода — это то, что он обязан узнать не постфактум. «Вернули» —
  // тоже новость, а «удалил/восстановил» он делает сам и уведомлять его
  // о собственном действии незачем.
  if (product.creator_id && (action === "suspend" || action === "unsuspend")) {
    await notify(
      product.creator_id as string,
      action === "suspend"
        ? {
            kind: "map_suspended",
            title: `“${product.title}” was taken off the shop`,
            body: suspensionReason,
            href: "/resources",
          }
        : {
            kind: "map_approved",
            title: `“${product.title}” is back on the shop`,
            body: null,
            href: `/shop/${product.slug}`,
          }
    );
  }

  // Витрина живёт на ISR (revalidate = 60): без этого снятая карта
  // оставалась бы открытой по прямой ссылке до минуты. Для бана это
  // слишком долго — сбрасываем кэш сразу.
  revalidatePath("/shop");
  revalidatePath(`/shop/${product.slug}`);

  return NextResponse.json({ ok: true });
}
