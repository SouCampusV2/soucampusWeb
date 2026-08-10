-- ============================================================
-- Приветственное уведомление — 2026-08-10.
--
-- Уведомления заведены накануне (20260810120000), но у нового аккаунта их
-- ноль, и пустой ящик — плохое первое знакомство: колокол выглядит
-- сломанным, а не пустым. Одно уведомление при регистрации решает сразу
-- две вещи — показывает, что раздел живой, и рассказывает, куда идти
-- дальше.
--
-- Правило миграций: сначала preview, потом прод (docs/RULES.md).
-- ============================================================

-- Триггер на profiles, а не на auth.users, и after insert, а не before:
-- строку в profiles заводит handle_new_user (миграция 20260724120000), и
-- вешаться на auth.users вторым триггером значило бы зависеть от порядка
-- их срабатывания. К моменту вставки в profiles аккаунт заведомо создан,
-- а внешний ключ notifications.user_id → auth.users уже выполним.
--
-- security definer — по той же причине, что у notify_admins_of_application:
-- у notifications нет политики insert ни для кого.
create or replace function public.notify_new_user_welcome()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, kind, title, body, href)
  values (
    new.id,
    'announcement',
    'Welcome to SouCampus builds',
    'This is where the site talks to you: what happens to your maps, ' ||
    'your purchases, and anything new around the shop. Browse the maps ' ||
    'to get started.',
    '/shop'
  );
  return new;
end;
$$;

drop trigger if exists profiles_welcome_notification on public.profiles;
create trigger profiles_welcome_notification
  after insert on public.profiles
  for each row execute function public.notify_new_user_welcome();

-- Уже зарегистрированным — то же самое, разово. Иначе раздел выглядит
-- пустым ровно у тех, кто на сайте дольше всех. `where not exists` держит
-- миграцию идемпотентной: повторный прогон не задвоит приветствие.
insert into public.notifications (user_id, kind, title, body, href)
select p.id,
       'announcement',
       'Welcome to SouCampus builds',
       'This is where the site talks to you: what happens to your maps, ' ||
       'your purchases, and anything new around the shop.',
       '/shop'
from public.profiles p
where not exists (
  select 1 from public.notifications n
  where n.user_id = p.id and n.kind = 'announcement'
);
