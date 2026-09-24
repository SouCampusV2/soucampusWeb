-- Три работы портфолио были записаны неверно: как личные проекты, с
-- другими размерами, сроками и ценами. На деле все три — заказы
-- (владелец, 2026-09-24):
--
--   Frostwick Holiday  — заказ, €300, 200×200, за неделю
--   Skyhold Sanctuary  — заказ, €150, 250×250, за неделю
--   Nova Ringport      — заказ, €500, 350×350, за три недели
--
-- Меняется и текст описания: в двух из трёх прямо стояло «personal
-- project» / «passion project», и страница работы спорила бы сама с
-- собой — тег «Order», а абзац ниже говорит «делал для себя».
--
-- Только данные, схема не трогается. Порядок относительно деплоя не
-- важен: код читает те же колонки. Сначала preview, потом прод.
-- Перезапускаемо: update по slug.

update public.projects set
  tag = 'Order',
  price_label = '€300', price_amount = 300,
  size_label = '200×200', size_x = 200, size_z = 200,
  deadline_label = '1 week', deadline_days = 7,
  description = 'A festive village of candy-striped cabins and frosted spires gathered around a massive decorated tree, with Santa''s sleigh crossing the night sky overhead. A seasonal commission, built in one week.'
where slug = 'frostwick-holiday';

update public.projects set
  tag = 'Order',
  price_label = '€150', price_amount = 150,
  size_label = '250×250', size_x = 250, size_z = 250,
  deadline_label = '1 week', deadline_days = 7,
  description = 'A chain of rugged floating islands connected by bridges and vines, crowned with a large stone-and-timber keep overlooking a green pine forest. A bigger, wilder companion piece to Sky Cathedral. Commissioned build, made in one week.'
where slug = 'skyhold-sanctuary';

update public.projects set
  tag = 'Order',
  price_label = '€500', price_amount = 500,
  size_label = '350×350', size_x = 350, size_z = 350,
  deadline_label = '3 weeks', deadline_days = 21,
  description = 'A sci-fi space station built around a massive control spire, wrapped in a luminous pink ring and orbited by drifting asteroids and a passing starship. A commission that stepped outside the usual fantasy style into neon and glow, built over three weeks.'
where slug = 'nova-ringport';

-- ------------------------------------------------------------
-- Журнал прогонов — последней строкой (docs/RULES.md → «Миграции»).
-- ------------------------------------------------------------
insert into ops.applied_migrations (version)
values ('20260924120000_three_orders_facts')
on conflict (version) do nothing;
