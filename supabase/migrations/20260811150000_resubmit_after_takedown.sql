-- ============================================================
-- Правка снятой карты возвращает её в очередь — и очередь видит, откуда
-- карта пришла. 2026-08-11.
--
-- Две вещи, найденные владельцем при разборе каталога.
--
-- 1. БАГ. Карта, снятую модератором (status='published',
--    is_published=false, hidden_by='moderator'), автор правил — и она
--    НИКУДА не уходила. Триггер guard_product_publication знал ровно два
--    перехода в очередь: 'rejected' → 'pending' и «живая карта сменила
--    файл» → 'pending'. У снятой карты is_published уже false, поэтому
--    вторая ветка не срабатывала, а статус у неё 'published', а не
--    'rejected', — значит и первая. Правка тихо падала в else и статус
--    оставался прежним.
--
--    То есть снятие с витрины было ловушкой: автору говорили «почини и
--    пришли снова», он чинил, отправлял — и ничего не происходило. Ни
--    ошибки, ни очереди, ни ответа.
--
-- 2. Очередь не различала, что перед модератором: первая заявка,
--    исправление после отказа или возврат после снятия. Это три разных
--    разговора — «смотрим впервые», «проверяем, починил ли то, что мы
--    перечислили», «решаем, снят ли повод для бана», — а выглядели они
--    одинаково.
--
-- Правило миграций: сначала preview, потом прод (docs/RULES.md).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Откуда карта пришла в очередь.
--
-- Отдельная колонка, а не вывод из остальных полей. Вывести не
-- получается: триггер при возврате в очередь СТИРАЕТ прошлый вердикт
-- (rejection_reason/rejection_flags) — и правильно делает, модератор
-- должен смотреть свежую версию, а не судить по заметке к предыдущей.
-- После этого «пришла после отказа» уже ничем не отличается от «пришла
-- впервые».
--
-- Значение ставит триггер, а не приложение: он единственный видит и
-- старую строку, и новую в один момент.
-- ------------------------------------------------------------
alter table public.products
  add column if not exists submission_kind text not null default 'first';

alter table public.products drop constraint if exists products_submission_kind_check;
alter table public.products add constraint products_submission_kind_check
  check (submission_kind in ('first', 'after_rejection', 'after_takedown', 'file_changed'));

-- ------------------------------------------------------------
-- 2. Триггер: та же логика плюс недостающая ветка и пометка источника.
--
-- Порядок проверок важен и повторяет важность случая для модератора:
-- снятие модератором — самый тяжёлый повод, он идёт первым, даже если
-- заодно сменился файл.
-- ------------------------------------------------------------
create or replace function public.guard_product_publication()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_end_user boolean := auth.role() = 'authenticated' and auth.uid() is not null;
  file_changed boolean := new.file_path is distinct from old.file_path;
begin
  if not is_end_user then
    return new;   -- сервер (service_role) и миграции — без ограничений
  end if;

  -- Публикацию конечный пользователь не трогает никогда.
  new.is_published := old.is_published;
  -- И источник заявки тоже: иначе автор пометил бы свою карту как
  -- «первая» и спрятал от модератора, что её уже снимали.
  new.submission_kind := old.submission_kind;

  -- Удалённую карту не воскрешает ничто из того, что делает автор.
  -- Раньше этой ветки не было, потому что удаления ещё не существовало.
  if old.deleted_at is not null then
    new.status := old.status;
    new.deleted_at := old.deleted_at;
    new.rejection_reason := old.rejection_reason;
    new.rejection_flags := old.rejection_flags;
    return new;
  end if;

  if old.hidden_by = 'moderator' and old.status = 'published' then
    -- НЕДОСТАЮЩАЯ ВЕТКА. Карта снята модератором: правка — это ответ на
    -- претензию, и она обязана уйти на повторный разбор.
    --
    -- suspension_reason НЕ стираем, в отличие от вердикта по отказу:
    -- модератору нужно видеть, за что карту сняли, чтобы решить, снят ли
    -- повод. Стирание причины здесь означало бы разбирать возврат
    -- вслепую.
    new.status := 'pending';
    new.submission_kind := 'after_takedown';
    new.rejection_reason := null;
    new.rejection_flags := '{}';

  elsif old.status = 'rejected' then
    -- Любая правка отклонённой карты возвращает её в очередь и стирает
    -- прошлый вердикт: модератор смотрит свежую версию, а не судит по
    -- заметке к предыдущей.
    new.status := 'pending';
    new.submission_kind := 'after_rejection';
    new.rejection_reason := null;
    new.rejection_flags := '{}';

  elsif old.is_published and file_changed then
    -- Подменил файл у живой карты — снимаем с витрины до проверки.
    -- Без этого можно было бы провести безобидную карту через модерацию,
    -- а потом подложить покупателям что угодно под нашим брендом.
    new.is_published := false;
    new.status := 'pending';
    new.submission_kind := 'file_changed';
    new.rejection_reason := null;
    new.rejection_flags := '{}';

  else
    -- Обычная правка (карта на проверке или опубликована, файл тот же) —
    -- статус и вердикт остаются как были.
    new.status := old.status;
    new.rejection_reason := old.rejection_reason;
    new.rejection_flags := old.rejection_flags;
  end if;

  return new;
end;
$$;

drop trigger if exists products_guard_publication on public.products;
create trigger products_guard_publication
  before update on public.products
  for each row execute function public.guard_product_publication();
