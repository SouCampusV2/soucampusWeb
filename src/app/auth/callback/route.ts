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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Вошедшего через Google надо спросить, как его звать: Google ника
      // не даёт, и до этого момента человек носит имя, придуманное базой
      // из его почты (handle_new_user). Спрашиваем ЗДЕСЬ, на первом же
      // шаге после входа, а не когда-нибудь потом — пока имя не заявлено,
      // смена бесплатна, и тратить это окно молча нечестно.
      //
      // ⚠️ Проверяем ВСЕХ, а не только пришедших от Google. Признак — не
      // «каким способом вошёл», а «выбрано ли имя человеком»
      // (profiles.username_claimed): способов входа может стать больше, а
      // вопрос останется тот же. Гадать по провайдеру значило бы заводить
      // второе место, знающее правило.
      const userId = data.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username_claimed, username, avatar_url")
          .eq("id", userId)
          .maybeSingle();

        // ⚠️ ВОЗВРАЩАЕМ СВОЙ АВАТАР ПОВЕРХ ГУГЛОВСКОГО.
        //
        // Навбар читает аватар и имя не из базы, а из user_metadata —
        // это кэш, чтобы не ходить в profiles на каждой странице. Пишет
        // туда наша форма профиля... и Google, при КАЖДОМ входе: он
        // кладёт в те же ключи фотографию из своего аккаунта и затирает
        // наш кэш. Настоящие данные в profiles при этом целы, просто
        // навбар их больше не видит. Владелец поймал это 25.08: у
        // аккаунта с загруженным аватаром в навбаре появилось фото из
        // Google.
        //
        // Правило то же, что и везде в проекте: источник правды один, и
        // это profiles. Здесь мы просто заново приводим кэш к нему —
        // после входа, то есть ровно там, где его успели испортить.
        //
        // ⚠️ И ГУГЛОВСКОЕ ФОТО НЕ ПРИСВАИВАЕМ, хотя соблазн есть: у
        // нового человека сразу была бы красивая картинка. Но её адрес
        // ведёт на googleusercontent.com, а профили у нас публичные —
        // значит браузер КАЖДОГО посетителя чужого профиля ходил бы за
        // ней к Google. Это то самое, что мы закрываем в описаниях карт
        // (чужой img собирает IP читателей), и то, что пообещали в
        // политике конфиденциальности сегодня же. Нет аватара — рисуем
        // свою заглушку, человек загрузит свою.
        if (profile) {
          const meta = data.user?.user_metadata ?? {};
          if (
            meta.avatar_url !== profile.avatar_url ||
            meta.username !== profile.username
          ) {
            await supabase.auth.updateUser({
              data: {
                avatar_url: profile.avatar_url,
                username: profile.username,
              },
            });
          }
        }

        // Строки может не быть, если триггер ещё не отработал: тогда не
        // мешаем входу — гейт в proxy.ts поймает на следующем переходе.
        if (profile && profile.username_claimed === false) {
          return NextResponse.redirect(`${origin}/welcome`);
        }
      }

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
