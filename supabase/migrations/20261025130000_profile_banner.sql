-- ============================================================
-- Баннер профиля + дата регистрации наружу — 2026-10-25.
--
-- Профиль переделан по образцу BuiltByBit (просьба владельца 25.10):
-- широкий баннер сверху, большой квадратный аватар, «Joined: …».
--
-- ⚠️ ИДЁТ ДО ДЕПЛОЯ — файл только ДОБАВЛЯЕТ (колонку, право, две колонки
-- представления). Код при этом переживает и обратный порядок: creators.ts
-- откатывается на прежний набор колонок, если базе новые незнакомы.
-- Сначала preview, потом прод (docs/RULES.md). Файл перезапускаемый.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Колонка.
-- ------------------------------------------------------------
alter table public.profiles add column if not exists banner_url text;

-- ------------------------------------------------------------
-- 2. Баннер — только наш. Та же проверка, что profiles_avatar_url_own
--    (20260915120000), и по той же причине: баннер видит каждый, кто
--    открыл профиль, значит браузер каждого идёт по этому адресу. Впиши
--    туда свой сервер — и собирай IP посетителей.
--
-- Файл лежит в бакете avatars, в папке человека (<id>/banner), — поэтому
-- регулярка дословно повторяет аватарную. Отдельный бакет потребовал бы
-- своих политик чтения и своего места в уборке, ничего не добавив.
--
-- Лого сайта ("/…") с галочкой здесь НЕ разрешено, в отличие от аватара:
-- у аватара это бренд SouCampus, у баннера такой нужды нет.
--
-- ⚠️ Адреса проектов вписаны явно — разбор там же, в 20260915120000.
-- Появится свой домен Storage — дописать сюда и туда.
-- ------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_banner_url_own;
alter table public.profiles
  add constraint profiles_banner_url_own check (
    banner_url is null
    or banner_url ~ (
      '^https://(pogwmoyrpaxxwkwhzjcv|gmspmvnrzavxcbiqlhob)\.supabase\.co'
      || '/storage/v1/object/public/avatars/' || id::text || '/'
    )
  );

-- ------------------------------------------------------------
-- 3. Право на колонку. С 15.09 новая колонка profiles закрыта для
--    браузера по умолчанию — без этой строки форма настроек получила бы
--    отказ прав 42501 на первом же сохранении.
--
-- grant ДОБАВЛЯЕТ право к уже выданным шести колонкам, а не заменяет их.
-- ------------------------------------------------------------
grant update (banner_url) on table public.profiles to authenticated;

-- ------------------------------------------------------------
-- 4. Представление: + banner_url, + created_at («Joined: …»).
--
-- drop + create, а не create or replace: новую колонку в середину
-- replace не добавит (разбор — 20260823130000). И сразу revoke all →
-- grant select: drop сносит права, а без revoke представление снова
-- стало бы обновляемым снаружи (дыра, закрытая 20260922120000).
--
-- created_at — не личное: дату регистрации показывает любая площадка, и
-- ничего, кроме дня, она о человеке не говорит.
-- ------------------------------------------------------------
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
    public.profile_is_client(id) as is_client,
    banner_url,
    created_at
  from public.profiles;

revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Журнал прогонов — последней строкой (docs/RULES.md → «Миграции»).
-- ------------------------------------------------------------
insert into ops.applied_migrations (version)
values ('20261025130000_profile_banner')
on conflict (version) do nothing;
