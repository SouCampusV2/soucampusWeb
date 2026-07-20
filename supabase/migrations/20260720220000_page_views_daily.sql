-- ============================================================
-- page_views: строка на день, а не одна навсегда.
--
-- Зачем. Раньше уникальность держалась на паре (path, visitor_id):
-- пришёл повторно — новой записи нет. Это давало "уникальных за всё
-- время", но делало невозможным "за сегодня": если человек был вчера и
-- зашёл снова сегодня, следа сегодняшнего визита в базе просто нет.
--
-- Теперь ключ — тройка (path, visitor_id, day). Один человек на одной
-- странице за сутки по-прежнему считается один раз, но каждый новый
-- день оставляет собственную отметку, и периоды становятся считаемыми.
--
-- Плата за это: "за всё время" больше НЕ равно числу строк. Один
-- посетитель за пять дней даст пять строк, а посчитать его надо как
-- одного — отсюда count(distinct visitor_id) во всех представлениях
-- ниже вместо простого count(*).
-- ============================================================

alter table public.page_views
  add column day date not null default current_date;

-- Уже накопленные строки: день берём из времени создания, а не
-- оставляем сегодняшний по умолчанию — иначе старые визиты задним
-- числом стали бы "сегодняшними" и первый же отчёт соврал бы.
update public.page_views set day = created_at::date;

drop index if exists public.page_views_unique_visitor;

create unique index page_views_unique_visitor_day
  on public.page_views (path, visitor_id, day);

-- Под запросы "за период": сначала отбор по дате, потом уникальные.
create index page_views_day_idx on public.page_views (day);


-- ------------------------------------------------------------
-- Просмотры конкретной страницы, за всё время.
-- Кормит бейджи на карточках работ и на странице работы.
-- ------------------------------------------------------------
create or replace view public.page_view_counts as
  select path, count(distinct visitor_id)::bigint as views
  from public.page_views
  group by path;


-- ------------------------------------------------------------
-- Уникальные посетители ВСЕГО САЙТА по периодам — одна строка с
-- четырьмя числами. Человек, обошедший восемь страниц, везде
-- считается как один: distinct по visitor_id, а не сумма по страницам.
--
-- Границы периодов — по дате сервера (UTC), а не по часовому поясу
-- посетителя. Для счётчика на витрине этого достаточно, а привязка к
-- зоне смотрящего сделала бы число разным у разных людей.
-- ------------------------------------------------------------
create or replace view public.site_view_counts as
  select
    (select count(distinct visitor_id) from public.page_views)::bigint
      as all_time,
    (select count(distinct visitor_id) from public.page_views
      where day = current_date)::bigint
      as today,
    -- 6, а не 7: сегодня входит в неделю, иначе получится 8 дней.
    (select count(distinct visitor_id) from public.page_views
      where day >= current_date - 6)::bigint
      as week,
    (select count(distinct visitor_id) from public.page_views
      where day >= current_date - 29)::bigint
      as month;

-- Читает их сервер под служебным ключом, анониму доступ не нужен.
revoke all on public.page_view_counts from anon, authenticated;
revoke all on public.site_view_counts from anon, authenticated;
