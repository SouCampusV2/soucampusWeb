-- ============================================================
-- Состояние карты — шаг 2 из 2. Леса убраны.
--
-- Шаг 1 (миграция 20260815130000) завёл колонку state и сделал её
-- источником правды, но оставил старые четыре поля жить рядом: их
-- пересчитывал триггер, и потому весь ещё не переписанный код и все
-- политики продолжали работать как раньше. Это было сознательно —
-- переезд, который можно откатить, не трогая ничего.
--
-- Здесь эти леса снимаются: политики и код переходят на state, а
-- is_published / deleted_at / hidden_by / status удаляются. Решение
-- владельца 2026-08-16: живых карт и покупателей на проде нет, момент
-- для такой правки лучший, какой будет.
--
-- Почему не оставить «на всякий случай». Пока колонок пять, у карты пять
-- описаний одного факта, и совпадают они ровно до первой строки, которая
-- запишется мимо триггера. Именно из такой конструкции вырос баг, с
-- которого начался весь переезд («уже не удалена, но всё ещё снята»).
-- Дублирующее поле не страховка, а второй источник правды.
--
-- ------------------------------------------------------------
-- ЗАОДНО ЗАКРЫВАЕТСЯ ДЫРА, найденная при этой правке.
--
-- creator_active — колонка на самой карте (копия is_creator автора,
-- чтобы политика витрины не ходила в закрытую RLS profiles). Политика
-- "creators update own products" разрешает автору менять СВОЮ строку
-- целиком, а triggers до сегодня защищали только is_published и status.
-- creator_active не защищал никто.
--
-- То есть человек, у которого отозвали статус креатора, мог вернуть свои
-- карты на витрину одним запросом из консоли браузера:
--
--   await supabase.from('products')
--     .update({ creator_active: true }).eq('creator_id', МОЙ_ID)
--
-- Форма такого не отправляет, но форма тут и ни при чём: сессия и
-- публичный ключ лежат у пользователя, запрос уходит мимо неё. Ниже
-- guard_product_author_edit перечисляет ВСЕ поля состояния поимённо и
-- возвращает их из old — то есть закрывает не конкретный способ соврать,
-- а весь класс.
--
-- Правило миграций: сначала preview, потом прод (docs/RULES.md).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Правка карты автором — то же правило, но на state.
--
-- Заменяет guard_product_publication, который был написан в терминах
-- старых колонок. Смысл сохранён дословно:
--
--   удалённая   → не меняется ничем, что делает автор
--   снятая      → правка отправляет на повторный разбор, причина снятия
--                 НЕ стирается (модератору решать, снят ли повод)
--   отклонённая → правка возвращает в очередь, прошлый вердикт стирается
--                 (смотреть надо свежую версию, а не заметку к прошлой)
--   живая + подменён файл → снимается с витрины до проверки
--   остальное   → обычная правка, состояние не трогаем
--
-- Новое здесь одно: список защищаемых полей стал явным и полным.
-- ------------------------------------------------------------
create or replace function public.guard_product_author_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_end_user  boolean := auth.role() = 'authenticated' and auth.uid() is not null;
  file_changed boolean := new.file_path is distinct from old.file_path;
