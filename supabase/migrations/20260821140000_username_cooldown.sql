-- Username меняется не чаще раза в месяц — 2026-08-21.
--
-- Это мера (b) из трёх, обсуждённых утром того же дня. Тогда владелец
-- выбрал только (a) — разделить username и display_name, — и в миграции
-- 20260821120000 честно записано, чего (a) НЕ закрывает:
--
--   «сменивший username по-прежнему освобождает старый»
--
-- Вот это и закрывается здесь, наполовину. Пауза не мешает захватить
-- чужое освободившееся имя (это мера (c), резерв отпущенных имён, — она
-- по-прежнему не сделана). Она мешает другому: **крутить собственное имя
-- туда-сюда**. А именно это и есть рабочий приём — написать что-то под
-- одним именем, переодеться в другое, вернуться под первое. Тридцать
-- дней делают такую карусель бессмысленной.
--
-- ПОЧЕМУ В БАЗЕ, А НЕ В ФОРМЕ. Форма настроек пишет в profiles ПРЯМО ИЗ
-- БРАУЗЕРА — нашего серверного кода в этом пути нет вовсе (тот же
-- случай, что у protect_name_color и guard_product_author_edit). Проверка
-- в React обходится одним запросом из консоли, то есть защищает ровно от
-- тех, кто и не собирался обходить. Запрет ставится там, где стоит
-- разрешение.
--
-- ПОЧЕМУ ИСКЛЮЧЕНИЕ, А НЕ ТИХИЙ ВОЗВРАТ СТАРОГО ЗНАЧЕНИЯ. У соседнего
-- триггера protect_name_color выбран второй путь: не вправе — молча
-- вернули как было. Здесь так нельзя, и разница по существу. Там человек
-- пытается сделать то, на что у него нет ПРАВА, и объяснять нечего. Здесь
-- право есть, просто ещё не время, — и он обязан узнать, когда оно
-- настанет. Молчаливый откат выглядел бы как «сайт не сохраняет».

-- ------------------------------------------------------------
-- 1. Когда меняли в последний раз.
--
-- null = не меняли ни разу. Именно null, а не now() при заполнении:
-- миграция 20260821120000 подобрала username АВТОМАТИЧЕСКИ, человек его
-- не выбирал. Поставить ему за это месячную паузу значило бы наказать за
-- нашу же правку — первая смена должна быть доступна сразу.

alter table public.profiles
  add column if not exists username_changed_at timestamptz;

-- ------------------------------------------------------------
-- 2. Сама пауза.

create or replace function public.guard_username_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cooldown constant interval := interval '30 days';
  next_allowed timestamptz;
begin
  -- Имя не трогали — проверять нечего. Это самый частый случай (правка
  -- аватара, био, цвета), и он обязан быть самым дешёвым.
  if new.username is not distinct from old.username then
    return new;
  end if;

  -- Служебная роль — наш сервер и миграции — без ограничений. Владельцу
  -- нужно иметь возможность поправить чужое имя из админки, не дожидаясь
  -- месяца; тот же вырез, что у guard_product_author_edit.
  if auth.role() <> 'authenticated' or auth.uid() is null then
    new.username_changed_at := now();
    return new;
  end if;

  if old.username_changed_at is not null then
    next_allowed := old.username_changed_at + cooldown;
    if next_allowed > now() then
      -- Дату кладём в текст ошибки: форма показывает её человеку, а
      -- вычислять её второй раз на клиенте — значит завести второе
      -- место, где живёт число 30.
      raise exception
        'username_cooldown:%', to_char(next_allowed, 'YYYY-MM-DD')
        using errcode = 'check_violation';
    end if;
  end if;

  new.username_changed_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_guard_username_change on public.profiles;
create trigger profiles_guard_username_change
  before update on public.profiles
  for each row execute function public.guard_username_change();

-- ------------------------------------------------------------
-- 3. Наружу дату НЕ отдаём.
--
-- public_profiles остаётся без username_changed_at намеренно: когда
-- человек последний раз переименовывался — его дело, а не витрины. Форме
-- настроек она нужна, и форма читает её из самой profiles, где RLS
-- «own profile read» отдаёт только свою строку.

notify pgrst, 'reload schema';
