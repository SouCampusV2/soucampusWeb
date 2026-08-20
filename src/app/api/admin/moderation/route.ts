import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { REJECTION_TEMPLATES, cooldownDaysFor } from "@/lib/rejection";
import { notify } from "@/lib/notifications";

// Разбор очереди модерации: подтвердить или отклонить карту.
//
// RPC-стиль поверх HTTP+JSON, как /api/checkout (см. docs/RULES.md:
// админ-операции — Route Handler, а не server action).
//
// Публикация идёт СЛУЖЕБНЫМ ключом и только отсюда. Права ставить
// право публиковать креатору не выдано ни одной политикой — и не должно
// быть: иначе «модерация» обходилась бы одним запросом из браузера.
export const dynamic = "force-dynamic";

const MAX_REASON_LENGTH = 500;

type Action = "approve" | "reject";

export async function POST(request: Request) {
  // Проверка прав — первым делом, до разбора тела запроса.
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
  const { productId, action, reason, flags } = body as {
    productId?: unknown;
    action?: unknown;
    reason?: unknown;
    flags?: unknown;
  };

  if (typeof productId !== "string" || productId.length === 0) {
    return NextResponse.json({ error: "bad productId" }, { status: 400 });
  }
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "bad action" }, { status: 400 });
  }
  // Причина обязательна именно у отказа: отказ без объяснения заставляет
  // креатора гадать и присылать то же самое повторно.
  let rejectionReason: string | null = null;
  let rejectionFlags: string[] = [];
  if (action === "reject") {
    if (typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json({ error: "reason required" }, { status: 400 });
    }
    rejectionReason = reason.trim().slice(0, MAX_REASON_LENGTH);

    // Коды причин фильтруем по известному словарю: они едут в колонку с
    // check-ограничением, и незнакомое значение уронило бы запрос уже в
    // базе — понятнее отсечь его здесь.
    const known = new Set(REJECTION_TEMPLATES.map((t) => t.flag as string));
    rejectionFlags = Array.isArray(flags)
      ? flags.filter((f): f is string => typeof f === "string" && known.has(f))
      : [];
  }

  const db = getSupabaseAdmin();

  // Меняем только строки, ещё стоящие в очереди. Если карту уже разобрали
  // (второй клик, две открытые вкладки) — .eq("state", "pending") не
  // найдёт строку, и мы честно вернём 409 вместо тихой перезаписи чужого
  // решения.
  //
  // Состояние — одна колонка state (миграции 20260815130000 и
  // 20260816120000). Разрешённость перехода pending → live | rejected
  // проверяет триггер в базе, а не этот обработчик.
  const update =
    (action as Action) === "approve"
      ? {
          state: "live",
          rejection_reason: null,
          rejection_flags: [],
          // Одобрение снимает и претензию. Карта могла прийти в очередь
          // как возврат после take down (submission_kind =
          // 'after_takedown'), и без этого она вышла бы на витрину, всё
          // ещё помеченная снятой: автор видел бы у живой карты плашку
          // «Taken down» со старой причиной.
          suspension_reason: null,
          submission_kind: "first",
        }
      : {
          state: "rejected",
          rejection_reason: rejectionReason,
          rejection_flags: rejectionFlags,
        };

  const { data, error } = await db
    .from("products")
    .update(update)
    .eq("id", productId)
    .eq("state", "pending")
    .select("id, slug, title, creator_id")
    .maybeSingle();

  if (error) {
    console.error("Модерация не удалась:", error.message);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "already handled" }, { status: 409 });
  }

  // Пауза перед следующей заявкой — если отказ был по тяжёлой причине.
  //
  // Ставим ПОСЛЕ успешного обновления карты: если бы разбор не удался,
  // блокировать человека было бы не за что. И только вперёд по времени —
  // новый отказ не должен сокращать уже идущую паузу (max с текущим
  // значением), иначе лёгкий отказ обнулял бы тяжёлый.
  let blockedUntil: string | null = null;
  const cooldownDays = action === "reject" ? cooldownDaysFor(rejectionFlags) : 0;

  if (cooldownDays > 0 && data.creator_id) {
    const until = new Date(Date.now() + cooldownDays * 24 * 60 * 60 * 1000);

    const { data: profile } = await db
      .from("profiles")
      .select("submissions_blocked_until")
      .eq("id", data.creator_id)
      .maybeSingle();

    const current = profile?.submissions_blocked_until
      ? new Date(profile.submissions_blocked_until as string)
      : null;

    if (!current || current < until) {
      blockedUntil = until.toISOString();
      const { error: blockError } = await db
        .from("profiles")
        .update({ submissions_blocked_until: blockedUntil })
        .eq("id", data.creator_id);

      // Пауза не проставилась — карта всё равно отклонена, и откатывать
      // отказ из-за этого хуже, чем потерять паузу. В лог громко.
      if (blockError) {
        console.error("Пауза на заявки не выставлена:", blockError.message);
        blockedUntil = null;
      }
    } else {
      // Уже под более длинной паузой — сообщаем автору именно её.
      blockedUntil = current.toISOString();
    }
  }

  // Автору — итог разбора. Раньше он узнавал его, только если сам
  // возвращался на /resources и замечал сменившуюся плашку.
  if (data.creator_id) {
    await notify(
      data.creator_id as string,
      (action as Action) === "approve"
        ? {
            kind: "map_approved",
            title: `“${data.title}” is live`,
            body: "Your map passed the review and is on the marketplace now.",
            href: `/marketplace/${data.slug}`,
          }
        : {
            kind: "map_rejected",
            title: `“${data.title}” wasn't approved`,
            // Про паузу говорим в том же сообщении, а не отдельным:
            // человек должен узнать «отказ» и «до какого числа нельзя»
            // одновременно, иначе он пойдёт пробовать и упрётся молча.
            body: blockedUntil
              ? `${rejectionReason}

You can submit a new map again after ${new Date(
                  blockedUntil
                ).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}. Fixing and resubmitting this map is not affected.`
              : rejectionReason,
            // На правку, а не на витрину: исправил — карта сама
            // возвращается в очередь.
            href: `/resources/${data.slug}/edit`,
          }
    );
  }

  return NextResponse.json({ ok: true, slug: data.slug });
}
