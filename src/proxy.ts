import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  NAME_CLAIMED_COOKIE,
  NAME_CLAIMED_COOKIE_OPTIONS,
} from "@/lib/name-claimed-cookie";

// Proxy — в Next 16 это бывший middleware (переименован, поведение то же;
// см. node_modules/next/dist/docs/.../16-proxy.md). Файл один на проект,
// лежит рядом с app/, функция называется proxy.
//
// Единственная задача здесь — продлевать сессию Supabase на каждом
// запросе: access-токен живёт недолго, и без обновления пользователь
// «разлогинивался» бы между переходами. Это не полноценная авторизация
// (её делают страницы/route handlers через createSupabaseServer), а
// только поддержание cookie сессии свежей.
export async function proxy(request: NextRequest) {
  // Ответ, который поедет дальше. Может быть пересоздан ниже, если
  // Supabase решит записать обновлённые cookie.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Кладём новые cookie и в запрос (чтобы код ниже видел их сразу),
          // и в ответ (чтобы они ушли в браузер).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() валидирует токен на сервере Supabase. Сам факт вызова
  // заставляет ssr при необходимости обновить cookie через setAll выше.
  // Не делать здесь никакой другой логики между createServerClient и
  // getUser — это рекомендация Supabase, иначе сессия может рассинхро-
  // низироваться.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ------------------------------------------------------------
  // Второй рубеж админки.
  //
  // Права проверяет и layout админки (src/app/admin/layout.tsx), и сам
  // обработчик /api/admin/*. Но опираться ТОЛЬКО на layout нельзя — это
  // прямая рекомендация Next.js: layout не перерендеривается на каждой
  // навигации, и есть сценарии прямых RSC-запросов, где он не отработает
  // как страж маршрута.
  //
  // Здесь проверка намеренно грубая — только «залогинен ли вообще».
  // Точную проверку is_admin оставляем layout'у: она требует запроса в
  // базу, а proxy выполняется на КАЖДЫЙ запрос сайта, и поход в БД
  // отсюда стоил бы задержки на всех страницах ради одного раздела.
  // Смысл этого рубежа — отсечь анонима до того, как он вообще дойдёт до
  // серверного рендера админки.
  if (!user && request.nextUrl.pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }

  // ------------------------------------------------------------
  // Вошёл, но ещё не назвался.
  //
  // Google ника не даёт, поэтому до выбора имени человек носит то, что
  // придумала база из его почты. Пока он не назвался — уводим на
  // /welcome с любого адреса: иначе он оставит комментарий и купит карту
  // под именем `stavytskyiyevhenii`, а увидит это уже потом.
  //
  // ⚠️ ЭТО УДОБСТВО, А НЕ ЗАЩИТА, и путать нельзя. Гейт можно обойти,
  // подделав cookie ниже, — и не получить ничего: бесплатная смена имени
  // висит на колонке username_claimed, а её из браузера не изменить
  // (guard_username_change берёт значение из old прежде любых решений).
  // Обошедший останется с именем из почты, чего сам и добивался.
  // Именно поэтому здесь допустим дешёвый признак; будь на кону право —
  // был бы недопустим.
  //
  // ЦЕНА ЗАПРОСА. Спросить базу — значит сходить в неё на КАЖДОМ переходе
  // каждого вошедшего. Поэтому спрашиваем один раз и запоминаем ответ
  // cookie: у всех, кто регистрировался формой, username_claimed = true
  // (default в миграции 20260825120000), они платят один запрос за сессию
  // и больше никогда.
  const pathname = request.nextUrl.pathname;
  const exempt =
    pathname.startsWith("/welcome") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");

  if (user && !exempt && !request.cookies.get(NAME_CLAIMED_COOKIE)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username_claimed")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.username_claimed === false) {
      const url = request.nextUrl.clone();
      url.pathname = "/welcome";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Назвался (или строки ещё нет — тогда не мешаем ходить по сайту).
    // Ставим признак, чтобы больше не спрашивать.
    response.cookies.set(NAME_CLAIMED_COOKIE, "1", NAME_CLAIMED_COOKIE_OPTIONS);
  }

  return response;
}

export const config = {
  // На чём proxy НЕ запускается: статика Next, картинки, favicon. На
  // остальном — да, чтобы сессия обновлялась на любых страницах.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
