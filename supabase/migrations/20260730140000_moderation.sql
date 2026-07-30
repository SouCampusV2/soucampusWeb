-- ============================================================
-- Модерация карт креаторов — 2026-07-30.
--
-- Подтверждение через Table Editor работало, но вслепую: строку видно,
-- а САМУ КАРТУ — нет (как свёрстано описание, что на скринах, что в
-- файле). Плюс отказать было нечем — только молча не публиковать.
--
-- Эта миграция даёт три недостающие вещи: признак админа, статус
-- «отклонено» и причину отказа. Сам разбор очереди — на /admin/moderation.
--
-- Правило миграций: сначала preview, потом прод (docs/RULES.md).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Кто модератор.
--
-- Отдельный флаг, а не is_verified: галочка — про доверие к креатору
-- (её видит витрина), админ — про право публиковать чужое. Смешать их
-- значило бы выдать любому verified-креатору доступ к модерации.
--
-- Ставится ТОЛЬКО руками через Table Editor/SQL. Политики на profiles
-- не позволяют пользователю править свою строку в обход (см. ниже) —
-- "own profile update" разрешает update своей строки, поэтому колонку
-- обязан защищать триггер, иначе любой мог бы выдать админку себе.
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Владелец сайта — первый (и пока единственный) админ. Ищем по нику, не
-- по UUID: id на preview и проде разные (тот же приём, что в backfill
-- креаторов, миграция 20260727130000).
--
-- ДО создания триггера ниже — иначе он откатил бы этот же update.
update public.profiles
set is_admin = true
where lower(display_name) = 'soucampus';

-- Защита от самоназначения: пользователь может править свою строку
-- (политика "own profile update"), а значит мог бы выставить себе
-- is_admin = true обычным update из браузера. Триггер такое изменение
-- молча откатывает.
--
-- Условие — именно «запрос пришёл от залогиненного КОНЕЧНОГО
-- пользователя» (роль authenticated + непустой auth.uid()), а не «роль
-- не service_role». Разница принципиальная: под service_role ходит наш
-- сервер, а SQL-редактор Supabase и миграции идут под postgres — по
-- второму условию они попали бы под запрет вместе с браузером, и
-- назначить админа стало бы нечем вообще.
create or replace function public.protect_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and auth.role() = 'authenticated'
     and auth.uid() is not null
  then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_is_admin on public.profiles;
create trigger profiles_protect_is_admin
  before update on public.profiles
  for each row execute function public.protect_is_admin();

-- ------------------------------------------------------------
-- 2. Статус «отклонено» + причина.
--
-- rejection_reason нужен именно как текст автору: отказ без объяснения
-- заставляет креатора гадать и присылать то же самое повторно.
-- ------------------------------------------------------------
alter table public.products
  add column if not exists rejection_reason text;

alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check
  check (status in ('pending', 'published', 'rejected'));

-- ------------------------------------------------------------
-- 3. Публичное чтение по-прежнему смотрит ТОЛЬКО на is_published.
--
-- Специально не завязываем витрину на status: is_published остаётся
-- единственным рубильником показа, а status — это про очередь разбора.
-- Так «снять с публикации уже одобренную карту» остаётся одним полем и
-- не требует придумывать четвёртый статус.
-- ------------------------------------------------------------
