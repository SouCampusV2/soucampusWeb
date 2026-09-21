import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasPurchased } from "@/lib/purchases";

// ============================================================
// Шлюз записи, пути №10 и №11: комментарий под картой (2026-09-21).
//
// Писал и удалял комментарии браузер: insert прямо в product_comments и
// rpc("soft_delete_comment"). Сторожили это RLS-политика «покупал ли» и
// два триггера с лимитами частоты.
//
// ------------------------------------------------------------
// ⚠️ ЧТО ПЕРЕЕЗД ЛОМАЕТ, ЕСЛИ ОБ ЭТОМ НЕ ЗНАТЬ
// ------------------------------------------------------------
// Шлюз пишет служебным ключом, а оба триггера лимита
// (20260822130000_rate_limits) первой строкой пропускают всё, что
// пришло не от роли authenticated:
//
//     if auth.role() <> 'authenticated' or auth.uid() is null then
//       return new;
//
// Иначе нельзя — под служебным ключом ходит админка, и считать ей
// лимиты было бы неверно. Но следствие жёсткое: переехав на шлюз,
// комментарии вышли бы из-под лимитов ВООБЩЕ, и заметить это было бы
// нечем — ограничение просто перестаёт срабатывать, ошибок при этом
// никаких.
//
// Поэтому те же два числа (раз в 20 секунд, 10 в час) повторены в
// rate-limit.ts и берутся здесь. Это ровно тот случай, что описан в
// ARCHITECTURE.md § 5.4 после переезда карты: **правила теперь в двух
// местах**, и триггеры остаются вторым рубежом на случай, если запись
// однажды пойдёт мимо шлюза.
//
// То же и с проверкой покупки: политика «insert own comment if bought»
// звала has_purchased(), а та берёт человека из JWT (auth.uid()), то
// есть под служебным ключом всегда отвечает «нет». Её работу делает
// hasPurchased() из src/lib/purchases.ts — та же проверка, но человек
// передаётся явно.
// ============================================================

export const dynamic = "force-dynamic";

/** Потолок базы — 2000 (check в 20260821180000). Форма считает до 1000. */
const MAX_BODY = 2000;

type Body = {
  action?: "create" | "delete";
  productId?: string;
  body?: string;
  commentId?: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as Body;

  if (payload.action === "delete") return remove(user.id, payload);
  if (payload.action === "create") return create(user.id, user.email, payload);
  return NextResponse.json({ error: "bad request" }, { status: 400 });
}

async function create(
  userId: string,
  email: string | undefined,
  payload: Body
): Promise<NextResponse> {
  const productId = typeof payload.productId === "string" ? payload.productId : "";
  const text = typeof payload.body === "string" ? payload.body.trim() : "";

  if (!productId || !text) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (text.length > MAX_BODY) {
    return NextResponse.json(
      { error: `A comment can be up to ${MAX_BODY} characters.` },
      { status: 400 }
    );
  }

  // Право писать — у купившего, и это ПРАВО, а не удобство: проверяем
  // до лимита, чтобы посторонний не тратил свой счёт на дверь, которая
  // ему всё равно закрыта.
  if (!(await hasPurchased(productId, userId, email))) {
    return NextResponse.json(
      { error: "Only buyers can comment on a map." },
      { status: 403 }
    );
  }

  // Два лимита, потому что их два и в базе: короткий против очереди
  // сообщений подряд, часовой против объёма за вечер.
  const burst = await enforceRateLimit("comment-burst", userId);
  if (burst) {
    return NextResponse.json(
      {
        error: "rate limited",
        message: "Slow down a little — one comment every 20 seconds.",
      },
      { status: 429 }
    );
  }
  const hourly = await enforceRateLimit("comment", userId);
  if (hourly) return hourly;

  const { error } = await getSupabaseAdmin()
    .from("product_comments")
    .insert({ product_id: productId, user_id: userId, body: text });

  if (error) {
    // Текст ошибки базы наружу не отдаём — он рассказывает о схеме.
    console.error("Шлюз комментариев: не записался:", error.message);
    return NextResponse.json(
      { error: "Couldn't post your comment. Try again in a moment." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

async function remove(userId: string, payload: Body): Promise<NextResponse> {
  const commentId = typeof payload.commentId === "string" ? payload.commentId : "";
  if (!commentId) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // ⚠️ Решение «кто удалил» остаётся В БАЗЕ, и это важнее, чем кажется.
  // Право удалить есть у троих (написавший, автор карты, площадка), и
  // метку deleted_by ставит функция сама — иначе автор карты пометил бы
  // чужое удаление как «передумал сам». Перенести этот разбор в
  // TypeScript значило бы завести второе место, знающее правило.
  //
  // Функция новая — soft_delete_comment_for: та же логика, но человек
  // приходит аргументом, а не из auth.uid(), которого у служебного
  // ключа нет. Старая жива для админки и больше не звана из браузера.
  const { error } = await getSupabaseAdmin().rpc("soft_delete_comment_for", {
    p_comment_id: commentId,
    p_actor: userId,
  });

  if (error) {
    const message = error.message ?? "";
    // Оба исхода намеренно выглядят одинаково: сообщать постороннему,
    // что комментарий существует, незачем.
    if (message.includes("comment_not_found") || message.includes("comment_forbidden")) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    console.error("Шлюз комментариев: не удалился:", message);
    return NextResponse.json(
      { error: "Couldn't delete the comment. Try again in a moment." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
