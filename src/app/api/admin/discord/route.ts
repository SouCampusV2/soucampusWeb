import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkReviewInput, type ReviewInput } from "@/lib/discord-inbox";

// Решения по очереди «пришло из Discord» (/admin/discord → Inbox,
// 2026-10-27). Посты витрины — соседний /api/admin/discord/showcase.
//
// discord_inbox закрыта RLS без единой политики: пишет только служебный
// ключ, то есть только этот обработчик и вход бота. Правило шлюза записи
// (CLAUDE.md): новая запись — только через свой обработчик.
//
//   dismiss        — не публиковать: status = 'dismissed';
//   add_review     — строка в reviews + status = 'published';
//   mark_published — черновик работы уже сохранён формой портфолио
//                    (её собственным обработчиком), здесь только отметка.
export const dynamic = "force-dynamic";

type Body =
  | { action: "dismiss"; key: string }
  | { action: "mark_published"; key: string }
  | { action: "add_review"; key: string; review: ReviewInput };

export async function POST(request: Request) {
  const admin = await getAdminUser();
  // 404, а не 403: существование админки постороннему не подтверждаем.
  if (!admin) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Лимит — после прав и до работы (правило 23.08), счёт общий с админкой.
  const limited = await enforceRateLimit("admin-action", admin.id);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || typeof body !== "object" || typeof body.key !== "string" || !body.key) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: item, error: readError } = await db
    .from("discord_inbox")
    .select("key, kind, status")
    .eq("key", body.key)
    .maybeSingle();
  if (readError || !item) return NextResponse.json({ error: "Not found." }, { status: 404 });
  // Решённое не перерешиваем: второй клик по «Add to reviews» из
  // соседней вкладки дал бы второй отзыв.
  if (item.status !== "pending") {
    return NextResponse.json({ error: "Already handled." }, { status: 409 });
  }

  const decide = (status: "published" | "dismissed") =>
    db
      .from("discord_inbox")
      .update({ status, decided_at: new Date().toISOString(), decided_by: admin.id })
      .eq("key", body.key)
      .eq("status", "pending");

  if (body.action === "dismiss" || body.action === "mark_published") {
    if (body.action === "mark_published" && item.kind !== "portfolio_draft") {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
    const { error } = await decide(body.action === "dismiss" ? "dismissed" : "published");
    if (error) {
      console.error("Discord inbox: решение не записалось:", error.message);
      return NextResponse.json({ error: "Couldn't save the decision." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "add_review") {
    if (item.kind !== "review") return NextResponse.json({ error: "bad request" }, { status: 400 });
    const problem = checkReviewInput(body.review);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const review = body.review;
    const { error: insertError } = await db.from("reviews").insert({
      slug: review.slug,
      name: review.name.trim(),
      role: review.role.trim(),
      flag: review.flag.trim(),
      review_text: review.text.trim(),
      accent: review.accent,
      // sort_order не ставим: null уходит в конец списка — новый отзыв
      // встаёт последним, порядок остальных владелец не терял.
    });
    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "A review with this address already exists. Change the address." },
          { status: 409 }
        );
      }
      console.error("Discord inbox: отзыв не записался:", insertError.message);
      return NextResponse.json({ error: "Couldn't add the review." }, { status: 500 });
    }

    // Отзыв уже на сайте — значит, и в очереди он решён. Не записалось
    // решение — не страшно: строку видно, её можно отклонить руками.
    const { error } = await decide("published");
    if (error) console.error("Discord inbox: отметка не записалась:", error.message);

    // Отзывы — на главной (карусель) и своей странице.
    revalidatePath("/");
    revalidatePath(`/reviews/${review.slug}`);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "bad request" }, { status: 400 });
}
