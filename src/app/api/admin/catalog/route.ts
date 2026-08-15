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

  const { productId, action, reason, confirmTitle } = body as {
    productId?: unknown;
    action?: unknown;
    reason?: unknown;
    confirmTitle?: unknown;
  };

  if (typeof productId !== "string" || productId.length === 0) {
    return NextResponse.json({ error: "bad productId" }, { status: 400 });
  }
  if (typeof action !== "string" || !ACTIONS.includes(action as Action)) {
    return NextResponse.json({ error: "bad action" }, { status: 400 });
  }

  // Причина обязательна у ОБОИХ действий, уносящих карту с витрины: она
  // пропадает из дохода автора, и он вправе знать, за что. Тот же
  // принцип, что у отказа.
  //
  // Хранится в одной колонке suspension_reason и для снятия, и для
  // удаления: смысл у неё один — «почему этой карты нет на витрине», а
  // отличает случаи deleted_at, который и так есть. Заводить вторую
  // колонку значило бы держать два поля, из которых в каждый момент
  // осмысленно ровно одно.
  let suspensionReason: string | null = null;
  if (action === "suspend" || action === "delete") {
    if (typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json({ error: "reason required" }, { status: 400 });
    }
    suspensionReason = reason.trim().slice(0, MAX_REASON_LENGTH);
  }

  const db = getSupabaseAdmin();

  const { data: product, error: readError } = await db
    .from("products")
    .select("id, slug, title, creator_id, state, was_approved")
    .eq("id", productId)
    .maybeSingle();

  if (readError) {
    // Текст ошибки отдаём НАРУЖУ, а не только в лог. Это админка: смотрит
    // её владелец сайта, посторонний сюда не попадает вовсе (404 выше), а
    // «read failed» без подробностей стоило нам полудня поисков не в той
    // стороне.
    console.error("Каталог: чтение не удалось:", readError.message);
    return NextResponse.json(
      { error: `read failed: ${readError.message}` },
      { status: 500 }
    );
  }
  if (!product) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Название вводится руками и сверяется ЗДЕСЬ, а не только в форме:
  // проверка в браузере защищает от случайного клика, серверная — от
  // запроса мимо формы. Без учёта регистра и краевых пробелов: смысл
  // подтверждения в осознанности, а не в диктанте (ровно как у автора в
  // /api/creator/product).
  if (action === "delete") {
    const typed = typeof confirmTitle === "string" ? confirmTitle : "";
    if (typed.trim().toLowerCase() !== (product.title as string).toLowerCase()) {
      return NextResponse.json(
        { error: "Type the map title exactly to confirm." },
        { status: 400 }
      );
    }
  }

  const update: Record<string, unknown> = (() => {
    switch (action as Action) {
      case "suspend":
        // Состояние 'suspended' и означает «сняла площадка»: вернуть
        // такую карту автор не может, переход suspended → hidden базой
        // не разрешён (миграция 20260815130000).
        return { state: "suspended", suspension_reason: suspensionReason };
      case "unsuspend":
        return { state: "live", suspension_reason: null };
      case "delete":
        // Мягко: строка остаётся, файл и скриншоты не трогаем — за них
        // заплачено, и покупатель продолжает скачивать.
        return { state: "deleted", suspension_reason: suspensionReason };
      case "restore":
        // Возвращаем карту АВТОРУ: не удалена, не снята, просто не на
        // витрине — и он сам решает, когда её вернуть.
        //
        // Раньше здесь снималось только deleted_at, а hidden_by
        // ('moderator') и причина оставались. Рассуждение было такое:
        // «восстановление отменяет удаление, но не снятие». На бумаге
        // стройно, на практике — тупик, найденный владельцем: карта
        // возвращается, автор жмёт «вернуть на витрину» и читает «её
        // сняла администрация, отсюда не вернуть, посмотрите причину», а
        // причины на экране нет. Выхода из этого состояния у него не было
        // вовсе, и что делать дальше — тоже непонятно.
        //
        // Дело не в тексте сообщения, а в самом состоянии: «уже не
        // удалена, но всё ещё снята» — это третий, необъявленный статус,
        // в который можно попасть, но нельзя выйти. Такого состояния
        // просто не должно быть.
        //
        // Теперь у восстановления один понятный смысл: карта снова у
        // автора. Если площадка всё ещё против неё — на это есть Take
        // down, отдельное действие с причиной и уведомлением, а не
        // молчаливый осадок от предыдущего.
        //
        // hidden_by = null, а не 'creator': писать «спрятал автор» про
        // то, чего автор не делал, значит врать в данных ради удобства
        // проверки. null и означает ровно то, что есть, — карту не
        // снимал никто, она просто не опубликована.
        //
        // Куда именно возвращать — решает то, была ли карта одобрена.
        // Уже побывавшую на витрине возвращаем спрятанной, автор сам
        // опубликует. А заявку, удалённую прямо из очереди, — обратно в
        // очередь: вернуть её «одобренной» значило бы дать автору
        // выложить на витрину то, что никто не разбирал (миграция
        // 20260815140000).
        return {
          state: product.was_approved ? "hidden" : "pending",
          suspension_reason: null,
        };
    }
  })();

  const { error: updateError } = await db
    .from("products")
    .update(update)
    .eq("id", productId);

  if (updateError) {
    // Здесь особенно важно: именно сюда прилетают отказы триггера
    // разрешённых переходов, и без текста они неотличимы от «база
    // недоступна».
    console.error("Каталог: обновление не удалось:", updateError.message);
    return NextResponse.json(
      { error: `update failed: ${updateError.message}` },
      { status: 500 }
    );
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

  // Автору сообщаем обо всём, что делает с картой НЕ он: сняли, вернули,
  // удалили, восстановили. Удаление здесь — действие модератора (своё
  // собственное автор делает в /api/creator/product и уведомлять его о
  // нём незачем), и молчать о нём нельзя: карта просто исчезает из его
  // списка.
  //
  // Про восстановление раньше молчали: считалось, что снаружи это не
  // событие — карта возвращается в том же снятом виде, с той же
  // причиной. Теперь возвращается она не снятой, а в распоряжение
  // автора, и это как раз событие: он в прошлый раз получил «карта
  // удалена» и без второго письма так и остался бы с этим.
  //
  // «Восстановили» не шлём: снаружи это не событие — карта возвращается
  // в том же снятом виде, с той же причиной, что автор уже прочитал.
  if (product.creator_id) {
    const message = {
      suspend: {
        kind: "map_suspended" as const,
        title: `“${product.title}” was taken off the marketplace`,
        body: suspensionReason,
        href: "/resources",
      },
      unsuspend: {
        kind: "map_approved" as const,
        title: `“${product.title}” is back on the marketplace`,
        body: null,
        href: `/marketplace/${product.slug}`,
      },
      delete: {
        kind: "map_suspended" as const,
        title: `“${product.title}” was removed from the marketplace`,
        body: suspensionReason,
        href: "/resources",
      },
      restore: {
        kind: "map_approved" as const,
        title: `“${product.title}” is back in your resources`,
        body: "It is off the marketplace for now — publish it again whenever you are ready.",
        href: "/resources",
      },
    }[action as Action];

    if (message) await notify(product.creator_id as string, message);
  }

  // Витрина живёт на ISR (revalidate = 60): без этого снятая карта
  // оставалась бы открытой по прямой ссылке до минуты. Для бана это
  // слишком долго — сбрасываем кэш сразу.
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${product.slug}`);

  return NextResponse.json({ ok: true });
}
