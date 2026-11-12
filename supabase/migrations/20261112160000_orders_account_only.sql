-- ============================================================
-- Заказ принадлежит аккаунту, а не почте.
-- 2026-11-12, аудит безопасности, находка S-08 (решение владельца 12.11).
--
-- ЧТО БЫЛО. С июля, когда покупать можно было без входа, осталось
-- правило: заказ без аккаунта («гостевой», user_id пуст) считается
-- принадлежащим любому, кто войдёт с той же почтой. С 24.07 без аккаунта
-- не купить, новых таких заказов не появляется, а правило жило в четырёх
-- местах: в списке покупок и скачивании (код) и в трёх функциях базы
-- (has_purchased, has_purchased_for, profile_is_client).
--
-- ЧЕМ ОПАСНО. Сегодня — почти ничем: почту надо подтвердить. Но у
-- orders.user_id стоит `on delete set null`: удалили аккаунт — заказ
-- остаётся как финансовая запись и становится «гостевым». Следующий
-- человек, зарегистрировавшийся на эту почту, получал бы чужие покупки,
-- право на отзыв и роль Client. Удаления аккаунта пока нет, и закрыть
-- это надо ДО того, как оно появится.
--
-- ЧТО МЕНЯЕТСЯ. Два шага, и порядок между ними — смысл миграции:
--   1) старые заказы без аккаунта ОДИН РАЗ привязываются к аккаунту с
--      той же почтой — никто ничего не теряет;
--   2) правило «по почте» убирается из трёх функций.
-- После этого заказ без user_id не принадлежит никому: он остаётся в
-- бухгалтерии, но доступа не даёт.
--
-- ⚠️ СРОК: ДО ДЕПЛОЯ. Новый код ищет покупки только по аккаунту. Если
-- задеплоить его раньше, владелец старого гостевого заказа не увидит
-- покупку, пока шаг 1 не привяжет её. Старому коду миграция не мешает:
-- привязанный заказ он находит по аккаунту, как любой другой.
-- Сначала preview, потом прод (docs/RULES.md → «Миграции»).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Привязать старые заказы к аккаунтам.
--
-- Сравнение без учёта регистра: почту в заказ пишет Stripe, в аккаунт —
-- Supabase, и «Name@x.com» с «name@x.com» — один ящик.
--
-- Берём только ПОДТВЕРЖДЁННЫЕ аккаунты (email_confirmed_at): именно это
-- условие и защищало правило раньше — чужую почту нельзя было занять,
-- не получив письма. Заказы, которым пары не нашлось, остаются как есть
-- (запрос в конце покажет, сколько их).
--
-- Перезапуск безопасен: трогаются только строки с пустым user_id.
-- ------------------------------------------------------------
update public.orders o
   set user_id = u.id
  from auth.users u
 where o.user_id is null
   and u.email_confirmed_at is not null
   and lower(u.email) = lower(o.customer_email);

-- ------------------------------------------------------------
-- 2. Три функции — только по аккаунту.
--
-- Сигнатуры НЕ меняются, поэтому `create or replace` и права (grant /
-- revoke из прежних миграций) сохраняются сами. У has_purchased_for
-- остаётся параметр p_email, хотя он больше не читается: код зовёт её с
-- тремя аргументами, и смена сигнатуры потребовала бы точного порядка
-- «миграция — деплой» без единой щели.
-- ------------------------------------------------------------

-- Было: 20260726140000_has_purchased_fn.sql.
create or replace function public.has_purchased(p_product_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = p_product_id
      and o.status = 'paid'
      and o.user_id = auth.uid()
  );
$$;

-- Было: 20260921120000_social_gateway_functions.sql.
create or replace function public.has_purchased_for(
  p_product_id uuid,
  p_user_id    uuid,
  p_email      text
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = p_product_id
      and o.status = 'paid'
      and o.user_id = p_user_id
  );
$$;

-- Было: 20260820130000_profile_colors.sql.
create or replace function public.profile_is_client(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.orders o
    where o.status = 'paid'
      and o.user_id = p_user_id
  );
$$;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Проверка после прогона (только чтение, запустить отдельно):
--
--   -- 1. Заказы, оставшиеся без аккаунта: пары по почте не нашлось.
--   --    Тестовые — не страшно; настоящие — написать покупателю.
--   select id, customer_email, created_at, total_cents
--     from public.orders where user_id is null order by created_at;
--
--   -- 2. Права функций не изменились. Ожидается: has_purchased —
--   --    false/true, has_purchased_for — false/false, profile_is_client —
--   --    true/true.
--   select p.proname,
--          has_function_privilege('anon', p.oid, 'execute')          as anon_can,
--          has_function_privilege('authenticated', p.oid, 'execute') as auth_can
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.proname in ('has_purchased', 'has_purchased_for', 'profile_is_client');
-- ------------------------------------------------------------

insert into ops.applied_migrations (version)
values ('20261112160000_orders_account_only')
on conflict (version) do nothing;
