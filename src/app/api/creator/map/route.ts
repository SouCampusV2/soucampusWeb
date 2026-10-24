import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PRODUCT_FILES_BUCKET } from "@/lib/orders";
import { createProduct, specsToColumns } from "@/lib/products";
import type { ProductState } from "@/lib/products";
import {
  checkMapSubmission,
  outcomeOfAuthorEdit,
  type MapSubmission,
} from "@/lib/map-submission";
import { templateFor } from "@/lib/rejection";

// ============================================================
// Шлюз записи, путь №2: создание и правка карты (2026-09-13).
//
// Продолжение пути №1 (файл карты, /api/creator/upload) и вторая из
// тринадцати записей, уехавших из браузера на свой обработчик. Разбор
// плана — docs/ARCHITECTURE.md § 5.4, шаг 3.
//
// ------------------------------------------------------------
// Что стерегло этот путь до сегодня
// ------------------------------------------------------------
// Форма звала supabase.from("products").insert(...) и .update(...)
// прямо из браузера, а запретами служили RLS-политика и два триггера:
//
//   creators insert own products  — свой creator_id, is_creator И пауза
//                                   после тяжёлого отказа;
//   creators update own products  — правь свою строку;
//   guard_product_insert          — новая карта всегда pending;
//   guard_product_author_edit     — что делает правка с состоянием.
//
// Работало это честно. Не хватало ровно того, чего база знать не может:
// что цена €25.00, а не €2500 по опечатке; что обложка лежит в НАШЕМ
// бакете, а не на чужом сервере, собирающем IP каждого посетителя
// витрины; что файл, на который ссылается карта, вообще существует и
// принадлежит этому автору.
//
// ------------------------------------------------------------
// ⚠️ ГЛАВНОЕ ПОСЛЕДСТВИЕ ПЕРЕЕЗДА, которое легко не заметить
// ------------------------------------------------------------
// Обработчик пишет СЛУЖЕБНЫМ КЛЮЧОМ, а оба триггера первой строкой
// проверяют auth.role() = 'authenticated' и для служебной роли
// возвращают строку как есть. То есть, переехав сюда, мы вышли
// из-под машины состояний — и обязаны воспроизвести её сами:
//
//   - при создании state/submission_kind/вердикт назначаются явно
//     (см. createProduct в products.ts);
//   - при правке решение принимает outcomeOfAuthorEdit(), повторяющая
//     guard_product_author_edit слово в слово и покрытая тестами.
//
// Триггеры при этом НЕ удаляются: они остаются вторым рубежом на случай
// бага здесь (ARCHITECTURE.md § 5.4, шаг 5).
//
// И вторая половина того же: снятая политика уносит с собой ВСЁ, что
// она говорила, а не только «чей это creator_id». Политика вставки
// говорила три вещи, и третья — пауза submissions_blocked_until после
// тяжёлого отказа. Не перенеси мы её сюда руками, отказ снова перестал
// бы что-либо стоить, и заметить это было бы нечем.
// ============================================================

export const dynamic = "force-dynamic";

type Action = "create" | "update";

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: Action;
    productId?: string;
    map?: MapSubmission;
  };
  const action = body.action;
  if (action !== "create" && action !== "update") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Право на карты держит is_creator, а не is_admin — так решала снятая
  // политика, и переезд формы в админку 28.08 этого не менял. Читаем
  // служебным ключом: profiles закрыта RLS, ходить туда от лица
  // пользователя ради двух полей незачем.
  const { data: profile } = await db
    .from("profiles")
    .select("is_creator, submissions_blocked_until")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_creator) {
    return NextResponse.json(
      {
        error:
          "Your creator access is closed, so maps can't be saved from here. The reason is on your resources page.",
      },
      { status: 403 }
    );
  }

  // Лимит — после прав и до работы (см. rate-limit.ts).
  const limited = await enforceRateLimit("creator-map", user.id);
  if (limited) return limited;

  const map = body.map;
  if (!map || typeof map !== "object") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const problem = checkMapSubmission(
    map,
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  );
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  return action === "create"
    ? create(user.id, map, profile.submissions_blocked_until as string | null)
    : update(user.id, body.productId, map);
}

// ------------------------------------------------------------
// Файл карты
// ------------------------------------------------------------

/**
 * Существует ли объект и его ли это папка. Возвращает размер или null.
 *
 * ⚠️ Обе половины важны. Проверка папки — потому что путь приходит от
 * клиента, и без неё автор сослался бы на чужой файл, зная только его
 * ключ: его карта раздавала бы чужую работу. Проверка существования —
 * потому что confirm из пути №1 мог и не случиться, а карта со ссылкой
 * в пустоту доходит до покупателя и ломается ровно в момент скачивания,
 * то есть после оплаты.
 */
