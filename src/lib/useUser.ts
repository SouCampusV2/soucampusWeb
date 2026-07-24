"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

// Хук: кто сейчас залогинен на клиенте. Возвращает user (или null) и
// loading (пока не пришёл первый ответ).
//
// Как работает: при монтировании один раз спрашиваем текущего
// пользователя (getUser) и подписываемся на onAuthStateChange —
// событие «вошёл/вышел/сессия обновилась». Подписка нужна, чтобы навбар
// сам менялся сразу после входа или выхода, без перезагрузки страницы.
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    // active — защита от setState после размонтирования (первый запрос
    // асинхронный, компонент мог уже уйти).
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
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
