-- ============================================================
-- Уведомления + отзыв статуса креатора — 2026-08-10.
--
-- Раньше площадка молчала. Человек подал заявку — и узнавал ответ, только
-- если сам догадывался вернуться на /resources. Владелец узнавал о новой
-- заявке, только если сам заходил в админку. Карту купили — креатор не
-- знал вовсе. Всё это события, у которых есть адресат, и до сих пор им
-- некуда было прийти.
--
-- Правило миграций: сначала preview, потом прод (docs/RULES.md).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Уведомления.
--
-- Одна строка = одно событие одному человеку. Рассылка «всем» (распродажа,
-- смена правил) — это не особая строка с user_id = null, а обычный веер:
-- по строке на каждого. Так дороже по месту, но зато «прочитано» и
-- «удалено» работают одинаково для всех видов, а не двумя разными путями.
-- При наших масштабах (сотни аккаунтов) веер стоит одного insert…select.
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,

  -- Вид события. Список закрытый: опечатка в коде иначе тихо создаст
  -- уведомление вида «aproved», которое UI не узнает и покажет серым
  -- ничем. Цена — миграция на каждый новый вид, и это приемлемо: новый
  -- вид всё равно требует правки кода.
  kind       text not null check (kind in (
               'creator_application_submitted', -- владельцу: кто-то подал заявку
               'creator_approved',              -- человеку: приняли
               'creator_rejected',              -- человеку: отказали
               'creator_revoked',               -- человеку: статус снят
               'map_approved',                  -- креатору: карта на витрине
               'map_rejected',                  -- креатору: карта не прошла
               'map_suspended',                 -- креатору: карту сняли
               'map_sold',                      -- креатору: карту купили
               'purchase',                      -- покупателю: заказ оплачен
               'announcement'                   -- всем: распродажа, правила
             )),

  title      text not null,
  -- Подробности: причина отказа, название карты, текст объявления.
  body       text,
  -- Куда ведёт клик. Относительный путь нашего сайта; проверяется в коде
  -- (lib/notifications.ts), чтобы уведомление нельзя было превратить в
  -- ссылку на чужой сайт.
  href       text,

  created_at timestamptz not null default now(),
  -- Когда прочитано. Метка времени, а не булево: «когда увидел» ещё
  -- пригодится, «увидел ли» — это «метка не пуста».
  read_at    timestamptz
);

-- Список всегда читается одинаково: свои, свежие сверху.
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

-- Счётчик непрочитанных считается на КАЖДОЙ загрузке страницы с колоколом,
-- поэтому ему отдельный частичный индекс: он покрывает ровно те строки,
-- которые счётчик и трогает, и не растёт вместе с прочитанным архивом.
create index if not exists notifications_unread_idx
  on public.notifications (user_id)
  where read_at is null;

alter table public.notifications enable row level security;

-- Свои уведомления человек читает. Чужие не видит никак: user_id в
-- политике, а не в коде выборки.
create policy "read own notifications" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Отметку «прочитано» ставит сам браузер — отдельный route handler ради
-- одной колонки был бы лишним звеном. Безопасно это только вместе с
-- триггером ниже: RLS умеет ограничивать СТРОКИ, но не КОЛОНКИ, и без
-- него человек мог бы переписать себе заголовок и текст уведомления —
-- например, стереть причину, по которой у него отобрали статус, и потом
-- ссылаться на то, что его не предупреждали.
create policy "mark own notifications read" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Удалять свои — можно: это его почтовый ящик.
create policy "delete own notifications" on public.notifications
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Вставку не разрешаем никому: уведомления создаёт только сервер под
-- служебным ключом (или триггеры ниже). Иначе любой мог бы прислать
-- себе — и, что хуже, соседу — «ваш статус отозван».

-- Всё, кроме read_at, заморожено для запросов из браузера. Условие
-- «запрос от залогиненного конечного пользователя» — то же, что у
-- protect_is_creator: под service_role ходит наш сервер, а миграции идут
-- под postgres, и оба должны проходить свободно.
create or replace function public.freeze_notification_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and auth.uid() is not null then
    new.id         := old.id;
    new.user_id    := old.user_id;
    new.kind       := old.kind;
    new.title      := old.title;
    new.body       := old.body;
    new.href       := old.href;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_freeze_content on public.notifications;
create trigger notifications_freeze_content
  before update on public.notifications
  for each row execute function public.freeze_notification_content();

-- ------------------------------------------------------------
-- 2. Новая заявка — уведомление владельцу.
--
-- Триггером в базе, а не кодом: заявку человек создаёт НАПРЯМУЮ из
-- браузера (политика "submit own application", см. 20260809120000), и
-- никакого нашего серверного кода в этом пути нет. Написать соседу-админу
-- строку браузер не может и не должен — значит, это делает база.
--
-- security definer: функция обходит RLS, поэтому и вставка в notifications
-- проходит без политики insert, и список админов читается из profiles,
-- закрытой политикой «только своя строка».
-- ------------------------------------------------------------
create or replace function public.notify_admins_of_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  applicant text;
begin
  select display_name into applicant from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, kind, title, body, href)
  select p.id,
         'creator_application_submitted',
         coalesce(applicant, 'Someone') || ' wants to become a creator',
         left(new.about, 200),
         '/admin/applications'
  from public.profiles p
  where p.is_admin;

  return new;
end;
$$;

drop trigger if exists creator_applications_notify_admins on public.creator_applications;
create trigger creator_applications_notify_admins
  after insert on public.creator_applications
  for each row execute function public.notify_admins_of_application();

-- ------------------------------------------------------------
-- 3. Отзыв статуса креатора.
--
-- Снять is_creator технически можно было и раньше — служебным ключом из
-- админки. Не хватало ровно того же, чего не хватало снятию карты:
-- ПРИЧИНЫ и следа. Без них на вопрос «почему у меня пропала загрузка»
-- ответом была бы память владельца.
--
-- Колонки на profiles, а не отдельная таблица: у человека ровно одно
-- текущее состояние, и вопрос всегда один — «почему сейчас нельзя».
-- История же решений по людям и так копится в creator_applications
-- (отозвали — подаёт заново).
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists creator_revoked_at timestamptz;
alter table public.profiles
  add column if not exists creator_revoked_reason text;
