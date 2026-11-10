-- ============================================================
-- checks.sql — сверка живой базы с миграциями. ТОЛЬКО ЧТЕНИЕ.
-- Аудит 2026-11, блок B. Ни один запрос ничего не меняет.
--
-- Как пользоваться: Supabase → SQL Editor, вставлять по одному разделу,
-- сначала на preview, потом на проде. У каждого раздела написано, что
-- должно получиться. Всё, что отличается, — записать с ИМЕНЕМ БАЗЫ
-- (RULES.md: «факт о базе записывается с именем базы»).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Таблицы без RLS.
-- ОЖИДАЕТСЯ: ноль строк.
-- ------------------------------------------------------------
select n.nspname as schema, c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname in ('public', 'ops')
  and not c.relrowsecurity
order by 1, 2;

-- ------------------------------------------------------------
-- 2. Все политики в public и ops.
-- ОЖИДАЕТСЯ ровно этот набор (11 строк), все — SELECT:
--   creator_applications  read own application
--   notifications         read own notifications
--   product_images        creators read images of own products
--   product_images        public read images of live products
--   product_ratings       read own ratings
--   product_reactions     public read reactions
--   products              creators read own products
--   products              public read live
--   profiles              own profile read
--   project_images / projects / reviews / stats   public read  (4 строки)
--   reaction_options      public read reaction options
-- и ОДНА на запись:
--   profiles              own profile update   (UPDATE)
-- Любая другая строка, особенно с cmd <> 'SELECT', — политика, созданная
-- руками в дашборде. Это находка.
-- ------------------------------------------------------------
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname in ('public', 'ops')
order by tablename, policyname;

-- ------------------------------------------------------------
-- 3. Политики Storage.
-- ОЖИДАЕТСЯ: только SELECT-политики «avatars public read» и
-- «product-images public read» (о них — находка S-15). Ни одной на запись.
-- ------------------------------------------------------------
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- ------------------------------------------------------------
-- 4. Бакеты.
-- ОЖИДАЕТСЯ: avatars (public, 10 МБ, 4 типа картинок),
--   product-images (public, 10 МБ, 4 типа), portfolio-images (public,
--   10 МБ, 4 типа), product-files (PRIVATE, 15 МБ).
-- Пустые file_size_limit / allowed_mime_types у первых двух и у
-- product-files значат, что миграция 20261101120000 на этой базе не прогнана.
-- ------------------------------------------------------------
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
order by id;

-- ------------------------------------------------------------
-- 5. Функции в public: кто может вызвать.
-- ОЖИДАЕТСЯ, что anon_can / auth_can = true ТОЛЬКО у:
--   get_product_stats, get_reaction_counts, get_comment_counts,
--   profile_is_client, username_available, username_reserved   (оба true)
--   has_purchased                                              (только auth)
--   array_within, profile_links_valid                          (безвредные, оба true)
--   и у триггерных функций (returns trigger) — их напрямую вызвать нельзя.
-- ОБЯЗАНЫ быть false/false:
--   record_paid_order, has_purchased_for, soft_delete_comment,
--   soft_delete_comment_for, consume_rate_limit, funnel_counts,
--   replace_product_images
-- Любая ДРУГАЯ не-триггерная функция с true — находка.
-- Колонка search_path пустая у security definer функции — тоже находка.
-- ------------------------------------------------------------
select
  p.proname                                              as function_name,
  pg_get_function_identity_arguments(p.oid)              as args,
  pg_get_function_result(p.oid)                          as returns,
  p.prosecdef                                            as security_definer,
  (select string_agg(c, ', ') from unnest(p.proconfig) c) as search_path,
  has_function_privilege('anon', p.oid, 'execute')          as anon_can,
  has_function_privilege('authenticated', p.oid, 'execute') as auth_can
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by (pg_get_function_result(p.oid) = 'trigger'), p.proname;

-- ------------------------------------------------------------
-- 6. Представления: чем читают и кто может.
-- ОЖИДАЕТСЯ: public_profiles, public_comments, public_reviews —
--   anon/auth: только SELECT (insert/update/delete = false).
--   page_view_counts, site_view_counts — всё false.
-- ------------------------------------------------------------
select
  c.relname as view_name,
  c.reloptions,
  has_table_privilege('anon', c.oid, 'select')          as anon_select,
  has_table_privilege('anon', c.oid, 'insert')          as anon_insert,
  has_table_privilege('anon', c.oid, 'update')          as anon_update,
  has_table_privilege('anon', c.oid, 'delete')          as anon_delete,
  has_table_privilege('authenticated', c.oid, 'select') as auth_select,
  has_table_privilege('authenticated', c.oid, 'insert') as auth_insert,
  has_table_privilege('authenticated', c.oid, 'update') as auth_update,
  has_table_privilege('authenticated', c.oid, 'delete') as auth_delete
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('v', 'm')
order by 1;