async function sizeOfOwnFile(userId: string, path: string): Promise<number | null> {
  if (!path.startsWith(`${userId}/`) || path.includes("..")) return null;
  const { data, error } = await getSupabaseAdmin()
    .storage.from(PRODUCT_FILES_BUCKET)
    .info(path);
  if (error || !data) return null;
  return typeof data.size === "number" ? data.size : null;
}

// ------------------------------------------------------------
// create — новая карта
// ------------------------------------------------------------

async function create(
  userId: string,
  map: MapSubmission,
  blockedUntil: string | null
): Promise<NextResponse> {
  // Пауза после тяжёлого отказа. Раньше её держала RLS-политика вставки,
  // и вместе с политикой она бы исчезла — см. шапку файла.
  if (blockedUntil && new Date(blockedUntil) > new Date()) {
    return NextResponse.json(
      {
        error:
          "You can't submit a new map right now — the pause after the last review is still on. The date is on your resources page.",
      },
      { status: 403 }
    );
  }

  if (!map.filePath) {
    return NextResponse.json({ error: "Attach the map file." }, { status: 400 });
  }

  // Вес берём у Storage, а не со слов клиента: спрошенное число
  // разъедется с реальностью при первой же замене файла, а показывается
  // оно покупателю на странице карты.
  const size = await sizeOfOwnFile(userId, map.filePath);
  if (size === null) {
    return NextResponse.json(
      { error: "The map file didn't arrive. Attach it again." },
      { status: 400 }
    );
  }

  try {
    const { slug } = await createProduct(getSupabaseAdmin(), {
      creatorId: userId,
      title: map.title.trim(),
      summary: map.summary.trim(),
      description: map.description,
      imageUrl: map.coverUrl,
      priceCents: map.priceCents,
      category: map.category as Exclude<MapSubmission["category"], "free">,
      filePath: map.filePath,
      specs: map.specs,
      fileSizeBytes: size,
      reactionOptionId: map.reactionOptionId,
      galleryUrls: map.galleryUrls,
    });
    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    // Наружу тихо, внутрь громко: сообщения PostgREST рассказывают про
    // колонки, ограничения и политики, а на другом конце любой креатор.
    console.error("Шлюз карты: создание не удалось:", err);
    return NextResponse.json(
      { error: "Couldn't save the map. Try again in a moment." },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// update — правка своей карты
// ------------------------------------------------------------

async function update(
  userId: string,
  productId: string | undefined,
  map: MapSubmission
): Promise<NextResponse> {
  if (!productId) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: product, error } = await db
    .from("products")
    .select("id, slug, state, creator_id, file_path, rejection_flags, image_url")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    console.error("Шлюз карты: чтение не удалось:", error.message);
    return NextResponse.json({ error: "read failed" }, { status: 500 });
  }
  // 404, а не 403: посторонний не должен по коду ответа узнавать даже
  // того, что карта с таким id существует (тот же принцип, что в
  // /api/creator/product и /admin/moderation).
  if (!product || product.creator_id !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Удалённая карта не правится ничем: вернуть её может только владелец
  // сайта через каталог админки. Отвечаем внятно, а не «not found» —
  // карта висит в собственном списке автора, и молчание читалось бы как
  // поломка сайта.
  if (product.state === "deleted") {
    return NextResponse.json(
      {
        error:
          "This map was removed, so it can't be edited. Write to support if you think it's a mistake.",
      },
      { status: 403 }
    );
  }

  // Новый файл — только если прислали путь, и только если он другой.
  let fileSizeBytes: number | null = null;
  const fileChanged = Boolean(map.filePath && map.filePath !== product.file_path);
  if (map.filePath && fileChanged) {
    fileSizeBytes = await sizeOfOwnFile(userId, map.filePath);
    if (fileSizeBytes === null) {
      return NextResponse.json(
        { error: "The map file didn't arrive. Attach it again." },
        { status: 400 }
      );
    }
  }

  const previousGallery = await readGallery(productId);
  const imagesChanged = hasNewImage(map, product.image_url as string, previousGallery);

  // Требования из отказа — те же, что проверяет форма перед отправкой.
  //
  // ⚠️ Проверка в браузере защищает от невнимательности, серверная — от
  // запроса мимо формы; без второй отказ «перезалей файл» закрывается
  // нажатием Save. Проверяем только проверяемое по факту: «перепиши
  // описание» так не проверить, и притворяться, что можно, мы не будем
  // (см. requiresChange в lib/rejection.ts).
  if (product.state === "rejected") {
    for (const flag of (product.rejection_flags as string[] | null) ?? []) {
      const requirement = templateFor(flag)?.requiresChange;
      if (requirement === "file" && !fileChanged) {
        return NextResponse.json(
          {
            error:
              "You were asked to re-upload the map file — pick a new file before resubmitting.",
          },
          { status: 409 }
        );
      }
      if (requirement === "images" && !imagesChanged) {
        return NextResponse.json(
          {
            error:
              "You were asked to replace the screenshots — add at least one new image before resubmitting.",
          },
          { status: 409 }
        );
      }
    }
  }

  const patch: Record<string, unknown> = {
    title: map.title.trim(),
    summary: map.summary.trim(),
    description: map.description,
    image_url: map.coverUrl,
    price_cents: map.priceCents,
    price_label: `€${(map.priceCents / 100).toFixed(2)}`,
    category: map.category,
    ...specsToColumns(map.specs),
    reaction_option_id: map.reactionOptionId,
  };
  // Файл и его вес пишем ТОЛЬКО когда файл заменили: иначе правка
  // описания затирала бы верный размер нулём.
  if (fileChanged && map.filePath) {
    patch.file_path = map.filePath;
    patch.file_size_bytes = fileSizeBytes;
  }

  // Состояние — здесь, потому что триггер под служебным ключом молчит
  // (см. шапку файла и outcomeOfAuthorEdit).
  const outcome = outcomeOfAuthorEdit(product.state as ProductState, fileChanged);
  if (outcome) {
    patch.state = outcome.state;
    patch.submission_kind = outcome.submissionKind;
    // Прошлый вердикт стирается: модератор должен смотреть свежую
    // версию, а не заметку к прошлой. Причина СНЯТИЯ (suspension_reason)
    // при этом не трогается — снят ли повод, решает он же.
    patch.rejection_reason = null;
    patch.rejection_flags = [];
  }

  const { error: updateError } = await db
    .from("products")
    .update(patch)
    .eq("id", productId);

  if (updateError) {
    console.error("Шлюз карты: update не удался:", updateError.message);
    return NextResponse.json(
      { error: "Couldn't save the map. Try again in a moment." },
      { status: 500 }
    );
  }

  // Галерея — одним вызовом в транзакции и только если состав или
  // порядок изменились. Оба решения не новые: они стояли в EditMapForm и
  // объяснены в миграции 20260730180000 (delete+insert оставляет окно, в
  // котором у карты ноль картинок) — переезд их сохраняет.
  const galleryUnchanged =
    (product.image_url as string) === map.coverUrl &&
    previousGallery.length === map.galleryUrls.length &&
    previousGallery.every((url, i) => url === map.galleryUrls[i]);

  if (!galleryUnchanged) {
    const { error: galleryError } = await db.rpc("replace_product_images", {
      p_product_id: productId,
      p_urls: map.galleryUrls,
    });
    if (galleryError) {
      console.error("Шлюз карты: галерея не сохранилась:", galleryError.message);
      return NextResponse.json(
        { error: "The map was saved, but the gallery wasn't. Try saving again." },
        { status: 500 }
      );
    }
  }

  // Страница карты — заранее собранная статика с revalidate = 60.
  // Раньше правку было некому сбросить: писал браузер, нашего кода в
  // пути не было. Теперь есть — та же причина, по которой появился
  // revalidateProfile 21.08.
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${product.slug}`);

  return NextResponse.json({ ok: true, slug: product.slug });
}

/** Галерея карты в порядке позиций (без обложки — та в products). */
async function readGallery(productId: string): Promise<string[]> {
  const { data } = await getSupabaseAdmin()
    .from("product_images")
    .select("url, position")
    .eq("product_id", productId)
    .order("position");
  return (data ?? []).map((row) => row.url as string);
}

/**
 * Появилась ли хоть одна картинка, которой раньше не было.
 *
 * Именно «новая», а не «список изменился»: требование из отказа —
 * заменить скриншоты, и перестановка местами его не выполняет.
 */
function hasNewImage(
  map: MapSubmission,
  previousCover: string,
  previousGallery: string[]
): boolean {
  const before = new Set([previousCover, ...previousGallery]);
  return [map.coverUrl, ...map.galleryUrls].some((url) => !before.has(url));
}
