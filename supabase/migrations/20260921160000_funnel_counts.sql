-- Воронка витрины: три числа одним запросом.
-- 2026-09-21.
--
-- Порядок прогона: любой, миграция только ДОБАВЛЯЕТ функцию. Но до
-- прогона панель воронки в админке будет пустой — она честно скажет,
-- что данных нет.
--
-- ------------------------------------------------------------
-- ПОЧЕМУ В БАЗЕ, А НЕ В TYPESCRIPT
-- ------------------------------------------------------------
-- Соблазн был посчитать в коде: вытащить строки page_views за период и
-- сгруппировать. Так уже сделаны топы карт и авторов в getOverview, и
-- на сегодняшних объёмах это работает.
--
-- Здесь так нельзя, и причина не в скорости. **PostgREST отдаёт не
-- больше 1000 строк за запрос.** page_views копится с 20 июля по всем
-- страницам портфолио и витрины; как только строк за период станет
-- больше тысячи, запрос молча вернёт первую тысячу, воронка посчитает
-- по ней и покажет правдоподобные, но неверные числа. Ошибка, которая
-- выглядит как работающая функция, — ровно то, что в этом проекте
-- ловили весь сентябрь.
--
-- Счёт уникальных посетителей — работа для базы: count(distinct) по
-- индексу вместо переноса строк по сети.
--
-- ------------------------------------------------------------
-- ⚠️ ЧТО ЭТИ ЧИСЛА ЗНАЧАТ, А ЧТО НЕТ
-- ------------------------------------------------------------
-- Единица счёта в page_views — БРАУЗЕР, а не человек (подписанная
-- cookie, тройка «страница + посетитель + день»). Телефон и ноутбук
-- одного человека — это двое. Это давнее свойство счётчика, записанное
-- в CLAUDE.md, и воронка его наследует.
--
-- Поэтому шага ДВА, а не три:
--   storefront → product   считается ПО ОДНОМУ И ТОМУ ЖЕ visitor_id,
--                          это настоящий переход одного браузера;
--   product → purchase     так НЕ считается и посчитан быть не может:
--                          у заказа нет visitor_id, связать покупку с
--                          браузером нечем.
--
-- Функция поэтому возвращает покупки отдельным числом и НЕ делит одно
-- на другое. Деление сделало бы «конверсию» из двух величин, посчитанных
-- в разных единицах, — то есть красивое число, которое ничего не
-- измеряет. Кому надо, поделит глазами, зная оговорку.

create or replace function public.funnel_counts(p_from date, p_to date)
returns table (
  storefront_visitors bigint,
  product_visitors    bigint,
  both_visitors       bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with in_range as (
    select visitor_id, path
      from public.page_views
     where day between p_from and p_to
       and (path = '/marketplace' or path like '/marketplace/%')
  ),
  storefront as (
    select distinct visitor_id from in_range where path = '/marketplace'
  ),
  products as (
    select distinct visitor_id from in_range where path <> '/marketplace'
  )
  select
    (select count(*) from storefront),
    (select count(*) from products),
    -- Пришёл на витрину И открыл хотя бы одну карту. Именно этот
    -- переход и есть единственный честный шаг воронки.
    (select count(*) from storefront s
      where exists (select 1 from products p where p.visitor_id = s.visitor_id));
$$;

-- ⚠️ Та же строка, что в каждой миграции с функцией, и по той же
-- причине: Postgres выдаёт execute роли PUBLIC ПО УМОЛЧАНИЮ. Без
-- revoke эту функцию звал бы любой посетитель из консоли браузера — а
-- page_views закрыта от браузера полностью, без единой политики, и
-- открывать к ней окно через security definer было бы обходом
-- собственной защиты.
revoke all on function public.funnel_counts(date, date) from public;
revoke all on function public.funnel_counts(date, date) from anon, authenticated;
grant execute on function public.funnel_counts(date, date) to service_role;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Журнал прогонов — последней строкой (docs/RULES.md → «Миграции»).
-- ------------------------------------------------------------
insert into ops.applied_migrations (version)
values ('20260921160000_funnel_counts')
on conflict (version) do nothing;
