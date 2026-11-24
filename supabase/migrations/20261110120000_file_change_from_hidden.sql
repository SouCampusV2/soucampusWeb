-- ============================================================
-- Замена файла у СПРЯТАННОЙ карты тоже отправляет её в очередь.
-- 2026-11-10, аудит безопасности, находка S-13.
--
-- ЧТО БЫЛО. Правило «заменил файл у живой карты — карта уходит на
-- разбор» стояло только для состояния live. Автор обходил его в три
-- нажатия: спрятать карту (live → hidden, это его право) → заменить
-- файл (состояние hidden, правило молчит) → вернуть на витрину
-- (hidden → live, тоже его право). На витрине оказывался файл, которого
-- модератор не видел, под одобрением, выданным другому файлу.
--
-- ЧТО МЕНЯЕТСЯ. Одна строка условия: `old.state = 'live'` →
-- `old.state in ('live', 'hidden')`. Спрятанная карта — одобренная
-- карта; новый файл в ней — новая заявка. Переход hidden → pending
-- машина состояний (guard_product_state) разрешала и раньше.
--
-- ⚠️ ЭТО ВТОРОЙ РУБЕЖ, А НЕ ПЕРВЫЙ. С 13.09 карту правит шлюз
-- /api/creator/map служебным ключом, а под ним этот триггер первой же
-- строкой возвращает new как есть. Правило для шлюза живёт в
-- outcomeOfAuthorEdit (src/lib/map-submission.ts) и исправлено тем же
-- днём. Триггер повторяет его дословно — на случай пути записи, который
-- однажды снова пойдёт от имени пользователя.
--
-- СРОК. Миграция только ужесточает правило и не нужна ни старому, ни
-- новому коду для работы: гнать можно до деплоя или после. Сначала
-- preview, потом прод (docs/RULES.md → «Миграции»).
--
-- Остальное тело функции — без изменений, дословно из
-- 20260816120000_product_state_step2.sql.
-- ============================================================

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
  if not is_end_user then
    return new;
  end if;

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
  elsif old.state in ('live', 'hidden') and file_changed then
    new.state           := 'pending';
    new.submission_kind := 'file_changed';
    new.rejection_reason := null;
    new.rejection_flags  := '{}';
  end if;

  return new;
end;
$$;

-- Функция триггерная: напрямую её не вызвать, отдельный revoke не нужен
-- (триггер b_products_author_edit уже привязан и остаётся на месте).

insert into ops.applied_migrations (version)
values ('20261110120000_file_change_from_hidden')
on conflict (version) do nothing;
