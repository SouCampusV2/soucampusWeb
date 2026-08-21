-- Ник и адрес — разные вещи. 2026-08-21.
--
-- ЧТО БЫЛО. Одно поле display_name тянуло три роли сразу: как человека
-- видно, по какому адресу лежит его профиль (/creator/<lower(ник)>) и
-- под каким именем он входит. Уникальность держал индекс
-- profiles_display_name_lower_idx, а хэндл считался на лету в коде
-- (creators.ts, toHandle).
--
-- ЧЕМ ЭТО ПЛОХО — три беды, и все три настоящие:
--   1. Сменил ник — все ссылки на профиль (поиск, Discord, закладки)
--      ведут в 404.
--   2. Освободившееся имя тут же берёт кто угодно, и ссылки ведут уже
--      не в 404, а на ЧУЖОЙ профиль. Это хуже поломки.
--   3. Ник нельзя менять свободно, хотя это всего лишь подпись, — потому
--      что он же адрес.
--
-- ЧТО ТЕПЕРЬ. Роли разъехались по двум колонкам:
--   username     — адрес и логин. Строчный, [a-z0-9_], уникальный.
--   display_name — как тебя видно. Меняй хоть каждый день, повторы
--                  разрешены (индекс уникальности снят).
--
-- ЧЕГО ЭТА МИГРАЦИЯ НЕ ДЕЛАЕТ (осознанно, решение владельца 2026-08-21).
-- Из трёх предложенных мер сделана только эта. Не сделаны:
--   (b) пауза между сменами username;
--   (c) резерв освободившихся имён от перезахвата.
-- То есть беда №2 из списка выше СНЯТА НЕ ПОЛНОСТЬЮ: сменивший username
-- по-прежнему освобождает старый. Но менять теперь надо осознанно и
-- отдельным действием, а не заодно с подписью, — а это и была главная
-- причина, по которой смена случалась часто.

-- ------------------------------------------------------------
-- 1. Колонка.

alter table public.profiles add column if not exists username text;

-- ------------------------------------------------------------
-- 2. Заполнение существующих строк.
--
-- Имя строим из ника: строчные буквы, всё лишнее — в подчёркивание.
-- Столкновения решаются суффиксом. Идём по created_at, чтобы «кто
-- раньше зарегистрировался, тот и получил чистое имя» — это
-- единственный порядок, который не выглядит произволом.
--
-- ⚠️ Цикл, а не один update: следующей строке надо знать, что заняла
-- предыдущая. Одним запросом это не выражается.

do $$
declare
  r record;
  base text;
  candidate text;
  n int;
begin
  for r in
    select id, display_name from public.profiles
    where username is null order by created_at, id
  loop
    base := lower(regexp_replace(coalesce(r.display_name, ''), '[^a-zA-Z0-9_]', '_', 'g'));
    base := regexp_replace(base, '_+', '_', 'g');
    base := trim(both '_' from base);
    if char_length(base) < 3 then
      base := 'user_' || left(replace(r.id::text, '-', ''), 8);
    end if;
    base := left(base, 32);

    candidate := base;
    n := 1;
    while exists (select 1 from public.profiles where username = candidate) loop
      n := n + 1;
      candidate := left(base, 31 - char_length(n::text)) || '_' || n;
    end loop;

    update public.profiles set username = candidate where id = r.id;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 3. Правила.
--
-- Здесь check БЕЗ not valid — в отличие от 20260820140000_text_limits.
-- Разница по существу: там ограничение накладывалось на данные, которые
-- писались годами без правил, и старая строка-нарушитель уронила бы
-- миграцию. Здесь колонку заполнили МЫ, шагом выше, по этому же правилу.
-- Если проверка не пройдёт — значит, ошибка в заполнении, и узнать об
-- этом надо сейчас и громко, а не через полгода.

alter table public.profiles alter column username set not null;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[a-z0-9_]{3,32}$');

-- Уникальность прямо по колонке: значение и так строчное (это стережёт
-- ограничение выше), поэтому городить индекс по lower() не нужно —
-- в отличие от display_name, который хранится как введён.
drop index if exists public.profiles_username_idx;
create unique index profiles_username_idx on public.profiles (username);

-- ------------------------------------------------------------
-- 4. Ник больше не уникален.
--
-- Это и есть весь смысл разделения: два человека вправе называться
-- одинаково, различает их адрес. Индекс снимается ПОСЛЕ того, как
-- username заполнен и уникален, — иначе на секунду не осталось бы
-- ни одного различающего поля.

drop index if exists public.profiles_display_name_lower_idx;

-- ------------------------------------------------------------
-- 5. Занятость проверяем теперь по username.
--
-- Старая display_name_available НЕ удаляется намеренно. Правило порядка
-- (CLAUDE.md → «Как узнать, что прогнано на проде»): миграция, которая
-- удаляет, идёт ПОСЛЕ деплоя, иначе развёрнутый код зовёт то, чего уже
-- нет. Форма регистрации на проде зовёт её прямо сейчас. Снести —
-- отдельной миграцией, когда новый код доедет.

create or replace function public.username_available(name text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles where username = lower(name)
  );
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 6. Новые регистрации.
--
-- Тот же алгоритм, что при заполнении, — но без цикла по всей таблице:
-- у нового пользователя ровно одно имя, и если оно занято, дописываем
-- хвост из его же id. Случайность здесь уместнее счётчика: счётчик при
-- одновременных регистрациях даёт гонку, id уникален по построению.

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
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    split_part(new.email, '@', 1)
  );

  base := lower(regexp_replace(wanted, '[^a-zA-Z0-9_]', '_', 'g'));
  base := regexp_replace(base, '_+', '_', 'g');
  base := trim(both '_' from base);
  if char_length(base) < 3 then
    base := 'user_' || left(replace(new.id::text, '-', ''), 8);
  end if;
  base := left(base, 32);

  candidate := base;
  if exists (select 1 from public.profiles where username = candidate) then
    candidate := left(base, 23) || '_' || left(replace(new.id::text, '-', ''), 8);
  end if;

  insert into public.profiles (id, display_name, username)
  values (new.id, wanted, candidate);
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 7. Наружу.
--
-- username публичен по своей природе — он стоит в адресе профиля.
-- Прятать его в представлении было бы самообманом.

-- ⚠️ username ДОПИСАН В КОНЕЦ, и переставлять его нельзя.
--
-- `create or replace view` умеет только ДОБАВЛЯТЬ колонки в хвост: имена
-- и порядок уже существующих обязаны совпасть один в один. Поставленный
-- вторым (по смыслу — рядом с display_name) он давал
--   ERROR 42P16: cannot change name of view column "display_name" to "username"
-- — Postgres читает список позиционно и понимает это как переименование
-- второй колонки. Чтобы расставить их «красиво», представление пришлось
-- бы удалить и создать заново, а удаление сносит и права (grant), и всё,
-- что на него ссылается. Порядок колонок в представлении не значит
-- ничего: код выбирает их по имени.

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
    username
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

notify pgrst, 'reload schema';
