-- ============================================================
-- Ссылка «Buy on BuiltByBit» у карты (2026-11-24, просьба владельца).
--
-- ЗАЧЕМ. Платная цена у креаторов закрыта (paid-maps.ts: выплат авторам
-- нет). Чтобы платную карту всё равно можно было продавать, автор ставит
-- ссылку на её страницу на BuiltByBit — и вместо «Add to cart» на нашей
-- странице появляется кнопка «Buy on BuiltByBit». Владельцу это тоже
-- пригодится, пока он не захочет продавать через себя.
--
-- ⚠️ СРОК: ДО ДЕПЛОЯ кода, который пишет buy_url. Чтение к пустой колонке
-- терпимо (products.ts → isMissingOptional), запись без колонки упадёт.
-- Сначала preview, потом прод.
--
-- Проверка в базе — только BuiltByBit по https: ссылку ставит автор, и
-- кнопка с нашей страницы не должна уводить на что угодно. Та же проверка
-- в шлюзе (map-submission.ts) даёт человеку понятную ошибку раньше.
-- ============================================================

alter table public.products
  add column if not exists buy_url text;

alter table public.products drop constraint if exists products_buy_url_check;
alter table public.products add constraint products_buy_url_check
  check (buy_url is null or buy_url ~ '^https://(www\.)?builtbybit\.com/[^\s]*$');

comment on column public.products.buy_url is
  'Страница карты на BuiltByBit. Есть — вместо покупки на сайте кнопка Buy on BuiltByBit.';

notify pgrst, 'reload schema';

insert into ops.applied_migrations (version)
values ('20261124120000_product_buy_url')
on conflict (version) do nothing;
