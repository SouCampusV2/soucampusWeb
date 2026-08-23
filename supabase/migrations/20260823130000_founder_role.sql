-- У владельца площадки своя подпись — Founder, 2026-08-23.
--
-- ЗАЧЕМ. На странице карты и в шапке профиля роль владельца называлась
-- «Creator» — тем же словом, что и у любого автора. Он не «один из
-- авторов», он тот, чья это площадка, и в первой версии сайта он ЕДИНСТВЕННЫЙ
-- автор (креаторство заморожено 20.08). Слово должно это говорить.
--
-- ⚠️ ПОЧЕМУ ОТДЕЛЬНАЯ КОЛОНКА, А НЕ is_admin. Соблазн был: админ на сайте
-- один, и «Founder = is_admin» обошёлся бы без миграции. Но это разные
-- вопросы. is_admin — про ПРАВА («что тебе можно»), Founder — про
-- ИДЕНТИЧНОСТЬ («кто ты»). Совпадают они ровно сегодня и разойдутся в тот
-- день, когда админом станет модератор: он получит подпись основателя, и
-- искать причину будут не здесь. Роль, выведенная из права, — это ошибка
-- того же рода, что адрес /creator/<имя>, называвший роль вместо человека
-- (переехали на /@<имя> 21.08).
--
-- ⚠️ И ТРИГГЕР ОБЯЗАТЕЛЕН, ПОТОМУ ЧТО ЭТО ПОЛЕ УДОСТОВЕРЯЕТ. Правило,
-- выученное четырьмя дырами подряд (is_admin, is_creator, name_color,
-- is_verified): политика «правь свою строку» НЕ РАЗЛИЧАЕТ КОЛОНКИ, а форма
-- настроек пишет в profiles прямо из браузера. Каждое поле, которое что-то
-- разрешает или удостоверяет, нуждается в собственном триггере — иначе
-- любой вошедший выполнит в консоли
--
--   await supabase.from('profiles').update({ is_founder: true }).eq('id', СВОЙ_ID)
--
-- и станет основателем площадки. Проверять это надо при добавлении КАЖДОГО
-- поля, а не разбором раз в месяц (docs/CLAUDE.md, разбор 21.08).

-- ------------------------------------------------------------
-- 1. Колонка.

alter table public.profiles
  add column if not exists is_founder boolean not null default false;

comment on column public.profiles.is_founder is
  'Основатель площадки. Про идентичность, не про права — права живут в is_admin.';

-- ------------------------------------------------------------
-- 2. Защита от самоназначения.
--
-- Молчаливый откат, а не ошибка, — как у protect_is_verified и
-- protect_is_creator: ошибка означала бы, что сохранение ВСЕГО профиля
-- падает из-за поля, которого человек в форме даже не видел.
--
-- Условие «auth.role() = authenticated» читается как «правит человек из
-- браузера». Наш сервер под служебным ключом и миграции сюда не попадают
-- намеренно — иначе назначить основателя было бы нечем.

create or replace function public.protect_is_founder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_founder is distinct from old.is_founder
     and auth.role() = 'authenticated'
     and auth.uid() is not null
  then
    new.is_founder := old.is_founder;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_is_founder on public.profiles;
create trigger profiles_protect_is_founder
  before update on public.profiles
  for each row execute function public.protect_is_founder();

-- ------------------------------------------------------------
-- 3. Назначаем владельца.
--
-- По имени, а не по id: id у preview и прода разные, а имя одно и то же —
-- и оно зарезервировано (username_reserved, 20260821190000), то есть занять
-- его посторонний не может. Тот же приём, что в 20260730140000, где
-- назначался первый админ.
--
-- ⚠️ Строка выполняется ДО создания триггера? Нет, после — и это нарочно
-- работает: триггер пропускает изменения, сделанные НЕ из браузера, а
-- миграция идёт под ролью владельца базы.

update public.profiles
   set is_founder = true
 where username_lower = 'soucampus';

-- ------------------------------------------------------------
-- 4. Наружу — через представление.
--
-- ⚠️ create or replace view НЕ УМЕЕТ добавлять колонку в середину и часто
-- отказывается добавлять её вовсе («cannot change name of view column»).
-- Поэтому drop + create, как в 20260821160000. И поэтому же обязателен
-- grant следом: drop сносит права вместе с представлением, а без них
-- аноним перестанет видеть профили — выглядеть это будет как «сломались
-- все страницы карт», а не как забытый grant.

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
    is_founder,
    name_color,
    public.profile_is_client(id) as is_client
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Журнал прогонов (docs/RULES.md → «Миграции»).

insert into ops.applied_migrations (version) values ('20260823130000_founder_role')
on conflict do nothing;
