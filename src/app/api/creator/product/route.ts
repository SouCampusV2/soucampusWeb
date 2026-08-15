import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { notify } from "@/lib/notifications";

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

// Почему кнопка не сработала — по состоянию карты.
//
// Текст на каждое состояние свой: «нельзя» без причины читается как
// поломка сайта, особенно когда человек жмёт по видимой строке в
// собственном списке. Прятать тут нечего — это его карта, он на неё и
// смотрит.
const HIDE_ERRORS: Record<string, string> = {
  pending: "This map is waiting to be reviewed. You can take it off the marketplace once it is approved.",
  rejected: "This map has not been approved yet, so it is not on the marketplace.",
  suspended:
    "This map was taken off the marketplace by the site team. Edit it and it goes back for review — the reason is on the map.",
  deleted:
    "This map was removed by the site team, so it can't be changed from here.",
};

const FALLBACK_HIDE_ERROR = "This map can't be changed right now.";

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
    .select("id, title, state, creator_id")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    // Подробность отдаём владельцу КАРТЫ (владение проверено ниже по
    // creator_id, а до того запрос и не дошёл бы): это его строка, и
    // «read failed» ни о чём ему не говорит — как не сказало и нам.
    console.error("Управление картой: чтение не удалось:", error.message);
    return NextResponse.json(
      { error: `read failed: ${error.message}` },
      { status: 500 }
    );
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
  if (product.state === "deleted") {
    return NextResponse.json(
      {
        error:
          "This map was removed by the site team, so it can't be changed from here. The reason is on the map — reply to it through support if you think it's a mistake.",
      },
      { status: 403 }
    );
  }

  if (action === "hide" || action === "unhide") {
    // Вот ради чего заводилась колонка state (миграция 20260815130000).
    //
    // Раньше здесь стояли две проверки по трём полям: «карта прошла
    // разбор» по status и «спрятал её автор, а не площадка» по hidden_by,
    // со списком разрешённых значений и оговоркой про null. Ошибиться в
    // такой проверке легко, что и произошло: восстановленная из
    // удалённых карта не подходила ни под одно разрешённое значение и
    // застревала навсегда.
    //
    // Теперь вопрос ровно один — в каком состоянии карта. Спрятать можно
    // живую, вернуть можно спрятанную, и всё. Снятую площадкой автор не
    // вернёт не потому, что мы это здесь запрещаем, а потому что
    // перехода suspended → live у него нет: его не пропустит база.
    const allowed = action === "hide" ? "live" : "hidden";
    if (product.state !== allowed) {
      return NextResponse.json(
        { error: HIDE_ERRORS[product.state as string] ?? FALLBACK_HIDE_ERROR },
        { status: 409 }
      );
    }

    const { error: updateError } = await db
      .from("products")
      .update({ state: action === "hide" ? "hidden" : "live" })
      .eq("id", productId);

    if (updateError) {
      console.error("Управление картой: update не удался:", updateError.message);
      return NextResponse.json(
        { error: `update failed: ${updateError.message}` },
        { status: 500 }
      );
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

  // Удаление автором тоже МЯГКОЕ (замечание владельца 2026-08-15).
  //
  // Раньше здесь сносилась строка вместе с галереей. Разница с удалением
  // модератором была случайной — просто писалось раньше и другим кодом,
  // — а последствия у неё серьёзные: карту, которую заметили, автор мог
  // стереть одним кликом, и в moderation_log осталась бы ссылка в
  // никуда. Спор после этого разбирать не по чему.
  //
  // Теперь у обоих один переход, а различает их deleted_by (миграция
  // 20260815150000): у автора это «передумал», у площадки «нарушение».
  // Карта остаётся в каталоге админки в разделе удалённых, откуда её
  // можно вернуть.
  const { error: deleteError } = await db
    .from("products")
    .update({ state: "deleted", deleted_by: "creator" })
    .eq("id", productId);

  if (deleteError) {
    console.error("Управление картой: delete не удался:", deleteError.message);
    return NextResponse.json(
      { error: `delete failed: ${deleteError.message}` },
      { status: 500 }
    );
  }

  // Уведомление самому себе — и это не описка (просьба владельца
  // 2026-08-15).
  //
  // Обычно про свои же действия человеку не пишут: он и так знает, что
  // сделал. Здесь другое. Удаление выглядит окончательным, а на деле
  // мягкое, и без этого письма автор просто не узнает, что карту можно
  // вернуть, — а спросит он, скорее всего, тогда, когда уже пожалеет.
  // Уведомление и есть то место, где эта возможность записана, вместе с
  // адресом, по которому просить.
  //
  // Полноценной «заявки на восстановление» пока нет: очередь заявок,
  // сроки хранения и решение по каждой — отдельная работа, а до тех пор
  // честнее отправить в поддержку, чем нарисовать кнопку, за которой
  // ничего не стоит. Заведено в docs/IDEAS.md.
  await notify(user.id, {
    kind: "map_deleted",
    title: `You deleted “${product.title}”`,
    body: "It is off the marketplace and out of your resources. The file is still kept — write to support if you need it back.",
    href: "/support",
  });

  // Файл и скриншоты НЕ трогаем: строка жива и продолжает на них
  // ссылаться, а уборка (/api/creator/cleanup-storage) собирает только
  // то, на что не ссылается ничто. Отдельного кода не нужно — ровно
  // ради этого она и написана как «что не используется», а не «удали
  // вот этот путь».
  return NextResponse.json({ ok: true, deleted: true });
}
