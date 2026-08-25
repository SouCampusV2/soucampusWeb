-- База учится отличать «назвался впервые» от «переименовался», 2026-08-25.
--
-- ЗАЧЕМ. Готовим вход через Google (решение владельца 25.08). Google не
-- даёт ника, поэтому после первого входа человека спрашивают, как его
-- звать. Но состояния «профиль без имени» у нас НЕ СУЩЕСТВУЕТ: строку в
-- profiles заводит триггер handle_new_user, и он назначает имя ВСЕГДА —
-- без метаданных берёт локальную часть почты.
--
-- Значит экран «впиши имя» — это не заполнение пустого поля, а СМЕНА
-- имени. А смена идёт через guard_username_change, который ставит
-- username_changed_at = now() и запирает имя на 30 дней. Итог без этой
-- миграции: вошёл через Google, получил `stavytskyiyevhenii`, назвался
-- собой — и заперт на месяц за первый же выбор. Тот, кто регистрировался
-- паролем, выбрал имя в форме и бесплатную смену сохранил.
--
-- Разница между «заявил имя» и «передумал» — реальная, и знать её должна
-- база: экран онбординга можно обойти, отправив update из консоли.

-- ------------------------------------------------------------
-- 1. Колонка: заявлено ли имя человеком.
--
-- default true — потому что миграция описывает ПРОШЛОЕ верно: все, кто
-- уже зарегистрирован, имя себе выбрали сами в форме регистрации.
-- false будет ставить только handle_new_user и только тем, за кого имя
-- придумала база.

alter table public.profiles
  add column if not exists username_claimed boolean not null default true;

-- ------------------------------------------------------------
-- 2. Регистрация: помечать выдуманные имена и НЕ падать на резерве.
--
-- ⚠️ ВТОРОЙ КАПКАН, который чинится здесь же. guard_reserved_username
-- стоит `before insert or update` и БРОСАЕТ ИСКЛЮЧЕНИЕ. Фоллбэк по почте
-- резерв не проверял, потому что до сих пор был запасным путём «для
-- старых вкладок»: форма регистрации всегда шлёт username, а её проверка
-- резерв знает (починено 21.08).
--
-- Google делает этот фоллбэк ГЛАВНЫМ путём. И тогда почта вида
-- team@gmail.com, support@…, help@…, admin@…, official@… даёт кандидата
-- из списка зарезервированных → исключение внутри триггера → падает
-- вставка в auth.users → регистрация не проходит ВООБЩЕ. Человек видит
-- невнятную ошибку и уходит, а в логах — нарушение ограничения, которое
-- никто не связывает с адресом почты.
--
-- Лечится тем же приёмом, что уже применён к совпадению имён: не
-- отказывать, а сделать кандидата пригодным.

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
  -- Имя пришло из формы регистрации = человек его выбрал сам.
  -- Пусто = имя придумает база, и человека надо будет спросить.
  chosen boolean;
begin
  wanted := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    split_part(new.email, '@', 1)
  );

  chosen :=
    nullif(new.raw_user_meta_data ->> 'username', '') is not null
    or nullif(new.raw_user_meta_data ->> 'display_name', '') is not null;

  base := regexp_replace(wanted, '[^A-Za-z0-9_]', '_', 'g');
  base := regexp_replace(base, '_+', '_', 'g');
  base := trim(both '_' from base);
  if char_length(base) < 3 then
    base := 'user_' || left(replace(new.id::text, '-', ''), 8);
  end if;
  base := left(base, 32);

  candidate := base;

  -- Занято ИЛИ зарезервировано — и то и другое лечится одним суффиксом.
  -- Резерв проверяем ровно той же функцией, что и форма регистрации:
  -- два места, отвечающие на один вопрос по-разному, мы уже ловили
  -- 21.08 (проверка считала имя свободным, запрет — занятым).
  if exists (select 1 from public.profiles where lower(username) = lower(candidate))
     or public.username_reserved(candidate)
  then
    candidate := left(base, 23) || '_' || left(replace(new.id::text, '-', ''), 8);
  end if;

  insert into public.profiles (id, username, username_claimed)
  values (new.id, candidate, chosen);
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 3. Пауза не берёт денег за первое имя.
--
-- ⚠️ И ЗДЕСЬ ЖЕ — ШЕСТОЙ СЛУЧАЙ ОДНОГО И ТОГО ЖЕ ПРАВИЛА.
-- username_claimed = false РАЗРЕШАЕТ бесплатную смену имени. Форма
-- настроек пишет в profiles прямо из браузера, а политика «правь свою
-- строку» не различает колонки — то есть без защиты любой вошедший
-- выполнил бы в консоли
--
--   await supabase.from('profiles').update({ username_claimed: false })
--
-- и переименовывался бы бесплатно сколько угодно, обходя месячную паузу
-- целиком. После is_admin, is_creator, name_color, is_verified и
-- is_founder это шестое поле подряд, и правило работает: КАЖДОЕ поле в
-- profiles, которое что-то разрешает или удостоверяет, получает свой
-- запрет В ТОЙ ЖЕ миграции, что и колонку.
--
-- Поэтому значение колонки берётся из old и клиентом не управляется
-- вовсе: поднять флаг может только сам этот триггер, и только в одну
-- сторону — false → true. Тот же приём, что у guard_product_author_edit,
-- который перечисляет поля состояния поимённо и возвращает их из old.

create or replace function public.guard_username_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cooldown constant interval := interval '30 days';
  next_allowed timestamptz;
begin
  -- Флаг клиенту не принадлежит НИКОГДА. Возвращаем его из old прежде
  -- любых решений: что бы ни прислала форма, здесь оно уже неважно.
  new.username_claimed := old.username_claimed;

  -- Сравнение по нижнему регистру: смена написания — не смена имени.
  if lower(new.username) is not distinct from lower(old.username) then
    return new;
  end if;

  -- Служебная роль — наш сервер и миграции — без ограничений.
  if auth.role() <> 'authenticated' or auth.uid() is null then
    new.username_changed_at := now();
    new.username_claimed := true;
    return new;
  end if;

  -- Имя ещё не заявлено человеком: это ПЕРВОЕ называние, а не
  -- переименование. Оно бесплатно и паузы не начинает — иначе вошедший
  -- через Google платил бы за право назваться собой той единственной
  -- бесплатной сменой, которая у всех остальных остаётся про запас.
  if not old.username_claimed then
    new.username_claimed := true;
    return new;
  end if;

  if old.username_changed_at is not null then
    next_allowed := old.username_changed_at + cooldown;
    if next_allowed > now() then
      raise exception
        'username_cooldown:%', to_char(next_allowed, 'YYYY-MM-DD')
        using errcode = 'check_violation';
    end if;
  end if;

  new.username_changed_at := now();
  return new;
end;
$$;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Журнал прогонов (docs/RULES.md → «Миграции»).

insert into ops.applied_migrations (version) values ('20260825120000_oauth_username_claim')
on conflict do nothing;
