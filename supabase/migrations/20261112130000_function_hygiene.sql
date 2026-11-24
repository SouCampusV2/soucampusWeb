-- ============================================================
-- Гигиена функций. 2026-11-12, аудит безопасности, находки S-14 и S-16.
--
-- Две небольшие правки, обе ничего не добавляют и ничего не отнимают у
-- сайта: витрина и карточки читают ровно то же, что раньше.
--
-- ⚠️ СРОК: неважно, до деплоя или после — код от этой миграции не
-- зависит. Сначала preview, потом прод (docs/RULES.md → «Миграции»).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Счётчики витрины — только про то, что на витрине (S-14).
--
-- get_product_stats() открыта анониму намеренно: ею рисуются звёзды и
-- «N sold» на карточках. Но отдавала она строку на КАЖДУЮ карту в базе —
-- в очереди, спрятанную, снятую, удалённую: id и число продаж того, чего
-- сайт никому не показывает. Вызвать её может любой, у кого есть
-- публичный ключ из бандла.
--
-- Условие — то же, что в политике чтения «public read live» и в
-- getAllProducts (инвариант 11: формула видимости одна и повторяется
-- дословно). Зовут функцию только витрина и страница живой карты, им
-- другие строки и не были нужны.
--
-- Тело — дословно из 20260726120000_product_ratings.sql плюс одна
-- строка where. Сигнатура та же, поэтому create or replace, а права
-- (grant ... to anon, authenticated) сохраняются сами.
-- ------------------------------------------------------------
create or replace function public.get_product_stats()
returns table (
  product_id   uuid,
  rating_avg   numeric,
  rating_count bigint,
  sales_count  bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    coalesce(round(avg(r.stars)::numeric, 2), 0) as rating_avg,
    count(r.stars)                               as rating_count,
    coalesce((
      select sum(oi.quantity)
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = p.id and o.status = 'paid'
    ), 0)                                         as sales_count
  from public.products p
  left join public.product_ratings r on r.product_id = p.id
  where p.state = 'live' and p.creator_active
  group by p.id;
$$;

-- ------------------------------------------------------------
-- 2. У каждой функции — свой search_path (S-16).
--
-- search_path — это список схем, в которых Postgres ищет таблицу или
-- функцию, названную без схемы. Если он не задан у функции, берётся тот,
-- что у вызывающего, — и вызывающий может подставить в него свою схему
-- с объектом того же имени. У функций `security definer` он задан
-- везде (там это дыра); эти семь выполняются с правами вызывающего, и
-- дырой отсутствие не было. Закрываем как предупреждение, на которое
-- Supabase указывает в своём отчёте, чтобы список был пуст и новое
-- предупреждение в нём было заметно.
--
-- `public`, а не пустая строка: тела этих функций называют часть
-- объектов без схемы, и пустой путь их бы сломал.
--
-- alter function, а не пересоздание: тело не трогаем вовсе.
-- ------------------------------------------------------------
alter function public.set_updated_at()                    set search_path = public;
alter function public.guard_product_state()               set search_path = public;
alter function public.mark_product_approved()             set search_path = public;
alter function public.clear_deleted_by()                  set search_path = public;
alter function public.guard_reserved_username()           set search_path = public;
alter function public.username_reserved(text)             set search_path = public;
alter function public.array_within(text[], integer, integer) set search_path = public;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Проверка после прогона (только чтение, запустить отдельно):
--
--   -- 1. Функций без search_path в public не осталось. Ожидается 0 строк.
--   select p.proname from pg_proc p
--     join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proconfig is null;
--
--   -- 2. Счётчики отдают только живые карты. Ожидается 0.
--   select count(*) from public.get_product_stats() s
--     join public.products p on p.id = s.product_id
--    where not (p.state = 'live' and p.creator_active);
-- ------------------------------------------------------------

insert into ops.applied_migrations (version)
values ('20261112130000_function_hygiene')
on conflict (version) do nothing;
