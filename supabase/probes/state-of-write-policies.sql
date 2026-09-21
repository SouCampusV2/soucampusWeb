-- Один запрос, отвечающий «кто сейчас может писать из браузера».
-- 2026-09-21. Прогонять в SQL-редакторе — СНАЧАЛА на проде, потом на
-- preview (или наоборот, но по одному: редактор показывает результат
-- только ПОСЛЕДНЕГО запроса).
--
-- Зачем он появился. 21.09 выяснилось, что рассуждать об именах политик
-- нельзя: часть из них заведена руками в дашборде и называется не так,
-- как в наших миграциях, поэтому `drop policy if exists "имя"` молча
-- ничего не делал. А ещё две проверки в check:guards оказались зелёными
-- по посторонним причинам. Значит спрашивать надо базу, и спрашивать
-- ПРО СОСТОЯНИЕ, а не про наши ожидания.
--
-- Как читать ответ:
--   rls DISABLED у любой строки  → защиты нет вовсе, политики не важны;
--   policy с cmd <> SELECT       → из браузера в это место ещё пишут;
--   ни одной такой строки        → путь закрыт, шлюз единственная дверь.

select
  'policy' as kind,
  schemaname || '.' || tablename as object,
  cmd,
  policyname as name,
  array_to_string(roles, ',') as roles
from pg_policies
where (schemaname = 'storage' and tablename = 'objects')
   or (schemaname = 'public'
       and tablename in ('product_comments', 'product_ratings',
                         'product_reactions', 'notifications'))

union all

select
  'rls',
  n.nspname || '.' || c.relname,
  case when c.relrowsecurity then 'enabled' else 'DISABLED' end,
  '',
  ''
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where (n.nspname = 'public'
       and c.relname in ('product_comments', 'product_ratings',
                         'product_reactions', 'notifications'))
   or (n.nspname = 'storage' and c.relname = 'objects')

order by kind, object, cmd, name;
