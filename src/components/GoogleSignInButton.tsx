"use client";

import { useState } from "react";
import { GoogleLogo } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

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
          должна спокойнее, чем «Sign in». */}
      <Button
        type="button"
        variant="secondary"
        onClick={signIn}
        disabled={pending}
        colorClassName="border-2 border-zinc-300 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
        className="w-full"
      >
        {/* Логотип — Phosphor, а не свой <svg>. Официальные рекомендации
            Google просят цветную букву G, но своя иконка в проекте
            встречается ровно в одном месте (график продаж), и заводить
            второе исключение ради монохромной разницы дороже, чем стоит.
            Для обычного OAuth с правами email/profile проверку Google это
            не затрагивает. */}
        <GoogleLogo size={20} weight="bold" aria-hidden />
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
