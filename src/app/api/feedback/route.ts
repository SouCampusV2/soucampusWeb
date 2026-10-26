import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasPurchased } from "@/lib/purchases";
import { checkReviewBody, isValidStars } from "@/lib/map-review-shape";

// ============================================================
// Шлюз записи, путь №12: оценка звёздами и реакция (2026-09-21).
//
// Две записи в одном обработчике, потому что это одно и то же по
// природе: короткий отклик на карту от вошедшего человека. Разводить их
// по двум роутам значило бы дважды написать auth, лимит и разбор
// ошибки — ровно то, что § 5.4 называет «один шаблон и семь
// применений».
//
// ------------------------------------------------------------
// Кто что может, и почему по-разному
// ------------------------------------------------------------
//   оценка   — только купивший (политика «insert own rating if bought»
//              звала has_purchased). Оценка — суждение о карте, и его
//              вес держится ровно на том, что ставит его игравший.
//   реакция  — любой вошедший. Реакция значит «понравилось, как
//              выглядит», и происходит ДО покупки; требовать покупку
//              значило бы убрать её со страницы для всех, кто ещё
//              выбирает.
//
// ⚠️ Лимит реакции (30/час) ДО 21.09 жил триггером в базе и после
// переезда на служебный ключ перестал бы срабатывать молча — тот же
// разбор, что в шапке /api/comments. Число перенесено дословно.
// У оценки лимита не было вовсе: её держала только проверка покупки.
// ============================================================

export const dynamic = "force-dynamic";

type Body = {
  action?: "rate" | "react";
  productId?: string;
  stars?: number;
  /** Текст отзыва — обязателен с 26.10 (20261026130000). */
  body?: string;
  /** true — поставить реакцию, false — снять. */
  on?: boolean;
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
  const productId =
    typeof payload.productId === "string" ? payload.productId : "";
  if (!productId) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (payload.action === "rate") return rate(user.id, user.email, productId, payload);
  if (payload.action === "react") return react(user.id, productId, payload);
  return NextResponse.json({ error: "bad request" }, { status: 400 });
}

async function rate(
  userId: string,
  email: string | undefined,
  productId: string,
  payload: Body
): Promise<NextResponse> {
  // Половинки звезды — законны (20260811130000); до 26.10 здесь
  // пускались только целые, и 4.5 из интерфейса молча откатывалась.
  const stars = payload.stars;
  if (!isValidStars(stars)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Текст обязателен (решение владельца 26.10): оценка без слов не
  // объясняет ни автору, ни следующему покупателю, за что она. Настоящий
  // запрет — product_ratings_body_check в базе; здесь — внятный текст
  // отказа до похода в базу.
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const bodyProblem = checkReviewBody(body);
  if (bodyProblem) {
    return NextResponse.json({ error: bodyProblem }, { status: 400 });
  }

  if (!(await hasPurchased(productId, userId, email))) {
    return NextResponse.json(
      { error: "Only buyers can rate a map." },
      { status: 403 }
    );
  }

  const limited = await enforceRateLimit("rating", userId);
  if (limited) return limited;

  // Одна оценка на пару (карта, человек) — держит уникальный индекс, а
  // не проверка здесь: два одновременных запроса прошли бы её оба.
  const { error } = await getSupabaseAdmin().from("product_ratings").upsert(
    {
      product_id: productId,
      user_id: userId,
      stars,
      body,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "product_id,user_id" }
  );

  if (error) {
    console.error("Шлюз оценок: не записалась:", error.message);
    return NextResponse.json(
      { error: "Couldn't save your review. Try again in a moment." },
      { status: 500 }
    );
  }

  await revalidateReviewPages(productId);
  return NextResponse.json({ ok: true });
}

/**
 * Отзыв виден под картой и на профиле её автора — обе страницы собраны
 * заранее (revalidate = 60), и без сброса новый отзыв появлялся бы через
 * минуту. revalidatePath принимает НАСТОЯЩИЙ маршрут профиля — /u/<имя>,
 * а не /@<имя> (rewrite; разбор в CLAUDE.md, 21.08).
 */
async function revalidateReviewPages(productId: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { data: product } = await db
    .from("products")
    .select("slug, creator_id")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return;
  revalidatePath(`/marketplace/${product.slug}`);

  const { data: creator } = await db
    .from("public_profiles")
    .select("username_lower")
    .eq("id", product.creator_id)
    .maybeSingle();
  if (creator?.username_lower) revalidatePath(`/u/${creator.username_lower}`);
}

async function react(
  userId: string,
  productId: string,
  payload: Body
): Promise<NextResponse> {
  const on = payload.on === true;
  const db = getSupabaseAdmin();

  // ⚠️ Счёт тратит только ПОСТАНОВКА реакции — снятие бесплатно, ровно
  // как было в базе. Значит переключение «нажал–снял» лимитом
  // по-прежнему не ловится; разбор — в самой миграции 20260822130000.
  // Здесь поведение не меняется намеренно: переезд на шлюз не повод
  // молча ужесточить правило.
  if (on) {
    const limited = await enforceRateLimit("reaction", userId);
    if (limited) return limited;

    const { error } = await db
      .from("product_reactions")
      .insert({ product_id: productId, user_id: userId });
    // Повторное нажатие — не ошибка: уникальный индекс отказал, потому
    // что реакция уже стоит, а именно этого человек и хотел.
    if (error && !error.message.includes("duplicate")) {
      console.error("Шлюз реакций: не записалась:", error.message);
      return NextResponse.json(
        { error: "Couldn't save your reaction." },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  const { error } = await db
    .from("product_reactions")
    .delete()
    .eq("product_id", productId)
    .eq("user_id", userId);

  if (error) {
    console.error("Шлюз реакций: не снялась:", error.message);
    return NextResponse.json(
      { error: "Couldn't remove your reaction." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
