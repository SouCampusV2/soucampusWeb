import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PRODUCT_FILES_BUCKET } from "@/lib/orders";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/products";

// Уборка мусора в своей папке Storage.
//
// Зачем это вообще: при замене файла карты или картинок мы записываем в
// БД новый путь, а СТАРЫЙ объект в бакете не удаляется ничем. Проверено
// на живых данных 2026-07-30 — одна карта после двух правок оставила два
// лишних zip'а по ~3.5 МБ. Растёт линейно с числом правок, в платном
// хранилище, и никак себя не проявляет.
//
// Почему отдельный обработчик, а не удаление из браузера: у бакета
// product-files есть только политика INSERT, DELETE нет — и не должно
// быть, иначе креатор смог бы удалить чужой файл. Уборка идёт служебным
// ключом, а право на неё подтверждается сессией здесь.
//
// Почему «собрать мусор в папке», а не «удалить вот этот путь»: путь
// пришлось бы принимать из браузера и проверять, что он и чужой не
// задевает, и правда никем не используется. Проще и надёжнее ничего не
// принимать вовсе: обработчик сам считает по БД, что используется, и
// удаляет в папке пользователя всё остальное. Заодно это подчищает
// исторический мусор, накопленный до появления этой уборки.
export const dynamic = "force-dynamic";

// Свежие объекты не трогаем: файл мог быть загружен минуту назад формой
// в соседней вкладке, которую ещё не отправили — в БД его пути пока нет,
// и без этой отсрочки уборка снесла бы его прямо из-под человека.
const GRACE_PERIOD_MS = 60 * 60 * 1000; // час

export async function POST() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  // Лимит — после проверки входа и до самой работы: расходовать
  // счёт должен тот, кого мы уже опознали, а работа не должна
  // начинаться, если слота нет.
  const limited = await enforceRateLimit("creator-cleanup", user.id);
  if (limited) return limited;

  const db = getSupabaseAdmin();

  // Что реально используется — считаем по ВСЕМ картам этого креатора,
  // а не по одной: картинка может быть переиспользована в другой его
  // карте, и удалять её из-за правки первой нельзя.
  const { data: products, error } = await db
    .from("products")
    .select("id, image_url, description, file_path")
    .eq("creator_id", user.id);

  if (error) {
    console.error("Уборка Storage: не удалось прочитать товары:", error.message);
    return NextResponse.json({ error: "read failed" }, { status: 500 });
  }

  const productIds = (products ?? []).map((p) => p.id);
  const { data: gallery } = productIds.length
    ? await db.from("product_images").select("url").in("product_id", productIds)
    : { data: [] };

  // Ссылки на картинки живут в трёх местах, и пропустить любое — значит
  // удалить используемый файл:
  //   1. products.image_url — обложка;
  //   2. product_images.url — галерея;
  //   3. ВНУТРИ HTML описания — картинки, вставленные в текст редактором.
  // Третье легко забыть: на такие файлы нет ни одной строки в БД, они
  // упомянуты только в разметке.
  const usedImageUrls = new Set<string>();
  for (const p of products ?? []) {
    if (p.image_url) usedImageUrls.add(p.image_url);
    for (const match of (p.description ?? "").matchAll(/src="([^"]+)"/g)) {
      usedImageUrls.add(match[1]);
    }
  }
  for (const row of gallery ?? []) usedImageUrls.add(row.url);

  const usedFilePaths = new Set(
    (products ?? []).map((p) => p.file_path).filter((path): path is string => Boolean(path))
  );

  const now = Date.now();
  const removed: string[] = [];

  // --- Картинки: публичный бакет, сравниваем по публичному URL ---
  const { data: imageFiles } = await db.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .list(user.id, { limit: 1000 });

  const staleImages: string[] = [];
  for (const file of imageFiles ?? []) {
    const path = `${user.id}/${file.name}`;
    const { data } = db.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
    // Публичная ссылка может нести ?v=… (кэш-бастер аватара) — сравниваем
    // без строки запроса, иначе используемый файл выглядел бы сиротой.
    const bare = data.publicUrl.split("?")[0];
    const isUsed = [...usedImageUrls].some((url) => url.split("?")[0] === bare);
    const age = now - new Date(file.created_at ?? 0).getTime();
    if (!isUsed && age > GRACE_PERIOD_MS) staleImages.push(path);
  }
  if (staleImages.length) {
    await db.storage.from(PRODUCT_IMAGES_BUCKET).remove(staleImages);
    removed.push(...staleImages);
  }

  // --- Файлы карт: приватный бакет, сравниваем по пути ---
  const { data: mapFiles } = await db.storage
    .from(PRODUCT_FILES_BUCKET)
    .list(user.id, { limit: 1000 });

  const staleFiles: string[] = [];
  for (const file of mapFiles ?? []) {
    const path = `${user.id}/${file.name}`;
    const age = now - new Date(file.created_at ?? 0).getTime();
    if (!usedFilePaths.has(path) && age > GRACE_PERIOD_MS) staleFiles.push(path);
  }
  if (staleFiles.length) {
    await db.storage.from(PRODUCT_FILES_BUCKET).remove(staleFiles);
    removed.push(...staleFiles);
  }

  return NextResponse.json({ ok: true, removed: removed.length, paths: removed });
}
