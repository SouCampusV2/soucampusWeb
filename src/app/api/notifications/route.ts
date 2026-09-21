import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// ============================================================
// Шлюз записи, путь №13: свои уведомления (2026-09-21).
//
// Самый безобидный путь из тринадцати — человек правит собственные
// строки, и худшее, что он может сделать, это лишние записи в свой же
// почтовый ящик. Политики «mark own notifications read» и «delete own
// notifications» выражали правило целиком, так что по правилу шага 5
// (ARCHITECTURE.md § 5.4) этот путь МОГ остаться на прямой записи
// навсегда, и это не было бы недоделкой.
//
// Переехал он по решению владельца 21.09: на прямой записи остаётся
// ноль путей, и тогда «в браузере записи нет» становится свойством
// сайта, которое проверяется одним запросом к pg_policies, а не
// списком исключений, который надо помнить.
//
// ------------------------------------------------------------
// ⚠️ Здесь КАЖДЫЙ id проверяется на принадлежность
// ------------------------------------------------------------
// Раньше «только свои строки» говорила RLS, и клиент мог присылать
// какие угодно id — лишние просто не попадали под политику. Служебный
// ключ политик не спрашивает, поэтому запросы ниже фильтруют по
// user_id САМИ. Забыть это условие значит отдать чужой ящик: отметить
// прочитанным и удалить что угодно, зная только id.
// ============================================================

export const dynamic = "force-dynamic";

/** Сколько строк принимаем за раз: «Clear all» шлёт весь экран. */
const MAX_IDS = 200;

type Body = {
  action?: "read" | "delete";
  ids?: unknown;
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
  const action = payload.action;
  if (action !== "read" && action !== "delete") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const ids = Array.isArray(payload.ids)
    ? payload.ids.filter((id): id is string => typeof id === "string")
    : [];
  if (ids.length === 0 || ids.length > MAX_IDS) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const limited = await enforceRateLimit("notifications", user.id);
  if (limited) return limited;

  const db = getSupabaseAdmin();
  // .eq("user_id", …) — та самая строка, которую раньше писала за нас
  // RLS. См. шапку файла.
  const { error } =
    action === "read"
      ? await db
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .in("id", ids)
          .eq("user_id", user.id)
      : await db
          .from("notifications")
          .delete()
          .in("id", ids)
          .eq("user_id", user.id);

  if (error) {
    console.error("Шлюз уведомлений:", error.message);
    return NextResponse.json({ error: "notifications unavailable" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
