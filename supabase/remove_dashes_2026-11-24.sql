-- Длинные тире из текстов в базе (решение владельца 24.11: «чтобы всё
-- казалось живым»). В коде сайта они убраны тем же днём; здесь — то, что
-- живёт в базе: работы портфолио и карты магазина. Отзывы — отдельным
-- файлом seed_reviews_2026-11-24.sql.
--
-- РАЗОВЫЙ скрипт. Сначала preview, потом прод.
--
-- ШАГ 1 — только посмотреть, что изменится (выделить и Run).
-- ШАГ 2 — правки. Известные тексты переписаны руками; всё, что найдётся
-- сверх них (работы, добавленные через админку только на проде), — общей
-- заменой « — » на «, ». После прогона ШАГ 1 должен вернуть ноль строк.

-- ---------- ШАГ 1 ----------
select 'project' as kind, slug, 'title' as field, title as text from public.projects where title like '%—%'
union all select 'project', slug, 'tag', tag from public.projects where tag like '%—%'
union all select 'project', slug, 'summary', summary from public.projects where summary like '%—%'
union all select 'project', slug, 'description', description from public.projects where description like '%—%'
union all select 'product', slug, 'title', title from public.products where title like '%—%'
union all select 'product', slug, 'summary', summary from public.products where summary like '%—%'
union all select 'product', slug, 'description', left(description, 300) from public.products where description like '%—%'
order by 1, 2, 3;


-- ---------- ШАГ 2 ----------
begin;

update public.projects set description = $t$A custom BlueSpawn build made for a marketplace, available for purchase by any player for $8.90. Bright, cozy and lively spawn: tropical vegetation, tidy layout and detailed locations that are a pleasure to explore. Built in a week.$t$
 where slug = 'bluespawn' and description like '%—%';

update public.projects set description = $t$A large-scale commission for a huge pirate-themed RPG map. Dozens of buildings, every location's exterior fully detailed: a lot of effort and care went into it. Bright, rich and genuinely massive map. Built over a month together with other builders.$t$
 where slug = 'pirate-rpg' and description like '%—%';

update public.projects set summary = $t$A detailed church on floating islands, an experiment and a passion project.$t$
 where slug = 'sky-cathedral' and summary like '%—%';
update public.projects set description = $t$A personal project with no client, built out of inspiration and as an experiment. A detailed church on floating islands surrounded by sakura trees. Built in a week.$t$
 where slug = 'sky-cathedral' and description like '%—%';

update public.projects set summary = $t$A set of self-contained biome islands (forest, canyon, snow and more) built as ready-to-drop plots.$t$
 where slug = 'driftstone-isles' and summary like '%—%';
update public.projects set description = $t$A commission for a set of standalone islands, each its own 150×150 biome (verdant forest, red canyon, snowy peak and others), designed to be dropped into a world as ready-made plots. Presented together as a single render. Built in about a week and a half.$t$
 where slug = 'driftstone-isles' and description like '%—%';

-- Ironholt: текст длинный и в базе мог меняться — меняем только тире,
-- точечно: «population — orcs» → «population: orcs», остальные — запятой.
update public.projects
   set description = replace(replace(description, 'population — orcs', 'population: orcs'), ' — ', ', ')
 where slug = 'ironholt' and description like '%—%';

-- Всё остальное — общей заменой. Одиночное «—» (прочерк в цене или
-- размере) не трогается: в шаблоне пробелы с обеих сторон.
update public.projects set title = replace(title, ' — ', ', ') where title like '% — %';
update public.projects set tag = replace(tag, ' — ', ', ') where tag like '% — %';
update public.projects set summary = replace(summary, ' — ', ', ') where summary like '% — %';
update public.projects set description = replace(description, ' — ', ', ') where description like '% — %';
update public.products set title = replace(title, ' — ', ', ') where title like '% — %';
update public.products set summary = replace(summary, ' — ', ', ') where summary like '% — %';
update public.products set description = replace(description, ' — ', ', ') where description like '% — %';

commit;
