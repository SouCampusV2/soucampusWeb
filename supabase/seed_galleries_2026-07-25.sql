-- Доборы галерей (2026-07-25).
-- Прогнать в Supabase SQL Editor: СНАЧАЛА preview, ПОТОМ прод.
-- ВАЖНО: запускать ПОСЛЕ seed_portfolio_2026-07-25.sql — здесь есть галерея
-- для yuletide-isle, а сам проект создаётся тем файлом.
--
-- Идемпотентно: у project_images нет unique-ограничения на (project_id, url),
-- поэтому сначала чистим галерею этих проектов, потом вставляем заново —
-- повторный прогон не наплодит дубликатов.
--
-- emberfall-manor — тот же остров, что yuletide-isle, в другой (осенней)
-- теме, поэтому это фото галереи, а не отдельный проект.

delete from public.project_images
where project_id in (
  select id from public.projects
  where slug in ('hollowpeak-hold', 'pirate-rpg', 'yuletide-isle')
);

insert into public.project_images (project_id, url, position)
values
  ((select id from public.projects where slug = 'hollowpeak-hold'), '/portfolio/hollowpeak-hold-2.png', 0),
  ((select id from public.projects where slug = 'hollowpeak-hold'), '/portfolio/hollowpeak-hold-3.png', 1),
  ((select id from public.projects where slug = 'hollowpeak-hold'), '/portfolio/hollowpeak-hold-4.png', 2),
  ((select id from public.projects where slug = 'pirate-rpg'),      '/portfolio/pirate-rpg-2.jpeg',    0),
  ((select id from public.projects where slug = 'yuletide-isle'),   '/portfolio/emberfall-manor.png',  0);
