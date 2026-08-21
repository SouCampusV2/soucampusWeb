-- Одно имя вместо двух — 2026-08-21, вечер.
--
-- ЧТО РЕШИЛ ВЛАДЕЛЕЦ. У человека ОДНО имя: `username`. Оно же логин, оно
-- же адрес профиля, оно же то, что видно везде. Уникальное. Сменил —
-- старое освободилось, и занять его может кто угодно.
--
-- ПОЧЕМУ ЭТО НЕ ОТКАТ УТРЕННЕЙ РАБОТЫ, ХОТЯ ПОХОЖЕ. Утром одно поле
-- `display_name` разделили на два: подпись (свободная, повторяемая) и
-- адрес. Разделение решало настоящую беду — смена подписи ломала ссылки.
-- Но оно порождало другую, и владелец назвал её точнее, чем я:
--
--   «если у нас будет дисплей нейм не уникальный, то будет 10000
--    SouCampus в будущем»
--
-- И это правда. Технически ответ был — «показывать @username рядом с
-- подписью». Но люди читают КРУПНОЕ имя, а мелкий хэндл под ним не
-- читает никто. Уникальность подписи — не техническая придирка, а то,
-- на что смотрит человек, решая, с кем он говорит.
--
-- Размен принят сознательно: **смена имени снова ломает ссылки на
-- профиль**, и старое имя освобождается. Обсуждались таблица прошлых
-- имён (редирект + защита от перезахвата) и постоянный резерв — владелец
-- отказался от обоих: «поменял, значит слот освободился». Цену держит
-- пауза в 30 дней из 20260821140000: менять имя можно, но редко.
--
-- ЧТО ОСТАЁТСЯ ОТ УТРА. Почти всё, и это не случайность: колонка
-- `username`, её проверка формы, уникальный индекс, пауза на смену,
-- адрес `/@<username>`. Уходит только ВТОРОЕ имя. То есть день стоил не
-- впустую — он стоил одной колонки, которую теперь убираем.

-- ------------------------------------------------------------
-- 1. Имя пишется как введено.
--
-- Утренняя проверка требовала строчных: username был адресом, а не
-- подписью, и «SouCampus» в URL выглядел бы неопрятно. Теперь это ИМЯ, и
-- писать его капсом — право человека: SouCampus, а не soucampus.
--
-- Уникальность при этом остаётся РЕГИСТРОНЕЗАВИСИМОЙ (индекс ниже): иначе
-- «SouCampus» и «soucampus» были бы разными людьми, а на глаз — одним.
-- Это и есть та подделка, ради которой всё затевалось.

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[A-Za-z0-9_]{3,32}$');

-- ------------------------------------------------------------
-- 2. Вернуть людям их регистр.
--
-- Утренняя миграция построила username из ника ЧЕРЕЗ lower(): у всех
-- сейчас «soucampus» вместо «SouCampus». Раз имя стало видимым,
-- красивое написание надо вернуть — оно лежит рядом, в display_name.
--
-- Берём его только если оно отличается ТОЛЬКО РЕГИСТРОМ. Любое другое
-- расхождение (пробелы, точки, другое слово) означает, что username
-- собирался с потерями, и подставлять туда display_name вслепую нельзя:
-- имя может оказаться занятым или не пройти проверку формы.

update public.profiles
   set username = display_name
 where display_name ~ '^[A-Za-z0-9_]{3,32}$'
   and lower(display_name) = lower(username)
   and display_name <> username;

-- ------------------------------------------------------------
-- 3. Уникальность — по нижнему регистру.
--
-- Утром индекс стоял прямо на колонке: значение и так было строчным.
-- Теперь регистр свободный, и сравнивать надо приведённые: «SouCampus»
-- и «soucampus» — одно занятое имя, а не два свободных.

drop index if exists public.profiles_username_idx;
create unique index profiles_username_lower_idx
  on public.profiles (lower(username));

-- ------------------------------------------------------------
-- 4. Колонка для поиска по адресу.
--
-- ЗАЧЕМ ОНА, ЕСЛИ ЕСТЬ ИНДЕКС ПО lower(username). Затем, что PostgREST
-- (через него ходит весь сайт) умеет фильтровать только по КОЛОНКАМ:
-- написать `where lower(username) = $1` из клиента нельзя. Остаётся
-- `ilike`, а он функциональный индекс не использует — то есть каждый
-- заход на профиль читал бы таблицу целиком.
--
-- generated always ... stored — колонка, которую считает сама база при
-- каждой записи. Разъехаться с username она не может по построению: это
-- не копия, которую надо не забыть обновить, а вычисляемое значение.

alter table public.profiles
  add column if not exists username_lower text
  generated always as (lower(username)) stored;

