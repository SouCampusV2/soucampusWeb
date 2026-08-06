import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { safeNextPath } from "@/lib/site";

// Куда ведёт ссылка из письма-подтверждения. Supabase, проверив email,
// редиректит сюда с одноразовым `code` (PKCE-флоу). Наша задача —
// обменять этот код на настоящую сессию (записать cookie), то есть
// ЗАЛОГИНИТЬ пользователя, и увести в магазин. Если кода нет или обмен
// не удался — отправляем на /login, как и просил владелец.
//
// Route handler (не страница): здесь cookie сессии реально пишутся в
// ответ — поэтому именно тут делается exchangeCodeForSession, а не в
// клиентском компоненте.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // next — куда уйти после успеха (по умолчанию магазин).
  //
  // Проверка на open redirect — общая с формой входа (safeNextPath в
  // lib/site.ts, там же объяснено, что именно отсекается). Здесь она
  // обязательна: до обработчика доходят по ссылке из письма, минуя форму.
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Нет кода / ссылка протухла / обмен не удался.
  //
  // Раньше отправляли на /login — и человек, пришедший из письма менять
  // пароль, получал форму входа без единого слова о том, что случилось.
  // Теперь ведём на страницу, которая называет причину и предлагает
  // запросить свежую ссылку (владелец, 2026-07-31).
  return NextResponse.redirect(`${origin}/link-expired`);
}
