-- Галочку и паузу себе не поставить и не снять — 2026-08-21.
--
-- НАЙДЕНО ПРИ РАЗБОРЕ НА БЕЗОПАСНОСТЬ, по просьбе владельца. Дыра не
-- сегодняшняя: она открыта с 2026-07-27, когда завели is_verified.
--
-- ЧТО БЫЛО НЕ ТАК. Политика «own profile update» разрешает человеку
-- править СВОЮ строку в profiles, а форма настроек пишет туда прямо из
-- браузера. Три флага от этого уже защищены триггерами — is_admin,
-- is_creator, name_color, — а is_verified не защищал НИКТО. То есть
-- любой вошедший мог выполнить в консоли:
--
--   await supabase.from('profiles').update({ is_verified: true }).eq('id', СВОЙ_ID)
--
-- и получить галочку. Она видна в шапке профиля, на карточке каждой его
-- карты и рядом с именем автора на странице товара; ею же открывается
-- кнопка «Order a custom build» (creators.ts). То есть это не украшение,
-- а знак доверия площадки — единственное, что отличает бренд от
-- постороннего с похожим именем.
--
-- ⚠️ УРОК, КОТОРЫЙ ЗДЕСЬ ПОВТОРИЛСЯ В ЧЕТВЁРТЫЙ РАЗ. Каждый флаг в
-- profiles, который что-то РАЗРЕШАЕТ или УДОСТОВЕРЯЕТ, нуждается в
-- собственном триггере: политика «правь свою строку» не различает
-- колонки. Забыть один — значит подарить его всем. Проверять это надо
-- при добавлении КАЖДОГО нового поля в profiles, а не раз в месяц
-- разбором.

-- ⚠️ ВТОРАЯ ДЫРА, найденная тем же разбором и той же проверкой:
-- submissions_blocked_until. Это пауза на подачу карт после тяжёлого
-- отказа (миграция 20260811160000) — «не присылай новое до такого-то
-- числа». Лежит она в profiles, то есть в строке, которую человек
-- правит сам, и её тоже не защищал никто:
--
--   await supabase.from('profiles').update({ submissions_blocked_until: null }).eq('id', СВОЙ_ID)
--
-- и наказание снято. Причём само по себе оно работало исправно — запрет
-- на загрузку стоит в базе, а не в форме, — просто снималось изнутри.
-- Наказание, которое наказанный может отменить, наказанием не является.

create or replace function public.protect_is_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Молчаливый откат, а не ошибка — как у protect_is_creator и
  -- protect_name_color. Ошибка означала бы, что сохранение ВСЕГО профиля
  -- падает из-за поля, которого человек в форме даже не видел.
  --
  -- Условие «auth.role() = authenticated» — это «правит человек из
  -- браузера». Наш сервер под служебным ключом (админка, где галочку и
  -- ставят) и миграции сюда не попадают намеренно.
  if new.is_verified is distinct from old.is_verified
     and auth.role() = 'authenticated'
     and auth.uid() is not null
  then
    new.is_verified := old.is_verified;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_is_verified on public.profiles;
create trigger profiles_protect_is_verified
  before update on public.profiles
  for each row execute function public.protect_is_verified();

create or replace function public.protect_submission_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.submissions_blocked_until is distinct from old.submissions_blocked_until
     and auth.role() = 'authenticated'
     and auth.uid() is not null
  then
    new.submissions_blocked_until := old.submissions_blocked_until;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_submission_block on public.profiles;
create trigger profiles_protect_submission_block
  before update on public.profiles
  for each row execute function public.protect_submission_block();

-- ------------------------------------------------------------
-- ТРЕТЬЯ находка того же разбора, помельче: зарезервированное имя
-- считалось СВОБОДНЫМ.
--
-- guard_reserved_username (20260821150000) не даёт занять `admin`,
-- `support` и прочие — но узнаёт об этом человек только при сохранении,
-- сырой ошибкой `username_reserved`. Форма до этого честно говорила
-- «свободно», потому что username_available смотрела только на занятые
-- строки. То есть проверка и запрет отвечали на один вопрос по-разному.
--
-- Список тот же самый — вынесен в функцию, чтобы у него было ОДНО место.
-- Две копии одного перечня разъезжаются: это уже случалось с формулой
-- видимости карты и с семью копиями градиента.

create or replace function public.username_reserved(name text)
returns boolean
language sql
immutable
as $$
  select lower(name) = any(array[
    'admin', 'administrator', 'support', 'staff', 'moderator', 'mod',
    'soucampus', 'system', 'root', 'help', 'official', 'team'
  ]);
$$;

grant execute on function public.username_reserved(text) to anon, authenticated;

create or replace function public.guard_reserved_username()
returns trigger
language plpgsql
as $$
begin
  -- Владелец бренда — исключение: имя soucampus принадлежит ему, и
  -- запрет не должен отобрать у него собственное. Проверяем только тех,
  -- кто это имя ещё не носит.
  if public.username_reserved(new.username)
     and (tg_op = 'INSERT' or lower(old.username) <> lower(new.username))
  then
    raise exception 'username_reserved'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace function public.username_available(name text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select not public.username_reserved(name)
     and not exists (
       select 1 from public.profiles where lower(username) = lower(name)
     );
$$;

grant execute on function public.username_available(text) to anon, authenticated;

notify pgrst, 'reload schema';
