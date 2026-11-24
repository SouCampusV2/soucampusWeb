-- ============================================================
-- Заявка в креаторы снова вставляется (2026-11-24, владелец: «не могу
-- зарегаться как креатор»).
--
-- ЧТО СЛОМАНО. После вставки заявки срабатывает триггер
-- creator_applications_notify_admins (20260810120000) и зовёт
-- notify_admins_of_application(). Функция берёт имя заявителя из
-- profiles.display_name — а эту колонку снесла 20260821160000_drop_display_name
-- (одно имя на человека — username). plpgsql разбирает запрос только при
-- выполнении, поэтому миграция прошла молча, а каждая вставка заявки с
-- 21.08 падает с «column "display_name" does not exist». Вставка и
-- триггер — одна транзакция: откатывается и заявка. Человек видит
-- «Could not send the application».
--
-- Почему не заметили: с 20.08 по 27.10 приём авторов был заморожен, а
-- после разморозки заявку никто не подавал.
--
-- ЧИНИМ: то же самое, только имя — username. Остальное в функции как было.
-- Порядок: миграция не зависит от кода, её можно гнать когда угодно.
-- ============================================================

create or replace function public.notify_admins_of_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  applicant text;
begin
  select username into applicant from public.profiles where id = new.user_id;

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

insert into ops.applied_migrations (version)
values ('20261124130000_fix_application_notify')
on conflict (version) do nothing;
