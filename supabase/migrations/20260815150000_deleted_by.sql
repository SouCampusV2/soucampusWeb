-- ============================================================
-- Кто удалил карту — 2026-08-15.
--
-- Замечание владельца: когда карту удаляет сам автор, она пропадает и из
-- каталога админки; лучше пусть остаётся в разделе «удалённые» с
-- пометкой, кем удалена.
--
-- Причина глубже удобства. Удаление автором было НАСТОЯЩИМ: строка
-- уходила из базы совсем. Значит человек, чью карту заметили, мог стереть
-- улику одним кликом — в moderation_log осталась бы ссылка в никуда, а
-- разбирать спор было бы не по чему. Удаление модератором мягкое ровно
-- поэтому; у автора не было тому причины, кроме того, что писалось это
-- раньше и другим кодом.
--
-- Теперь удаление у обоих одно и то же — переход в state = 'deleted', —
-- и различает их эта колонка.
-- ============================================================

alter table public.products
  add column if not exists deleted_by text;

alter table public.products drop constraint if exists products_deleted_by_check;
alter table public.products add constraint products_deleted_by_check
  check (deleted_by is null or deleted_by in ('creator', 'moderator'));

comment on column public.products.deleted_by is
  'Кто увёл карту в state = deleted: автор или площадка. Смысл разный — у автора это «передумал», у площадки «нарушение».';

-- Всё, что удалено до сегодня, удалено площадкой: другого способа не
-- было (у автора строка просто исчезала).
update public.products
set deleted_by = 'moderator'
where state = 'deleted' and deleted_by is null;

-- Пометка снимается при возврате из удалённых — иначе восстановленная
-- карта осталась бы навсегда помеченной удалённой.
create or replace function public.clear_deleted_by()
returns trigger
language plpgsql
as $$
begin
  if new.state <> 'deleted' then
    new.deleted_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists a_products_clear_deleted_by on public.products;
create trigger a_products_clear_deleted_by
  before insert or update on public.products
  for each row execute function public.clear_deleted_by();

-- ------------------------------------------------------------
-- Новый вид уведомления: карта удалена.
--
-- Раньше про удаление писали видом 'map_suspended' — «сняли с витрины».
-- Пока удаление делал только модератор и означало то же самое, разница
-- была невелика. Теперь удалить может и автор, и уведомление ему нужно
-- другое: не «вас наказали», а «готово, вот как вернуть».
--
-- Отдельный вид, а не общий текст: по kind рисуется иконка и по нему же
-- потом фильтровать историю. Список закрытый намеренно (см. миграцию
-- 20260810120000) — опечатка иначе создала бы уведомление, которого UI
-- не знает.
-- ------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in (
    'creator_application_submitted',
    'creator_approved',
    'creator_rejected',
    'creator_revoked',
    'map_approved',
    'map_rejected',
    'map_suspended',
    'map_deleted',
    'map_sold',
    'purchase',
    'announcement'
  ));
