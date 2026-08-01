import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  return response;
}

export const config = {
  // На чём proxy НЕ запускается: статика Next, картинки, favicon. На
  // остальном — да, чтобы сессия обновлялась на любых страницах.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
