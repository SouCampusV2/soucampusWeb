"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

// Хук: кто сейчас залогинен на клиенте. Возвращает user (или null) и
// loading (пока не пришёл первый ответ).
//
// Как работает: при монтировании один раз читаем текущую сессию
// (getSession) и подписываемся на onAuthStateChange — событие
// «вошёл/вышел/сессия обновилась». Подписка нужна, чтобы навбар сам
// менялся сразу после входа или выхода, без перезагрузки страницы.
//
// Почему getSession(), а не getUser(): getUser() ходит на сервер Supabase
// валидировать токен — это сетевая задержка, из-за которой аватар/ник в
// навбаре появлялись заметно позже. getSession() берёт сессию из локального
// хранилища мгновенно. Здесь это ОК: хук нужен только для ОТОБРАЖЕНИЯ
// (показать ник/аватар, ссылку на профиль вместо «войти»), а не для
// авторизации. Настоящую проверку «кто ты и можно ли» делают сервер —
// proxy.ts продлевает сессию, а защищённые страницы/эндпоинты берут
// пользователя через createSupabaseServer (там уже getUser с валидацией).
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    // active — защита от setState после размонтирования (первый запрос
    // асинхронный, компонент мог уже уйти).
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
