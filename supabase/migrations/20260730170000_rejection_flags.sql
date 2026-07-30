-- ============================================================
-- Отказ с конкретикой + рабочий ресабмит — 2026-07-30.
--
-- Две ошибки предыдущей миграции (20260730160000), найденные владельцем:
--
-- 1. Триггер замораживал status для конечного пользователя целиком
--    (new.status := old.status). Из-за этого исправленная отклонённая
--    карта НАВСЕГДА оставалась 'rejected': модератор её больше не видел,
--    а у автора продолжала висеть старая причина отказа. То есть
--    исправлять было бессмысленно — цикл «отклонили → починил → снова на
--    проверку» физически не замыкался.
--
-- 2. Отказ был просто текстом. Автору приходилось угадывать, что именно
--    менять, а проверить при повторной отправке, что он это сделал, было
--    нечем.
--
-- Правило миграций: сначала preview, потом прод (docs/RULES.md).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Что именно не так — списком, а не только прозой.
--
-- Массив, а не отдельные булевы колонки: набор причин будет меняться, и
-- каждый раз добавлять колонку в products ради нового пункта — плохо.
-- Проверку значений держим здесь же, чтобы в базу не попал мусор.
-- ------------------------------------------------------------
alter table public.products
  add column if not exists rejection_flags text[] not null default '{}';

alter table public.products drop constraint if exists products_rejection_flags_check;
alter table public.products add constraint products_rejection_flags_check
  check (
    rejection_flags <@ array['images', 'description', 'file', 'price', 'category', 'title']
  );

-- ------------------------------------------------------------
-- 2. Триггер переписан: правка отклонённой карты = повторная заявка.
--
-- Ключевое отличие от прошлой версии: статус больше не копируется
-- вслепую. Публиковать себя сам креатор по-прежнему не может, но
-- перевести СВОЮ отклонённую карту обратно в очередь — может и должен,
-- иначе исправлять её незачем.
--
-- Разрешённые переходы для конечного пользователя ровно два:
--   rejected  → pending  (исправил после отказа)
--   published → pending  (заменил файл у живой карты, см. ниже)
-- Всё остальное откатывается на прежнее значение.
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

  if old.status = 'rejected' then
    -- Любая правка отклонённой карты возвращает её в очередь и стирает
    -- прошлый вердикт: модератор смотрит свежую версию, а не судит по
    -- заметке к предыдущей.
    new.status := 'pending';
    new.rejection_reason := null;
    new.rejection_flags := '{}';

  elsif old.is_published and file_changed then
    -- Подменил файл у живой карты — снимаем с витрины до проверки.
    -- Без этого можно было бы провести безобидную карту через модерацию,
    -- а потом подложить покупателям что угодно под нашим брендом.
    new.is_published := false;
    new.status := 'pending';
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
