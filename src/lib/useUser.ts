"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

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
//
// `enabled` и ленивый import (25.09). Навбар зовёт хук на КАЖДОЙ странице,
// а аккаунт показывает только в режиме магазина. Раньше клиент Supabase
// (~64 КиБ сжатого JS) грузился и на лендинге, где он не нужен никому, —
// PageSpeed помечал его как самый крупный неиспользуемый код. Теперь при
// `enabled = false` хук не делает ничего, а код клиента подтягивается
// отдельным чанком в тот момент, когда он впервые понадобился.
export function useUser(enabled = true) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    // active — защита от setState после размонтирования (первый запрос
    // асинхронный, компонент мог уже уйти).
    let active = true;
    let unsubscribe = () => {};

    import("@/lib/supabase-browser").then(({ createSupabaseBrowser }) => {
      if (!active) return;
      const supabase = createSupabaseBrowser();

      supabase.auth.getSession().then(({ data }) => {
        if (!active) return;
        setUser(data.session?.user ?? null);
        setLoading(false);
      });

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [enabled]);

  return { user, loading };
}