begin
  -- Служебная роль (наш сервер: модерация, каталог, действия автора через
  -- /api/creator/product) и миграции — без ограничений.
  if not is_end_user then
    return new;
  end if;

  -- Всё, что решает судьбу карты, назначаем сами. Перечисляем поимённо и
  -- берём из old: так не нужно угадывать, каким полем попробуют соврать
  -- в следующий раз.
  new.state             := old.state;
  new.creator_active    := old.creator_active;
  new.creator_id        := old.creator_id;
  new.submission_kind   := old.submission_kind;
  new.was_approved      := old.was_approved;
  new.deleted_by        := old.deleted_by;
  new.suspension_reason := old.suspension_reason;
  new.rejection_reason  := old.rejection_reason;
  new.rejection_flags   := old.rejection_flags;

  if old.state = 'deleted' then
    return new;
  end if;

  if old.state = 'suspended' then
    new.state           := 'pending';
    new.submission_kind := 'after_takedown';
    new.rejection_reason := null;
    new.rejection_flags  := '{}';

  elsif old.state = 'rejected' then
    new.state           := 'pending';
    new.submission_kind := 'after_rejection';
    new.rejection_reason := null;
    new.rejection_flags  := '{}';

  elsif old.state = 'live' and file_changed then
    -- Без этого можно было бы провести безобидную карту через модерацию,
    -- а потом подложить покупателям что угодно под нашим брендом.
    new.state           := 'pending';
    new.submission_kind := 'file_changed';
    new.rejection_reason := null;
    new.rejection_flags  := '{}';
  end if;

  return new;
end;
$$;

-- Имя с 'b' — чтобы триггер отработал ПОСЛЕ a_* (guard_insert,
-- mark_approved, clear_deleted_by), но ДО products_guard_state: тот
-- сверяет переход old.state → new.state и должен видеть уже
-- окончательное значение. Порядок триггеров одного момента в Postgres —
-- алфавитный по имени, поэтому он задаётся именно так.
drop trigger if exists b_products_author_edit on public.products;
create trigger b_products_author_edit
  before update on public.products
  for each row execute function public.guard_product_author_edit();

drop trigger if exists products_guard_publication on public.products;
drop function if exists public.guard_product_publication();

-- ------------------------------------------------------------
-- 2. Политики чтения — на state.
--
-- Видимость карты = она сама живая И её автор в статусе. Второе условие
-- читается из копии на самой карте (creator_active): подзапрос в
-- profiles здесь невозможен, та закрыта RLS и анониму вернула бы пусто,
-- то есть витрина опустела бы целиком.
--
-- Имя политики меняется вслед за смыслом: «published» больше не поле, а
-- одно из шести состояний.
-- ------------------------------------------------------------
drop policy if exists "public read published" on public.products;
drop policy if exists "public read live" on public.products;
create policy "public read live" on public.products
  for select using (state = 'live' and creator_active);

drop policy if exists "public read images of published products" on public.product_images;
drop policy if exists "public read images of live products" on public.product_images;
create policy "public read images of live products" on public.product_images
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.state = 'live' and p.creator_active
    )
  );

-- ------------------------------------------------------------
-- 3. Пересчёт старых колонок больше не нужен.
-- ------------------------------------------------------------
drop trigger if exists products_sync_legacy_flags on public.products;
drop function if exists public.sync_legacy_product_flags();

-- ------------------------------------------------------------
-- 4. Индексы: по state вместо status/deleted_at.
--
-- products_live_idx (частичный, where state = 'live') из шага 1 остаётся
-- — это главный запрос витрины. Здесь добавляется обычный индекс по
-- state под фильтры каталога админки, где выбирают любое состояние.
-- ------------------------------------------------------------
drop index if exists public.products_status_idx;
drop index if exists public.products_deleted_idx;
create index if not exists products_state_idx on public.products (state);

-- ------------------------------------------------------------
-- 5. Старые колонки — снести.
--
-- Вместе с ними уходят и их check-ограничения (products_status_check,
-- products_hidden_by_check): Postgres удаляет ограничение вместе с
-- колонкой, отдельной строки не требуется.
-- ------------------------------------------------------------
alter table public.products drop column if exists is_published;
alter table public.products drop column if exists deleted_at;
alter table public.products drop column if exists hidden_by;
alter table public.products drop column if exists status;

-- ------------------------------------------------------------
-- 6. Сбросить кэш схемы PostgREST.
--
-- Обязательно и ровно поэтому написано прямо здесь: без этого сайт
-- продолжит спрашивать у базы удалённые колонки и отвечать «column does
-- not exist», хотя миграция прогнана (docs/RULES.md).
-- ------------------------------------------------------------
notify pgrst, 'reload schema';
