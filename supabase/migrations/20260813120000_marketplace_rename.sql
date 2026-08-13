-- ============================================================
-- Магазин переименован в Marketplace — 2026-08-13.
--
-- Переезд /shop → /marketplace сделан в коде (папка роута, ссылки,
-- постоянный редирект в next.config.ts). Но одна ссылка живёт НЕ в коде,
-- а в базе: приветственное уведомление собирается функцией
-- notify_new_user_welcome (миграция 20260810130000) и там же зашиты и
-- текст «around the shop», и href '/shop'. Без этой миграции каждый
-- новый аккаунт продолжал бы получать письмо со старым словом.
--
-- Уже разосланные уведомления НЕ переписываем: их href ловит постоянный
-- редирект, а задним числом править текст, который человек уже прочитал,
-- смысла нет.
--
-- Правило миграций: сначала preview, потом прод (docs/RULES.md).
-- ============================================================

-- Тело функции целиком (create or replace), а не «поправить строку»:
-- в Postgres функция заменяется только вся. Логика не меняется —
-- меняются два слова и адрес.
create or replace function public.notify_new_user_welcome()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, kind, title, body, href)
  values (
    new.id,
    'announcement',
    'Welcome to SouCampus builds',
    'This is where the site talks to you: what happens to your maps, ' ||
    'your purchases, and anything new around the marketplace. Browse ' ||
    'the maps to get started.',
    '/marketplace'
  );
  return new;
end;
$$;
