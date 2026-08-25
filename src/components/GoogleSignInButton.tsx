"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

// Официальная четырёхцветная «G» Google.
//
// ⚠️ СВОЙ <svg> — ИСКЛЮЧЕНИЕ ИЗ ПРАВИЛА «ИКОНКИ ТОЛЬКО PHOSPHOR», и оно
// обосновано. У Phosphor есть GoogleLogo, но он одноцветный, а
// рекомендации Google по бренду просят именно этот знак: чужой логотип —
// не иконка из нашего набора, он опознаётся по форме И цвету, и
// перерисовывать его нашим шрифтом иконок значит подделывать чужую
// марку. Второе исключение в проекте после графика продаж.
//
// ⚠️ И НЕ ССЫЛКОЙ НА КАРТИНКУ С СЕРВЕРА GOOGLE, хотя так проще. Внешняя
// картинка — это запрос браузера посетителя к чужому серверу с каждой
// загрузки страницы входа, то есть Google узнаёт IP всех, кто открыл наш
// /login, включая тех, кто Google не пользуется. Мы буквально этим же
// доводом закрываем чужие картинки в описаниях карт, и в собственной
// политике конфиденциальности написали «ничего не следует за вами по
// сайту». Встроенный svg не делает ни одного запроса.
function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

// Кнопка «войти через Google». Одна на /login и /signup — намеренно.
//
// ⚠️ ПОЧЕМУ ОДНА, А НЕ ДВЕ РАЗНЫЕ. У Google нет разницы между «войти» и
// «зарегистрироваться»: если аккаунта нет, он создаётся; если есть —
// человек просто входит. Рисовать два разных действия там, где действие
// одно, значит обещать выбор, которого не существует, — и первый, кто
// нажмёт «Sign up with Google» вторым заходом, решит, что завёл второй
// аккаунт. Меняется только подпись.
//
// ЧТО ПРОИСХОДИТ ПОСЛЕ НАЖАТИЯ:
//   наш сайт → Supabase → Google → Supabase → наш /auth/callback
// Google возвращает человека В SUPABASE (адрес /auth/v1/callback у них,
// он и прописан в Google Console), Supabase меняет ответ на сессию и
// только потом отправляет к нам. Наш домен Google не видит вовсе.

export function GoogleSignInButton({
  mode,
}: {
  mode: "login" | "signup";
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);

    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // ⚠️ БЕЗ ?next=… НАМЕРЕННО. Supabase пускает только те адреса
        // возврата, что перечислены в Authentication → URL Configuration,
        // и сверяет их целиком: в списке лежит `/auth/callback` и
        // отдельной строкой `/auth/callback?next=/reset-password`, то
        // есть совпадение точное, а не по началу. Собери мы адрес с
        // произвольным next — Supabase отвергнет возврат, и человек
        // получит ошибку уже ПОСЛЕ того, как согласился у Google: самый
        // неприятный момент, чтобы падать.
        //
        // Цена: войдя через Google со страницы товара, человек попадёт в
        // каталог, а не обратно на товар. Чтобы вернуть next, владельцу
        // надо добавить в тот список строку с маской
        // `/auth/callback?next=*` — до тех пор не рискуем.
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    // Сюда попадаем, только если браузер НЕ ушёл к Google: при успехе
    // страница уже сменилась и этот код не выполняется.
    if (error) {
      setPending(false);
      setError("Couldn't reach Google. Please try again.");
    }
  }

  return (
    <div>
      {/* Нейтральная раскраска через colorClassName — легальный путь
          перекрасить Button, тот же, которым сделаны синие ссылки на
          /contact. Оранжевый здесь не годится: это цвет НАШЕГО главного
          действия, а вход через Google — чужая дверь, и выглядеть она
          должна спокойнее, чем «Sign in».

          ⚠️ rounded-full ОБЯЗАТЕЛЕН ЗДЕСЬ, и это не украшение. Форма
          кнопки живёт не в базовых классах Button, а ВНУТРИ строки
          BUTTON_COLORS[variant] — то есть colorClassName заменяет её
          вместе с цветом, и кнопка молча становится прямоугольной.
          Наступили на это 25.08. Правишь colorClassName у любой кнопки —
          возвращай форму руками.

          gap-3 — тоже вручную: base описывает высоту и выравнивание, но
          не расстояние между иконкой и текстом (у BUTTON_PILL свой
          gap-1.5, у полноразмерной кнопки его нет). */}
      <Button
        type="button"
        variant="secondary"
        onClick={signIn}
        disabled={pending}
        colorClassName="rounded-full border-2 border-zinc-300 text-zinc-800 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        className="w-full gap-3"
      >
        <GoogleMark />
        {pending
          ? "Redirecting…"
          : mode === "signup"
            ? "Sign up with Google"
            : "Continue with Google"}
      </Button>

      {error && (
        <p
          className="mt-2 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
