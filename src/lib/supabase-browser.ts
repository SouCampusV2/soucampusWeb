import { createBrowserClient } from "@supabase/ssr";

// Клиент Supabase для КЛИЕНТСКИХ компонентов ("use client").
//
// Чем отличается от getSupabase() (в supabase.ts): тот — простой
// публичный клиент только для чтения открытых таблиц. Этот умеет auth —
// хранит сессию пользователя в cookie, которую видит и сервер (через
// proxy.ts и серверный клиент). Через него делаются signUp / signIn /
// signOut и читается текущий пользователь на клиенте.
//
// createBrowserClient сам читает и пишет cookie браузера — руками ничего
// передавать не нужно. Ключи — те же публичные, что и у getSupabase()
// (URL проекта + anon-ключ, не секреты: что реально доступно, решает RLS).
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