-- ------------------------------------------------------------
-- 7. Какие колонки profiles может править вошедший человек.
-- ОЖИДАЕТСЯ ровно восемь: avatar_url, banner_url, bio, first_name,
--   last_name, links, name_color, username.
-- is_admin, is_creator, is_verified, is_founder, username_claimed,
-- submissions_blocked_until и любые другие здесь — находка 🔴.
-- ------------------------------------------------------------
select column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'profiles'
  and grantee in ('authenticated', 'anon', 'PUBLIC')
  and privilege_type = 'UPDATE'
order by 1;

-- ------------------------------------------------------------
-- 8. Закрытые таблицы: у anon/authenticated не должно быть прав вовсе.
-- ОЖИДАЕТСЯ: во всех колонках false.
-- (orders, order_items, moderation_log закрыты только отсутствием
-- политик — права таблицы у них могут быть true, это не дыра, но
-- строка покажет, где защита в один слой.)
-- ------------------------------------------------------------
select
  n.nspname || '.' || c.relname as table_name,
  has_table_privilege('anon', c.oid, 'select')          as anon_select,
  has_table_privilege('authenticated', c.oid, 'select') as auth_select,
  has_table_privilege('authenticated', c.oid, 'insert') as auth_insert,
  has_table_privilege('authenticated', c.oid, 'update') as auth_update,
  has_table_privilege('authenticated', c.oid, 'delete') as auth_delete
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and (n.nspname = 'ops' or c.relname in (
    'orders', 'order_items', 'download_events', 'moderation_log',
    'discord_inbox', 'discord_posts', 'product_comments', 'page_views'
  ))
order by 1;

-- ------------------------------------------------------------
-- 9. Триггеры на products и profiles.
-- ОЖИДАЕТСЯ на products: a_products_clear_deleted_by,
--   a_products_guard_insert, a_products_mark_approved,
--   b_products_author_edit, products_guard_state,
--   products_set_updated_at, products_stamp_published_at.
-- На profiles: profiles_guard_reserved_username,
--   profiles_guard_username_change, profiles_protect_is_admin,
--   profiles_protect_is_creator, profiles_protect_is_founder,
--   profiles_protect_is_verified, profiles_protect_name_color,
--   profiles_protect_submission_block, profiles_set_updated_at,
--   profiles_sync_products_creator_active, profiles_welcome_notification.
-- Все должны быть enabled = 'O'. Отсутствующий или 'D' — находка.
-- ------------------------------------------------------------
select c.relname as table_name, t.tgname, t.tgenabled as enabled
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('products', 'profiles', 'notifications', 'product_comments')
  and not t.tgisinternal
order by 1, 2;

-- ------------------------------------------------------------
-- 10. Журнал миграций против папки.
-- Сравнить с `ls supabase/migrations` (журнал начинается с 20260822120000).
-- На проде ожидается отсутствие 20261101120000_upload_bucket_limits
-- (CLAUDE.md: ждёт прогона). Любое другое расхождение — находка.
-- ------------------------------------------------------------
select version, applied_at from ops.applied_migrations order by version;

-- ------------------------------------------------------------
-- 11. Что отдаёт Realtime.
-- ОЖИДАЕТСЯ: одна таблица — public.notifications.
-- ------------------------------------------------------------
select schemaname, tablename from pg_publication_tables
where pubname = 'supabase_realtime';

-- ------------------------------------------------------------
-- 12. Кто админ, основатель, креатор.
-- ОЖИДАЕТСЯ: is_admin и is_founder — только вы. Список креаторов —
-- только те, чьи заявки вы одобряли.
-- ------------------------------------------------------------
select id, username, is_admin, is_founder, is_creator, is_verified
from public.profiles
where is_admin or is_founder or is_creator or is_verified
order by is_admin desc, is_founder desc, username;

-- ------------------------------------------------------------
-- 13. Данные для находок блока A.
-- ------------------------------------------------------------
-- S-08: гостевые заказы. ОЖИДАЕТСЯ 0 (или только старые тестовые).
select count(*) as guest_orders from public.orders where user_id is null;

-- S-09: цены, на которых Stripe откажет. ОЖИДАЕТСЯ ноль строк.
select slug, price_cents, state from public.products
where price_cents between 1 and 49;

-- S-09: живые карты с полным адресом обложки — на них проверить покупку.
select slug, image_url from public.products
where image_url like 'http%' and state = 'live';

-- S-01 / S-13: карты, у которых файл менялся после одобрения, найти
-- запросом нельзя (истории пути нет). Косвенно: живые и спрятанные карты
-- чужих креаторов, правленные позже публикации.
select p.slug, p.state, p.published_at, p.updated_at, pr.username
from public.products p
join public.profiles pr on pr.id = p.creator_id
where p.state in ('live', 'hidden')
  and not pr.is_admin
  and p.updated_at > p.published_at + interval '5 minutes'
order by p.updated_at desc;

-- S-05: «покупки» собственных карт.
select o.id, o.created_at, o.stripe_session_id, p.slug
from public.orders o
join public.order_items oi on oi.order_id = o.id
join public.products p on p.id = oi.product_id
where o.user_id = p.creator_id;
