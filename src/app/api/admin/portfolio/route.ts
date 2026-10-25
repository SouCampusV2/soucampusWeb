import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkProjectInput, type ProjectInput } from "@/lib/portfolio-input";

// Работы портфолио из админки: создать, изменить, удалить (2026-10-25).
//
// В таблице projects нет ни одной политики на запись — пишет только
// служебный ключ, то есть только этот обработчик. Так было и раньше
// (работы заводились руками в Table Editor), просто теперь у записи
// появился свой код с проверкой полей.
export const dynamic = "force-dynamic";

type Body =
  | { action: "create"; project: ProjectInput }
  | { action: "update"; originalSlug: string; project: ProjectInput }
  | { action: "delete"; slug: string };

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    // 404, а не 403: существование админки не подтверждаем постороннему.
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Лимит — после прав и до работы (правило 23.08). Счёт общий с
  // остальными действиями админки.
  const limited = await enforceRateLimit("admin-action", admin.id);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  if (body.action === "delete") {
    if (typeof body.slug !== "string" || !body.slug) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
    // Фото галереи уходят сами — on delete cascade у project_images.
    // Файлы в бакете остаются: их немного, а сироту без ссылки никто не
    // увидит.
    const { error } = await db.from("projects").delete().eq("slug", body.slug);
    if (error) {
      console.error("Портфолио: не удалилось:", error.message);
      return NextResponse.json({ error: "Couldn't delete the work." }, { status: 500 });
    }
    revalidate([body.slug]);
    return NextResponse.json({ ok: true });
  }

  if (body.action !== "create" && body.action !== "update") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const input = body.project;
  const problem =
    input && typeof input === "object"
      ? checkProjectInput(input, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
      : "bad request";
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const row = {
    slug: input.slug,
    title: input.title.trim(),
    tag: input.tag.trim(),
    summary: input.summary.trim(),
    description: input.description.trim(),
    image_url: input.image,
    price_label: input.priceLabel.trim(),
    price_amount: input.priceAmount,
    size_label: input.sizeLabel.trim(),
    size_x: input.sizeX,
    size_z: input.sizeZ,
    deadline_label: input.deadlineLabel.trim(),
    is_featured: input.isFeatured,
    listing_url: input.listingUrl,
    // Флаг без ссылки ничего не значит — не храним то, чего не покажем.
    listing_is_free: input.listingUrl !== null && input.listingIsFree,
  };

  let projectId: string;

  if (body.action === "create") {
    // Порядок не указан — в конец списка: новая работа не должна молча
    // встать первой и сдвинуть всё портфолио.
    let sortOrder = input.sortOrder;
    if (sortOrder === null) {
      const { data: last } = await db
        .from("projects")
        .select("sort_order")
        .order("sort_order", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      sortOrder = (last?.sort_order ?? 0) + 1;
    }

    const { data, error } = await db
      .from("projects")
      .insert({ ...row, sort_order: sortOrder })
      .select("id")
      .single();
    if (error || !data) return saveFailed(error?.code, error?.message);
    projectId = data.id;
  } else {
    if (typeof body.originalSlug !== "string" || !body.originalSlug) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
    const { data, error } = await db
      .from("projects")
      .update({ ...row, sort_order: input.sortOrder })
      .eq("slug", body.originalSlug)
      .select("id")
      .maybeSingle();
    if (error) return saveFailed(error.code, error.message);
    if (!data) {
      return NextResponse.json({ error: "That work no longer exists." }, { status: 404 });
    }
    projectId = data.id;
  }

  // Галерея: сначала новые строки, потом снимаем старые. В обратном
  // порядке сбой вставки оставил бы работу без галереи вовсе; так худшее
  // — дубли кадров до следующего сохранения.
  const { data: oldImages } = await db
    .from("project_images")
    .select("id")
    .eq("project_id", projectId);

  if (input.gallery.length > 0) {
    const { error } = await db.from("project_images").insert(
      input.gallery.map((url, position) => ({ project_id: projectId, url, position }))
    );
    if (error) {
      console.error("Портфолио: галерея не записалась:", error.message);
      return NextResponse.json(
        { error: "The work was saved, but the gallery wasn't. Save again." },
        { status: 500 }
      );
    }
  }
  const oldIds = (oldImages ?? []).map((image) => image.id);
  if (oldIds.length > 0) {
    await db.from("project_images").delete().in("id", oldIds);
  }

  revalidate(
    body.action === "update" && body.originalSlug !== input.slug
      ? [input.slug, body.originalSlug]
      : [input.slug]
  );
  return NextResponse.json({ ok: true, slug: input.slug });
}

/** Отказ записи — человеку понятный текст, в лог настоящий. */
function saveFailed(code: string | undefined, message: string | undefined) {
  if (code === "23505") {
    return NextResponse.json(
      { error: "Another work already uses this address. Pick a different one." },
      { status: 409 }
    );
  }
  console.error("Портфолио: не сохранилось:", message);
  return NextResponse.json({ error: "Couldn't save the work." }, { status: 500 });
}

/**
 * Работы видны на главной (RecentProjects), в каталоге, на своей
 * странице и в карте сайта. Все они — статика с revalidate, и без сброса
 * правка появилась бы только через минуту.
 */
function revalidate(slugs: string[]) {
  revalidatePath("/");
  revalidatePath("/portfolio");
  revalidatePath("/sitemap.xml");
  for (const slug of slugs) revalidatePath(`/portfolio/${slug}`);
}
