import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Автор распоряжается своей картой: спрятать с витрины, вернуть обратно,
// удалить совсем.
//
// Почему через сервер, а не запросом из браузера: RLS разрешает креатору
// править свою строку, но триггер guard_product_publication (миграция
// 20260730160000) откатывает любую его попытку тронуть is_published и
// status — иначе автор публиковал бы себя сам, минуя очередь. Триггер
// пропускает только служебную роль, поэтому «спрятать» обязано идти
// отсюда, а право на действие подтверждается сессией.
//
// Delete тоже здесь и по той же причине: DELETE-политики у products нет
// и заводить её не хочется — удаление слишком дорогая ошибка, чтобы
// разрешать её одним запросом из консоли браузера.
export const dynamic = "force-dynamic";

type Action = "hide" | "unhide" | "delete";

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    productId?: string;
    action?: Action;
    confirmTitle?: string;
  };
  const { productId, action, confirmTitle } = body;

  if (!productId || !action || !["hide", "unhide", "delete"].includes(action)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Без статуса креатора картами не распоряжаются вовсе (решение
  // владельца 2026-08-14). Отзыв статуса — это не только «больше не
  // загружай»: пока доступ закрыт, человек не прячет, не возвращает и не
  // удаляет уже выложенное. Иначе снятые вместе со статусом карты он бы
  // тут же удалил — вместе с историей, по которой разбирают спор.
  //
  // Проверка служебным ключом: profiles закрыта RLS, и читать её от лица
  // пользователя ради одного флага незачем.
  const { data: profile } = await db
    .from("profiles")
    .select("is_creator")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_creator) {
    return NextResponse.json(
      {
        error:
          "Your creator access is closed, so maps can't be changed from here. The reason is on your resources page.",
      },
      { status: 403 }
    );
  }

  const { data: product, error } = await db
    .from("products")
    .select("id, title, status, is_published, creator_id, hidden_by, deleted_at")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    console.error("Управление картой: чтение не удалось:", error.message);
    return NextResponse.json({ error: "read failed" }, { status: 500 });
  }

  // 404, а не 403: посторонний не должен по коду ответа узнавать даже
  // того, что карта с таким id существует (тот же принцип, что у
  // /admin/moderation).
  if (!product || product.creator_id !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Удалённая карта не управляется ничем: вернуть её может только
  // владелец сайта через каталог админки.
  //
  // Отвечаем ВНЯТНО, а не «not found». Скрывать тут нечего: карта висит в
  // собственном списке автора, он на неё и смотрит, — и «not found» в
  // ответ на клик по видимой строке читается как поломка сайта, а не как
  // решение модерации. Прятать существование имеет смысл от постороннего
  // (проверка владения выше), а не от хозяина карты.
  if (product.deleted_at) {
    return NextResponse.json(
      {
        error:
          "This map was removed by the site team, so it can't be changed from here. The reason is on the map — reply to it through support if you think it's a mistake.",
      },
      { status: 403 }
    );
  }

  if (action === "hide" || action === "unhide") {
    // Прятать и возвращать имеет смысл только у карты, ПРОШЕДШЕЙ разбор.
    // У заявки в очереди витрины и так нет, и «вернуть» её значило бы
    // опубликовать без модерации — ровно то, что запрещает триггер.
    if (product.status !== "published") {
      return NextResponse.json(
        { error: "Only an approved map can be hidden or brought back." },
        { status: 409 }
      );
    }

    // Вернуть автор может ТОЛЬКО то, что спрятал сам, — иначе бан
    // отменялся бы одной кнопкой в его же кабинете, и снятие с витрины не
    // значило бы ничего. Разница ровно в hidden_by (миграции 20260809120000
    // и 20260814120000).
    //
    // Условие «не creator», а не «moderator»: значений теперь три, и
    // перечислять запрещённые — способ однажды забыть новое. Разрешаем
    // единственное, про которое точно известно, что его поставил автор.
    if (action === "unhide" && product.hidden_by !== "creator") {
      return NextResponse.json(
        {
          error:
            "This map was taken off the marketplace by the site team, so it can't be brought back from here. Check the reason on the map and reply to it.",
        },
        { status: 403 }
      );
    }

    const { error: updateError } = await db
      .from("products")
      .update({
        is_published: action === "unhide",
        // Помечаем, что скрыл автор: без этого его собственное «спрятать»
        // было бы неотличимо от бана, и вернуть карту он бы уже не смог.
        hidden_by: action === "hide" ? "creator" : null,
      })
      .eq("id", productId);

    if (updateError) {
      console.error("Управление картой: update не удался:", updateError.message);
      return NextResponse.json({ error: "update failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  // --- Удаление ---

  // Название вводится руками и сверяется ЗДЕСЬ, а не только в форме:
  // проверка в браузере защищает от случайного клика, серверная — от
  // запроса мимо формы. Сравниваем без учёта регистра и краевых
  // пробелов: смысл подтверждения в осознанности, а не в диктанте.
  if ((confirmTitle ?? "").trim().toLowerCase() !== product.title.toLowerCase()) {
    return NextResponse.json(
      { error: "Type the map title exactly to confirm." },
      { status: 400 }
    );
  }

  // Купленную карту не удаляем НИКОГДА. Покупатель скачивает файл по
  // подписанной ссылке, которая строится из products.file_path — снеся
  // строку, мы отняли бы у него оплаченное. Автору вместо этого
  // предлагаем спрятать: с витрины уходит, покупки живут.
  const { count: soldCount, error: soldError } = await db
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if (soldError) {
    console.error("Управление картой: проверка продаж не удалась:", soldError.message);
    return NextResponse.json({ error: "read failed" }, { status: 500 });
  }

  if ((soldCount ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          "This map has been bought — it can't be deleted, because buyers keep access to what they paid for. Hide it instead.",
        canHideInstead: true,
      },
      { status: 409 }
    );
  }

  // Галерея — отдельной таблицей; сносим её первой, чтобы не зависеть от
  // того, настроен ли каскад по внешнему ключу.
  await db.from("product_images").delete().eq("product_id", productId);

  const { error: deleteError } = await db.from("products").delete().eq("id", productId);

  if (deleteError) {
    console.error("Управление картой: delete не удался:", deleteError.message);
    return NextResponse.json({ error: "delete failed" }, { status: 500 });
  }

  // Файлы в Storage подчистит существующая уборка (/api/creator/cleanup-storage):
  // после удаления строк на эти объекты не ссылается ничто, и она
  // соберёт их как обычный мусор. Отдельного кода здесь не нужно —
  // именно ради этого уборка написана как «что не используется», а не
  // «удали вот этот путь».
  return NextResponse.json({ ok: true, deleted: true });
}
