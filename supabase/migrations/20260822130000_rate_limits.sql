-- Сколько можно писать и жать — 2026-08-22.
--
-- ЗАЧЕМ. Комментарий и реакция пишутся в базу ПРЯМО ИЗ БРАУЗЕРА
-- (CommentSection.tsx, ReactionButton.tsx): нашего кода в этом пути нет,
-- поставить ограничение в обработчике негде — обработчика не существует.
-- До сегодня ограничения не было вообще никакого: любой вошедший мог
-- залить ленту карты тысячей строк за минуту.
--
-- ПОЧЕМУ В БАЗЕ. Правило, выученное за 20–21 августа пять раз подряд:
-- запрет ставится там, где стоит разрешение. Разрешение писать
-- комментарий — политика "insert own comment if bought". Значит и
-- ограничение живёт рядом с ней, а не в интерфейсе: заблокированное поле
-- обходится инструментами разработчика за секунду.
--
-- ⚠️ ЭТОТ МЕХАНИЗМ В ПРОЕКТЕ УЖЕ ЕСТЬ, просто он не назывался
-- ограничением частоты. guard_username_change (20260821140000) — пауза
-- «не чаще раза в 30 дней», сделанная ровно так же: триггер, интервал,
-- отказ с понятным текстом. Здесь тот же приём с другими числами.

-- ------------------------------------------------------------
-- 1. Индексы под сам подсчёт.
--
-- Триггер на КАЖДОЙ вставке спрашивает «сколько этот человек написал за
-- час». Без индекса такой вопрос читает таблицу целиком, и защита от
-- нагрузки сама становится нагрузкой. Порядок колонок не случаен:
-- сначала user_id (точное совпадение), потом created_at (диапазон).

create index if not exists product_comments_author_recent_idx
  on public.product_comments (user_id, created_at desc);

create index if not exists product_reactions_author_recent_idx
  on public.product_reactions (user_id, created_at desc);

-- ------------------------------------------------------------
-- 2. Комментарии: не чаще раза в 20 секунд и не больше 10 в час.
--
-- ДВА ОГРАНИЧЕНИЯ, А НЕ ОДНО, потому что они ловят разное. Пауза в 20
-- секунд ловит скрипт: человек столько не печатает. Потолок в час ловит
-- терпеливого — того, кто выдерживает паузу, но пишет весь день.
--
-- ЧИСЛА ВЗЯТЫ ОТ ЖИВОГО ЧЕЛОВЕКА. Десять комментариев в час — это очень
-- разговорчивый посетитель: под каждой картой обсуждение, и всё равно
-- остаётся запас. Упереться в потолок случайно нельзя.
--
-- ⚠️ СЧИТАЮТСЯ И УДАЛЁННЫЕ ТОЖЕ. Иначе есть обход: написал — стёр —
-- написал снова, и счётчик всегда пустой. Удаление у нас мягкое, строка
-- остаётся на месте, поэтому считать её ничего не стоит.

create or replace function public.guard_comment_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  per_hour constant int := 10;
  min_gap  constant interval := interval '20 seconds';
  written  int;
  last_at  timestamptz;
begin
  -- Служебная роль — наш сервер и миграции — без ограничений. Тот же
  -- вырез, что у guard_username_change и guard_product_author_edit.
  if auth.role() <> 'authenticated' or auth.uid() is null then
    return new;
  end if;

  select count(*), max(created_at)
    into written, last_at
    from public.product_comments
   where user_id = auth.uid()
     and created_at > now() - interval '1 hour';

  if last_at is not null and last_at > now() - min_gap then
    raise exception 'comment_too_fast'
      using errcode = 'check_violation';
  end if;

  if written >= per_hour then
    -- Число в тексте ошибки: форма показывает его человеку, и считать
    -- его второй раз на клиенте значило бы завести второе место, где
    -- живёт десятка. Тот же приём, что с датой в username_cooldown.
    raise exception 'comment_rate_limit:%', per_hour
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists product_comments_guard_rate on public.product_comments;
create trigger product_comments_guard_rate
  before insert on public.product_comments
  for each row execute function public.guard_comment_rate();

-- ------------------------------------------------------------
-- 3. Реакции: не больше 30 новых в час.
--
-- Реакция дешевле комментария — она ничего не пишет на витрину, кроме
-- числа, — поэтому потолок выше и паузы между нажатиями нет: человек
-- листает каталог и жмёт подряд, это нормальное поведение.
--
-- ⚠️ ЧЕГО ЭТОТ ЛИМИТ НЕ ЛОВИТ, И ЭТО НАДО ЗНАТЬ. Реакция снимается
-- удалением строки (primary key (product_id, user_id) — одна на карту).
-- Значит «нажал — снял — нажал» не увеличивает счёт: строка то есть, то
-- нет. Поймать такое можно только отдельным журналом нажатий, а он стоит
-- таблицы, которая растёт вечно. Не заводим сознательно: выгода
-- накрутчику нулевая (число на карте не меняется), вред — только записи
-- в базу. Лимит ловит другое и главное: «отреагировать на весь каталог
-- за минуту», то есть попытку разом накрутить витрину.

create or replace function public.guard_reaction_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  per_hour constant int := 30;
  pressed  int;
begin
  if auth.role() <> 'authenticated' or auth.uid() is null then
    return new;
  end if;

  select count(*)
    into pressed
    from public.product_reactions
   where user_id = auth.uid()
     and created_at > now() - interval '1 hour';

  if pressed >= per_hour then
    raise exception 'reaction_rate_limit:%', per_hour
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists product_reactions_guard_rate on public.product_reactions;
create trigger product_reactions_guard_rate
  before insert on public.product_reactions
  for each row execute function public.guard_reaction_rate();

-- ------------------------------------------------------------
-- Журнал прогонов (docs/RULES.md → «Миграции»).

insert into ops.applied_migrations (version) values ('20260822130000_rate_limits')
on conflict do nothing;
