"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Перехват ошибки протухшей ссылки, которая приходит В ХЭШЕ адреса.
//
// Когда одноразовый код из письма уже недействителен, Supabase не доводит
// человека до нашего /auth/callback вовсе: он сам редиректит на Site URL и
// кладёт причину во фрагмент —
//   /login#error=access_denied&error_code=otp_expired&error_description=…
//
// Фрагмент браузер НА СЕРВЕР НЕ ОТПРАВЛЯЕТ. Ни route handler, ни серверный
// компонент его не увидят, поэтому обработать это можно только в браузере —
// отсюда клиентский компонент вместо проверки в /auth/callback.
//
// Хэш подчищаем перед уходом: иначе он останется в истории и вернётся при
// нажатии «назад».
export function AuthErrorRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("error")) return;

    const params = new URLSearchParams(hash.slice(1));
    const reason = params.get("error_code") ?? params.get("error") ?? "";

    window.history.replaceState(null, "", window.location.pathname);
    router.replace(`/link-expired?reason=${encodeURIComponent(reason)}`);
  }, [router]);

  return null;
}
