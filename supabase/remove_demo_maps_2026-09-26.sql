-- ============================================================
-- Снести десять демо-карт витрины перед живыми платежами.
-- РАЗОВЫЙ скрипт, НЕ миграция (тот же довод, что у
-- cleanup_products_2026-08-16.sql: удаление данных не должно однажды
-- повториться само на базе, где карты уже настоящие).
--
-- Решение владельца 2026-09-26. Причина — CLAUDE.md, «Хвосты», п. 6:
-- у этих карт file_path = null, и в живом режиме человек заплатил бы и
-- не получил ничего.
--
-- Запускать в SQL-редакторе Supabase по одной базе: сначала preview,
-- потом прод. Файл перезапускаемый: второй прогон ничего не находит и
-- ничего не удаляет.
--
-- ЧТО УДАЛЯЕТ:
--   - карты из списка ниже, У КОТОРЫХ НЕТ ФАЙЛА. ⚠️ Если в какую-то из
--     них уже загружен настоящий файл, она остаётся — это страховка от
--     удаления карты, которую владелец успел превратить в настоящую;
--   - строки заказов на них и заказы, оставшиеся после этого пустыми.
--     Все такие заказы — тестовые (Stripe в тест-режиме, настоящих
--     платежей не было ни разу) или бесплатные получения демо-карт.
--     order_items ссылается на карту с `on delete restrict`, поэтому
--     без этого база карту не отдаст — и это правильно для настоящих
--     покупок, которых здесь нет;
--   - всё остальное (галереи, оценки, реакции, комментарии, журнал
--     модерации) уходит каскадом; в журнале скачиваний карта станет
--     null, строки останутся.
--
-- ЧЕГО НЕ ТРОГАЕТ: карты вне списка (в том числе TestProd — его снять
-- отдельно, см. OWNER-TASKS.md), аккаунты, профили, уведомления.
-- Картинки демо-карт — статические файлы сайта (/portfolio/…), в
-- Storage их нет, чистить там нечего.
-- ============================================================

begin;

create temporary table demo_maps on commit drop as
select id, slug
  from public.products
 where slug in (
   'emberfall-manor',
   'skyhold-sanctuary',
   'prismport-hub',
   'amethyst-grove',
   'dragon-shrine',
   'arena-atoll',
   'porto-fiorenza',
   'duskspire-interiors',
   'frostwick-holiday-props',
   'pixelmone-starter-assets'
 )
   and file_path is null;

-- Заказы, которых коснётся удаление, — запомнить до удаления строк.
create temporary table touched_orders on commit drop as
select distinct oi.order_id
  from public.order_items oi
  join demo_maps d on d.id = oi.product_id;

delete from public.order_items
 where product_id in (select id from demo_maps);

-- Удаляем только заказы, в которых после этого не осталось ничего. Заказ,
-- где рядом с демо-картой лежала настоящая, остаётся с настоящей.
delete from public.orders o
 where o.id in (select order_id from touched_orders)
   and not exists (select 1 from public.order_items oi where oi.order_id = o.id);

delete from public.products
 where id in (select id from demo_maps);

-- Ответ одним select — редактор показывает только последний результат
-- (CLAUDE.md, «Как узнать, что прогнано на проде»). Ждём 0 оставшихся
-- демо-карт без файла; kept_with_file > 0 — значит, какую-то из них
-- владелец снабдил файлом, и она сохранена намеренно.
select
  (select count(*) from public.products
    where slug in ('emberfall-manor','skyhold-sanctuary','prismport-hub',
                   'amethyst-grove','dragon-shrine','arena-atoll',
                   'porto-fiorenza','duskspire-interiors',
                   'frostwick-holiday-props','pixelmone-starter-assets')
      and file_path is null)                         as demo_left,
  (select count(*) from public.products
    where slug in ('emberfall-manor','skyhold-sanctuary','prismport-hub',
                   'amethyst-grove','dragon-shrine','arena-atoll',
                   'porto-fiorenza','duskspire-interiors',
                   'frostwick-holiday-props','pixelmone-starter-assets')
      and file_path is not null)                     as kept_with_file,
  (select count(*) from public.products)             as products_total;

commit;
