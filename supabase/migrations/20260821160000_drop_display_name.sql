-- Убрать display_name — 2026-08-21, хвост «одного имени».
--
-- ⚠️⚠️ ПРОГОНЯТЬ ТОЛЬКО ПОСЛЕ ТОГО, КАК ДЕПЛОЙ ДОЕХАЛ. ⚠️⚠️
--
-- Это миграция, которая УДАЛЯЕТ, а такие идут после деплоя, а не до
-- (CLAUDE.md → «Как узнать, что прогнано на проде»). Пока на сервере
-- работает код, спрашивающий display_name, снос колонки роняет сайт
-- целиком: PostgREST на незнакомую колонку не отдаёт строк ВООБЩЕ, то
-- есть пропадают не подписи, а весь каталог и все профили.
--
-- Порядок правильный такой:
--   1. 20260821150000_one_name  → прогнать (она колонку не трогает)
--   2. смёржить и дождаться деплоя
--   3. эта миграция
--
-- ЧТО ПРОВЕРИТЬ ПЕРЕД ПРОГОНОМ. Что на сайте открывается профиль, витрина
-- и админка. Если открывается — значит развёрнутый код display_name уже
-- не спрашивает, и колонку можно убирать.

-- ------------------------------------------------------------
-- 1. Сначала представление.
--
-- ⚠️ Именно drop, а не create or replace. `create or replace view` умеет
-- ДОПИСЫВАТЬ колонки в хвост, но не убирать и не переставлять — сегодня
-- это уже стоило одного упавшего прогона (42P16). Убрать колонку из
-- представления можно только пересоздав его.
--
-- Заодно наводим порядок в списке: username первым, как и положено
-- главному полю. Раньше он висел в конце ровно потому, что дописать
-- можно было только туда.
--
-- drop сносит и права — grant ниже обязателен, без него аноним перестанет
-- видеть профили, и это будет выглядеть как «сломались все страницы карт».

drop view if exists public.public_profiles;

create view public.public_profiles
with (security_invoker = false) as
  select
    id,
    username,
    username_lower,
    avatar_url,
    bio,
    is_verified,
    is_creator,
    name_color,
    public.profile_is_client(id) as is_client
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- ------------------------------------------------------------
-- 2. Триггер синхронизации больше не нужен.
--
-- Он существовал ровно ради окна между прогоном 150000 и деплоем: держал
-- display_name равным username, чтобы старый код видел верное имя.
-- Окно закрылось.

drop trigger if exists profiles_sync_display_name on public.profiles;
drop function if exists public.sync_display_name();

-- ------------------------------------------------------------
-- 3. Регистрация перестаёт писать второе имя.
--
-- Перечитывать raw_user_meta_data ->> 'display_name' тоже больше незачем:
-- форма регистрации шлёт username, а вкладки, открытые до деплоя, к этому
-- моменту закрыты. Оставляем как самый последний запасной вариант — он
-- ничего не стоит, а его отсутствие уронило бы регистрацию из старой
-- вкладки на NOT NULL.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text;
  base text;
  candidate text;
begin
  wanted := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    split_part(new.email, '@', 1)
  );

  base := regexp_replace(wanted, '[^A-Za-z0-9_]', '_', 'g');
  base := regexp_replace(base, '_+', '_', 'g');
  base := trim(both '_' from base);
  if char_length(base) < 3 then
    base := 'user_' || left(replace(new.id::text, '-', ''), 8);
  end if;
  base := left(base, 32);

  candidate := base;
  if exists (select 1 from public.profiles where lower(username) = lower(candidate)) then
    candidate := left(base, 23) || '_' || left(replace(new.id::text, '-', ''), 8);
  end if;

  insert into public.profiles (id, username) values (new.id, candidate);
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 4. Сама колонка и всё, что на неё смотрело.

alter table public.profiles drop constraint if exists profiles_display_name_len;
drop function if exists public.display_name_available(text);
drop index if exists public.profiles_display_name_lower_idx;

alter table public.profiles drop column if exists display_name;

notify pgrst, 'reload schema';
