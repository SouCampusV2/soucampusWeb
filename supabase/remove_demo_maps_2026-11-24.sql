-- ============================================================
-- Снести демо-карты витрины: все карты БЕЗ ФАЙЛА.
-- 2026-11-24, в день живых платежей. Заменяет
-- remove_demo_maps_2026-09-26.sql — тот искал карты по списку слагов,
-- а на проде демо-карты лежат под другими адресами
-- (amethyst-grove-biome, dragon-shrine-ruin, skyhold-sanctuary-pack…):
-- он удалил бы две карты из десяти и молча оставил остальные.
--
-- ПРИЗНАК — file_path is null. Настоящую карту без файла не загрузить
-- (форма и шлюз требуют файл), значит, без файла лежат только засеянные
-- демо. У них купить можно, а скачать нечего — с живыми платежами это
-- деньги за пустоту.
--
-- РАЗОВЫЙ скрипт, НЕ миграция: удаление данных не должно однажды
-- повториться само. Запускать в SQL-редакторе по одной базе: сначала
-- preview, потом прод. Перезапускаемый: второй прогон ничего не найдёт.
--
-- ДВА ШАГА. Сначала выполнить только ШАГ 1 (выделить его и Run) и
-- посмотреть список. Всё в нём — демо? Тогда ШАГ 2.
--
-- ЧТО УДАЛЯЕТ ШАГ 2: карты без файла; строки заказов на них и заказы,
-- оставшиеся после этого пустыми (order_items ссылается на карту с
-- `on delete restrict` — без этого база карту не отдаст). Галереи,
-- оценки, реакции, комментарии, журнал модерации уходят каскадом; в
-- журнале скачиваний карта станет null.
--
-- ⚠️ СТОП-КРАН. Если на демо-карту есть ЖИВОЙ оплаченный заказ
-- (cs_live_…, status = 'paid') — значит, кто-то заплатил настоящими
-- деньгами за карту без файла. Такой заказ стирать нельзя: человеку
-- надо вернуть деньги в Stripe (Refund — вебхук сам переведёт заказ в
-- refunded). Шаг 2 в этом случае падает с ошибкой и ничего не удаляет.
-- Возвращённые (refunded) живые заказы остановкой не считаются, но и не
-- удаляются: они останутся как финансовая запись, а карта — вместе с
-- ними (restrict). Тогда скажите мне.
--
-- TestProd этим скриптом не трогается, если у него есть файл, — снять
-- его в /admin/products.
-- ============================================================


-- ---------- ШАГ 1: только посмотреть ----------
select p.slug,
       p.title,
       p.price_cents,
       p.state,
       (select count(*) from public.order_items oi
          join public.orders o on o.id = oi.order_id
         where oi.product_id = p.id
           and o.stripe_session_id like 'cs_live_%')            as live_orders,
       (select count(*) from public.order_items oi
         where oi.product_id = p.id)                             as all_orders
  from public.products p
 where p.file_path is null
 order by p.slug;


-- ---------- ШАГ 2: удалить ----------
begin;

create temporary table demo_maps on commit drop as
select id, slug
  from public.products
 where file_path is null;

do $$
begin
  if exists (
    select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
     where oi.product_id in (select id from demo_maps)
       and o.stripe_session_id like 'cs_live_%'
       and o.status = 'paid'
  ) then
    raise exception 'На демо-карту есть живой оплаченный заказ — сначала Refund в Stripe, удаление отменено';
  end if;
end $$;

-- Тестовые и бесплатные заказы на демо-карты — можно стереть. Живые
-- (cs_live_, уже refunded) остаются как финансовая запись.
create temporary table touched_orders on commit drop as
select distinct oi.order_id
  from public.order_items oi
  join demo_maps d on d.id = oi.product_id
  join public.orders o on o.id = oi.order_id
 where o.stripe_session_id not like 'cs_live_%';

delete from public.order_items
 where order_id in (select order_id from touched_orders)
   and product_id in (select id from demo_maps);

delete from public.orders o
 where o.id in (select order_id from touched_orders)
   and not exists (select 1 from public.order_items oi where oi.order_id = o.id);

-- Карта с оставшимся живым (возвращённым) заказом не удалится —
-- restrict; её пропускаем, чтобы не уронить всю транзакцию.
delete from public.products p
 where p.id in (select id from demo_maps)
   and not exists (select 1 from public.order_items oi where oi.product_id = p.id);

select
  (select count(*) from public.products where file_path is null) as left_without_file,
  (select count(*) from public.products)                         as products_total;

commit;
