import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Удаление комментария площадкой.
//
// ПОЧЕМУ ЧЕРЕЗ СВОЙ РОУТ, А НЕ ИЗ БРАУЗЕРА, КАК У АВТОРА. Автор и
// написавший ходят в soft_delete_comment — та функция сама решает, кто
// зовёт, по auth.uid(). Площадка в этот механизм не помещается: «владелец
// сайта» — это не отношение к строке, а роль, и знает о ней только наш
// сервер (getAdminUser проверяет is_admin). Поэтому удаление из админки
// идёт служебным ключом, минуя RLS.
//
// Гейт стоит здесь, а не только в layout админки: layout прячет страницу,
// а этот адрес доступен напрямую. Постороннему отвечаем 404, а не 403 —
// существование раздела не наше дело ему сообщать (тот же приём, что у
// остальных /api/admin/*).

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

  const { commentId } = body as { commentId?: unknown };
  if (typeof commentId !== "string" || commentId.length === 0) {
    return NextResponse.json({ error: "bad comment" }, { status: 400 });
  }

  // Удаление мягкое, как и у всех остальных: строка остаётся, текст
  // перестаёт отдаваться. deleted_by = 'moderator' — чтобы под картой
  // было видно «removed», а не «автор передумал».
  //
  // Условие deleted_by is null не декоративное: без него повторное
  // нажатие переписывало бы дату и подменяло того, кто удалил первым.
  const { error } = await getSupabaseAdmin()
    .from("product_comments")
    .update({ deleted_by: "moderator", deleted_at: new Date().toISOString() })
    .eq("id", commentId)
    .is("deleted_by", null);

  if (error) {
    // Наружу — без текста ошибки базы: он рассказывает о схеме.
    console.warn(`Не удалось удалить комментарий: ${error.message}`);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
