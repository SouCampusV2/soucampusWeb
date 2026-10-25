-- Ссылка на страницу, где работу из портфолио можно купить (2026-10-25).
--
-- Две работы — премейды, которые продаёт ЗАКАЗЧИК на BuiltByBit:
-- Redspire Commons и BlueSpawn (там она теперь называется Green Island).
-- Описание обещает «any player can now buy it», а дойти до покупки было
-- нельзя. Ссылка — факт о работе, как размер или срок, поэтому живёт в
-- той же строке, а не в коде рядом с ней.
--
-- ⚠️ ДОБАВЛЯЕТ колонку, которую код начинает запрашивать сразу, — значит
-- идёт ДО деплоя: сначала preview, потом прод. Задеплоишь раньше —
-- getAllProjects получит ошибку «нет колонки» и уронит портфолио целиком
-- (он падает намеренно, см. src/lib/projects.ts).
-- Перезапускаемо: if not exists, drop constraint if exists, update по slug.

alter table public.projects
  add column if not exists listing_url text;

-- Только https. Адрес печатается в href на странице работы, и без этой
-- проверки опечатка (адрес без протокола стал бы относительной ссылкой
-- на наш сайт) или javascript: ушли бы в разметку как есть.
alter table public.projects
  drop constraint if exists projects_listing_url_https;
alter table public.projects
  add constraint projects_listing_url_https
  check (listing_url is null or listing_url ~ '^https://');

update public.projects
  set listing_url = 'https://builtbybit.com/resources/red-kingdom-spawn.132515/'
  where slug = 'redspire-commons';

update public.projects
  set listing_url = 'https://builtbybit.com/resources/green-island-spawn-map.103050/'
  where slug = 'bluespawn';

notify pgrst, 'reload schema';

-- Проверка, ждём две строки:
-- select slug, listing_url from public.projects where listing_url is not null;

-- ------------------------------------------------------------
-- Журнал прогонов — последней строкой (docs/RULES.md → «Миграции»).
-- ------------------------------------------------------------
insert into ops.applied_migrations (version)
values ('20261025120000_project_listing_url')
on conflict do nothing;
