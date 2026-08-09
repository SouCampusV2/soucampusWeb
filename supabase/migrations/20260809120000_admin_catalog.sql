-- ============================================================
-- Полный каталог в админке + заявки на статус креатора — 2026-08-09.
--
-- Две дыры, которые эта миграция закрывает.
--
-- 1. Модерация работала РОВНО ОДИН РАЗ в жизни карты. /admin/moderation
--    показывает только status = 'pending'; одобрил — и карта исчезла из
--    админки навсегда. Нарушение может всплыть и через месяц, а снять
--    карту с витрины нечем, кроме Table Editor.
--
-- 2. Загружать карты может ЛЮБОЙ зарегистрированный. Единственный фильтр —
--    ручной разбор каждой карты, то есть спамера приходится ловить заново
--    на каждой заявке вместо одного решения по человеку.
--
-- Правило миграций: сначала preview, потом прод (docs/RULES.md).
-- ============================================================

-- ------------------------------------------------------------
-- 1. КТО скрыл карту с витрины.
--
-- Показ витрины уже управляется одним рубильником is_published, и это
-- сознательное решение июльской миграции модерации: status — про очередь
-- разбора, is_published — про видимость. Поэтому НЕ заводим статусы
-- 'suspended'/'archived', как намечалось в docs/IDEAS.md: они были бы
-- вторым источником правды о том же самом, и однажды разъехались бы —
-- карта со status='suspended' и is_published=true невидима в админке, но
-- продаётся.
--
-- Настоящее различие между «убрал автор» и «снял модератор» не в
-- видимости (она одинаковая), а в ПРАВЕ ВЕРНУТЬ. Его и записываем.
-- ------------------------------------------------------------
alter table public.products
  add column if not exists hidden_by text
    check (hidden_by is null or hidden_by in ('creator', 'moderator'));

-- Причина снятия — текст автору, по образцу rejection_reason. Без неё
-- на вопрос «почему мою карту сняли» ответом будет память владельца.
alter table public.products
  add column if not exists suspension_reason text;

-- ------------------------------------------------------------
-- 2. Мягкое удаление.
--
-- Просьба владельца (2026-07-31): проданную карту сейчас нельзя удалить
-- вовсе — сервер отказывает, потому что покупатель обязан сохранить
-- доступ к оплаченному. Отказ правильный по сути, но грубый: автор хочет
-- убрать карту, а ему говорят «нельзя никак».
--
-- Метка времени, а не булево: «когда удалили» нужно в журнале и в
-- разборе спорных случаев, а «удалена ли» — это просто «метка не пуста».
--
-- Файл и скриншоты при этом НЕ удаляются: за них заплачено, покупатель
-- продолжает скачивать (getPurchasesForUser ходит служебным ключом).
alter table public.products
  add column if not exists deleted_at timestamptz;

-- Витрина не должна отдавать удалённое даже при is_published = true —
-- иначе достаточно один раз забыть снять флаг.
drop policy if exists "public read published" on public.products;
create policy "public read published" on public.products
  for select using (is_published and deleted_at is null);

-- Каталог админки листается с фильтрами по статусу и автору, поэтому
-- индексы по ним, а не по одному created_at.
create index if not exists products_status_idx on public.products (status);
create index if not exists products_creator_idx on public.products (creator_id);
create index if not exists products_deleted_idx on public.products (deleted_at)
  where deleted_at is not null;

-- ------------------------------------------------------------
-- 3. Журнал действий модерации.
--
-- Заводится СРАЗУ, вместе с каталогом, а не «когда понадобится»: задним
-- числом историю не восстановить. С несколькими креаторами он обязателен —
-- на вопрос «почему мою карту сняли» нужен ответ с датой и причиной, а
-- не воспоминание.
--
-- actor_id без внешнего ключа на profiles НАМЕРЕННО: журнал переживает
-- удаление аккаунта. Запись «кто-то с таким id снял карту тогда-то»
-- полезна и после того, как человек ушёл, а каскадное удаление стёрло бы
-- ровно те строки, ради которых журнал и заводится.
-- ------------------------------------------------------------
create table if not exists public.moderation_log (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  actor_id    uuid not null,
  action      text not null check (action in (
                'approve', 'reject', 'suspend', 'unsuspend', 'delete', 'restore'
              )),
  reason      text,
  created_at  timestamptz not null default now()
);

create index if not exists moderation_log_product_idx
  on public.moderation_log (product_id, created_at desc);

-- Журнал закрыт наглухо: ни одной политики. Пишет и читает только сервер
-- под служебным ключом — тот же приём, что у page_views. Дать сюда доступ
-- пользователю значило бы показать креатору внутреннюю кухню модерации,
-- а дать запись — позволить подделать историю.
alter table public.moderation_log enable row level security;

-- ------------------------------------------------------------
-- 4. Заявки на статус креатора.
--
-- Флаг profiles.is_creator заведён ещё 24.07 и до сих пор НИГДЕ не
-- используется — вот его применение.
-- ------------------------------------------------------------
create table if not exists public.creator_applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,

  -- Что подаёт кандидат: ссылки на работы и рассказ о себе.
  portfolio_url text,
  discord       text,
  about         text not null,

  status       text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,

  created_at   timestamptz not null default now(),
  decided_at   timestamptz
);

-- Одна ОТКРЫТАЯ заявка на человека. Частичный уникальный индекс, а не
-- обычный: отклонённых заявок у человека может накопиться сколько
-- угодно (отказали — исправился — подал снова), а вот двух заявок в
-- очереди быть не должно, иначе владелец разбирает дубли.
create unique index if not exists creator_applications_one_open
  on public.creator_applications (user_id)
  where status = 'pending';

alter table public.creator_applications enable row level security;

-- Свою заявку человек видит: без этого он не узнает ни что она принята,
-- ни почему отказали.
create policy "read own application" on public.creator_applications
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Подать может только за себя и только со статусом pending. Без проверки
-- статуса в with check заявку можно было бы создать сразу approved —
-- то есть выдать себе креаторство одним запросом из браузера.
create policy "submit own application" on public.creator_applications
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');

-- Решение принимает СЕРВЕР служебным ключом. Политики update здесь нет
-- вовсе — сознательно: любая политика «правь свою заявку» открыла бы
-- путь к самоодобрению, а редактировать поданную заявку не нужно.

-- ------------------------------------------------------------
-- 5. Защита is_creator от самоназначения.
--
-- Ровно та же дыра, что закрывал триггер protect_is_admin: политика
-- "own profile update" разрешает пользователю править СВОЮ строку в
-- profiles, а значит он мог бы выставить себе is_creator = true обычным
-- update из консоли браузера — и загрузка карт открылась бы без всякой
-- заявки.
--
-- Условие — «запрос от залогиненного конечного пользователя», а не «роль
-- не service_role»: под service_role ходит наш сервер, а SQL-редактор
-- Supabase и миграции идут под postgres, и по второму условию они попали
-- бы под запрет вместе с браузером (эту ошибку уже допускали в
-- 20260730140000, см. комментарий там).
-- ------------------------------------------------------------
create or replace function public.protect_is_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_creator is distinct from old.is_creator
     and auth.role() = 'authenticated'
     and auth.uid() is not null
  then
    new.is_creator := old.is_creator;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_is_creator on public.profiles;
create trigger profiles_protect_is_creator
  before update on public.profiles
  for each row execute function public.protect_is_creator();

-- Уже загружавшие карты остаются креаторами: отобрать доступ у тех, кто
-- работал до введения заявок, значило бы наказать их за наш процесс.
update public.profiles p
set is_creator = true
where exists (select 1 from public.products where creator_id = p.id);