create index if not exists profiles_username_lower_lookup_idx
  on public.profiles (username_lower);

-- ------------------------------------------------------------
-- 5. Занятость — тоже без учёта регистра.

create or replace function public.username_available(name text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(name)
  );
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 6. Смена регистра паузы НЕ стоит.
--
-- guard_username_change (20260821140000) сравнивал имена буквально, и
-- «soucampus» → «SouCampus» считалось сменой имени с месячной паузой.
-- Но слот при этом не освобождается — занято то же самое имя, — а
-- значит и запрещать нечего. Пауза существует против карусели именами,
-- а не против опрятности.

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
  -- Сравнение по нижнему регистру: смена написания — не смена имени.
  if lower(new.username) is not distinct from lower(old.username) then
    return new;
  end if;

  -- Служебная роль — наш сервер и миграции — без ограничений.
  if auth.role() <> 'authenticated' or auth.uid() is null then
    new.username_changed_at := now();
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

-- ------------------------------------------------------------
-- 7. Имена, которые не занять никому.
--
-- Единственное, что осталось от защиты после отказа от истории имён и
-- резерва. Стоит копейки и закрывает самый вероятный вид подделки: не
-- «похожее имя», а прямое «support» или «admin», от лица которых пишут
-- «пришлите пароль».
--
-- Список короткий намеренно. Резервировать всё подряд — значит отбирать
-- имена у живых людей ради угрозы, которой нет.

create or replace function public.guard_reserved_username()
returns trigger
language plpgsql
as $$
declare
  reserved constant text[] := array[
    'admin', 'administrator', 'support', 'staff', 'moderator', 'mod',
    'soucampus', 'system', 'root', 'help', 'official', 'team'
  ];
begin
  -- Владелец бренда — исключение: имя soucampus принадлежит ему, и
  -- запрет не должен отобрать у него собственное. Проверяем только тех,
  -- кто это имя ещё не носит.
  if lower(new.username) = any(reserved)
     and (tg_op = 'INSERT' or lower(old.username) <> lower(new.username))
  then
    raise exception 'username_reserved'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_reserved_username on public.profiles;
create trigger profiles_guard_reserved_username
  before insert or update on public.profiles
  for each row execute function public.guard_reserved_username();

-- ------------------------------------------------------------
-- 8. display_name пока ЖИВЁТ и повторяет username.
--
-- ⚠️ Колонка здесь НЕ удаляется, и это правило, а не осторожность
-- (CLAUDE.md → «Как узнать, что прогнано на проде»): миграция, которая
-- УДАЛЯЕТ, идёт ПОСЛЕ деплоя. Прямо сейчас на проде работает код,
-- который читает display_name на каждой странице; снеси колонку — и сайт
-- ляжет целиком в промежутке между прогоном и деплоем.
--
-- Поэтому вместо удаления — синхронизация: display_name всегда равен
-- username. Старый код продолжает работать и видит верное имя, новый его
-- просто не спрашивает. Удаление — отдельной миграцией, когда код доедет
-- (её же придётся начать с drop view: `create or replace view` умеет
-- дописывать колонки, но не убирать — сегодняшний урок).

create or replace function public.sync_display_name()
returns trigger
language plpgsql
as $$
begin
  new.display_name := new.username;
  return new;
end;
$$;

drop trigger if exists profiles_sync_display_name on public.profiles;
create trigger profiles_sync_display_name
  before insert or update on public.profiles
  for each row execute function public.sync_display_name();

update public.profiles set display_name = username where display_name <> username;

-- ------------------------------------------------------------
-- 9. Новые регистрации.
--
-- Форма регистрации спрашивает ОДНО имя и присылает его в
-- raw_user_meta_data.username; старое поле display_name читаем как
-- запасной вариант — письма-приглашения и вкладки, открытые до деплоя,
-- всё ещё шлют его.

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

  -- Регистр СОХРАНЯЕМ (имя теперь видимое), чистим только недопустимое.
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

  insert into public.profiles (id, display_name, username)
  values (new.id, candidate, candidate);
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 10. Наружу — username_lower для поиска по адресу.
--
-- Дописан В КОНЕЦ: `create or replace view` умеет только добавлять
-- колонки в хвост, имена и порядок существующих обязаны совпасть один в
-- один. Сегодня это уже стоило одного упавшего прогона
-- (42P16: cannot change name of view column).

create or replace view public.public_profiles
with (security_invoker = false) as
  select
    id,
    display_name,
    avatar_url,
    bio,
    is_verified,
    is_creator,
    name_color,
    public.profile_is_client(id) as is_client,
    username,
    username_lower
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

notify pgrst, 'reload schema';
