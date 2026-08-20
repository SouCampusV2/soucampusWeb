-- Клиент как роль, и цвет ника как его привилегия — 2026-08-20.
--
-- Просьба владельца: у купившего хоть что-то должен быть свой бейдж и
-- возможность украсить профиль. Роли на профиле теперь три:
--   Creator — выкладывает карты (is_creator);
--   Client  — что-то купил (эта миграция);
--   Member  — зарегистрировался, и только.
--
-- ------------------------------------------------------------
-- 1. «Этот человек что-то покупал» — как публичный факт.
--
-- Спросить это с витрины нельзя: orders закрыты RLS, и правильно —
-- чужие заказы не наше дело. Поэтому функция security definer, которая
-- отдаёт наружу ОДНО булево вместо доступа к заказам. Тот же приём, что
-- у get_product_stats: обезличенный ответ поверх приватных строк.
--
-- Гостевые заказы учитываются наравне с аккаунтными: покупка до
-- регистрации связывается с человеком по адресу почты (так же считает
-- getPurchasesForUser и has_purchased). Разница в том, что здесь мы
-- смотрим НЕ на того, кто спрашивает, а на владельца профиля, поэтому
-- auth.email() не годится и адрес берётся из auth.users.
--
-- refunded не считается: деньги вернулись — покупки не было.

create or replace function public.profile_is_client(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.orders o
    where o.status = 'paid'
      and (
        o.user_id = p_user_id
        or (
          o.user_id is null
          and o.customer_email = (select u.email from auth.users u where u.id = p_user_id)
        )
      )
  );
$$;

grant execute on function public.profile_is_client(uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- 2. Цвет ника.
--
-- Хранится как есть — свободный цвет, решение владельца 2026-08-20.
-- Ограничение только на ФОРМУ записи: ровно #rrggbb. Это не вкусовщина,
-- а защита разметки: значение уезжает в атрибут style, и пускать туда
-- произвольную строку значит пускать произвольный CSS.
--
-- null — «цвет не выбран», обычный ник. Отдельного флага «включён» нет:
-- он давал бы состояние «включён, но не выбран», которое ничего не
-- значит.

alter table public.profiles
  add column if not exists name_color text;

alter table public.profiles drop constraint if exists profiles_name_color_check;
alter table public.profiles
  add constraint profiles_name_color_check
  check (name_color is null or name_color ~ '^#[0-9a-fA-F]{6}$');

comment on column public.profiles.name_color is
  'Цвет ника (#rrggbb) — привилегия купивших. Кто вправе его ставить, '
  'решает триггер profiles_protect_name_color, а не интерфейс.';

-- ------------------------------------------------------------
-- 3. Право на цвет стережёт БАЗА, а не форма.
--
-- Ровно та же дыра, что закрывали у is_creator: политика «own profile
-- update» разрешает человеку править свою строку, значит цвет он может
-- выставить запросом из консоли, ничего не покупая. Спрятать поле в
-- настройках — спрятать кнопку.
--
-- Поведение как у protect_is_creator: не ошибка, а молчаливый откат к
-- прежнему значению. Ошибка здесь означала бы, что сохранение ВСЕГО
-- профиля падает из-за одного поля, до которого человек мог даже не
-- дотронуться.
--
-- Условие «auth.role() = authenticated» — это «правит человек из
-- браузера». Наш сервер под служебным ключом и миграции под postgres
-- сюда не попадают намеренно.

create or replace function public.protect_name_color()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name_color is distinct from old.name_color
     and auth.role() = 'authenticated'
     and auth.uid() is not null
     and not public.profile_is_client(new.id)
  then
    new.name_color := old.name_color;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_name_color on public.profiles;
create trigger profiles_protect_name_color
  before update on public.profiles
  for each row execute function public.protect_name_color();

-- ------------------------------------------------------------
-- 4. Наружу — через то же представление, что и остальной профиль.
--
-- public_profiles заведено затем, чтобы аноним видел безопасный
-- поднабор колонок вместо самой profiles (security_invoker = false —
-- представление читает от своего владельца, минуя RLS таблицы).
--
-- is_client считается на лету, а не хранится: хранимый флаг пришлось бы
-- обновлять при каждой покупке и при каждом возврате, и он бы разъехался
-- с заказами при первом же пропущенном месте. Цена — подзапрос на строку;
-- при нынешних объёмах это ничто, а если профилей станут тысячи,
-- превращать в материализованное поле надо будет ОДНО место.

create or replace view public.public_profiles
with (security_invoker = false) as
  select
    id,
    display_name,
    avatar_url,
    bio,
    is_verified,
    is_creator,
    name_color,
    public.profile_is_client(id) as is_client
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

notify pgrst, 'reload schema';
