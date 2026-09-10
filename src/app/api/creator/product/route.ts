import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { notify } from "@/lib/notifications";

// Автор распоряжается своей картой: спрятать с витрины, вернуть обратно,
// удалить совсем.
//
// Почему через сервер, а не запросом из браузера: RLS разрешает креатору
// править свою строку, но триггеры базы возвращают state на место при
// любой его попытке сменить состояние самому (guard_product_publication
// на update, guard_product_insert на insert) — иначе автор публиковал бы
// себя сам, минуя очередь. Триггеры пропускают только служебную роль,
// поэтому «спрятать» обязано идти отсюда, а право на действие
// подтверждается сессией.
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

  // Лимит — после проверки входа и до самой работы: расходовать
  // счёт должен тот, кого мы уже опознали, а работа не должна
  // начинаться, если слота нет.
  const limited = await enforceRateLimit("creator-product", user.id);
  if (limited) return limited;

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
    // Текст ошибки базы — только в лог. Час назад он отдавался наружу:
    // я добавил это, когда без него не удавалось понять, что происходит,
    // и это своё дело сделало. Но здесь, в отличие от админки, на другом
    // конце ЛЮБОЙ креатор, а сообщения PostgREST рассказывают про имена
    // колонок, ограничения и политики — то есть про устройство базы.
    // Диагностику оставлять во включённом виде нельзя: она полезна ровно
    // в тот час, когда ей пользуешься.
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
    // Раньше здесь стояли две проверки по трём полям — «карта прошла
    // разбор» и «спрятал её автор, а не площадка», — со списком
    // разрешённых значений и оговоркой про null. Ошибиться в такой
    // проверке легко, что и произошло: восстановленная из удалённых карта
    // не подходила ни под одно разрешённое значение и застревала
    // навсегда.
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

  // ⚠️ Купленную карту автор УДАЛЯТЬ МОЖЕТ (решение владельца
  // 2026-08-16, снято отсюда 2026-09-10).
  //
  // Здесь стоял отказ 409 «This map has been bought». Изначально запрет
  // был техническим: удаление сносило строку, а покупатель скачивает
  // файл по подписанной ссылке из products.file_path — снеся строку, мы
  // отняли бы у него оплаченное. С мягким удалением (миграция
  // 20260815150000) эта причина отпала: строка и файл остаются,
  // скачивание работает.
  //
  // Дальше запрет полмесяца жил как ПРАВИЛО, ожидая решения. Владелец
  // решил снять: файлы у покупателей остаются, а при нужде высылаются
  // повторно; удаление нужно в основном чтобы старая карта не мозолила
  // глаза в своём списке.
  //
  // ⚠️ Что от этого НЕ ломается и почему — проверено, а не предположено:
  // покупатель продолжает скачивать (downloads.ts смотрит на заказ, а
  // не на состояние карты), страница «My purchases» продолжает
  // показывать название, а ссылка на удалённую карту ведёт на нашу 404,
  // где с 02.09 написано, что скачивание остаётся и где оно лежит.
  //
  // ⚠️ Запрос к order_items убран целиком, а не оставлен «на всякий
  // случай»: он был нужен ровно для этого отказа, и чтение, чей
  // результат никуда не идёт, — это лишний поход в базу на каждом
  // удалении плюс повод думать, что проверка всё ещё есть.

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
    return NextResponse.json({ error: "delete failed" }, { status: 500 });
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
