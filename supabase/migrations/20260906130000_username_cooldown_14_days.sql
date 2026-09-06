-- Пауза на смену имени: 30 дней → 14.
--
-- Решение владельца 2026-09-06, подтверждённое отдельно (я переспросил —
-- цена ошибки тут выше обычного). Довод владельца: трафик небольшой,
-- умышленно злоупотреблять именами пока некому.
--
-- ⚠️ ЗАЧЕМ ПАУЗА ВООБЩЕ — чтобы не пересматривать это через месяц.
-- При смене имени старое ОСВОБОЖДАЕТСЯ сразу: таблицу прошлых имён и
-- постоянный резерв предлагали 21.08 и отвергли. Значит освободившееся
-- имя может забрать кто угодно, а прежний владелец обнаружит, что его
-- /@name — теперь чужой профиль. Пауза делает такую карусель медленной.
-- Чем короче пауза, тем чаще это возможно; 14 дней — сознательный
-- размен, а не «примерно то же самое».
--
-- ⚠️ ЧИСЛО ЖИВЁТ В ДВУХ МЕСТАХ, И ЭТО НЕ ДУБЛИРОВАНИЕ. Здесь — то, что
-- ИСПОЛНЯЕТСЯ (запрет), в src/lib/profiles.ts (USERNAME_COOLDOWN_DAYS) —
-- то, что ПОКАЗЫВАЕТСЯ человеку. Второе обязано совпадать с первым, но
-- прочитать SQL из браузера нельзя. Меняешь одно — меняй и другое; 31.08
-- на этом уже ловились, когда /welcome и /settings называли разные числа.
--
-- Функция переписана целиком (create or replace), а не пропатчена: в
-- Postgres тело функции неделимо, и «поменять одну строку» здесь
-- невозможно в принципе. Всё остальное в ней — дословно из
-- 20260825120000, чтобы правка читалась как один изменённый интервал.

create or replace function public.guard_username_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cooldown constant interval := interval '14 days';
  next_allowed timestamptz;
begin
  -- Флаг клиенту не принадлежит НИКОГДА. Возвращаем его из old прежде
  -- любых решений: что бы ни прислала форма, здесь оно уже неважно.
  new.username_claimed := old.username_claimed;

  -- Сравнение по нижнему регистру: смена написания — не смена имени.
  if lower(new.username) is not distinct from lower(old.username) then
    return new;
  end if;

  -- Служебная роль — наш сервер и миграции — без ограничений.
  if auth.role() <> 'authenticated' or auth.uid() is null then
    new.username_changed_at := now();
    new.username_claimed := true;
    return new;
  end if;

  -- Имя ещё не заявлено человеком: это ПЕРВОЕ называние, а не
  -- переименование. Оно бесплатно и паузы не начинает — иначе вошедший
  -- через Google платил бы за право назваться собой той единственной
  -- бесплатной сменой, которая у всех остальных остаётся про запас.
  if not old.username_claimed then
    new.username_claimed := true;
    return new;
  end if;

  if old.username_changed_at is not null then
    next_allowed := old.username_changed_at + cooldown;
    if next_allowed > now() then
      raise exception
        'username_cooldown:%', to_char(next_allowed, 'YYYY-MM-DD')
        using errcode = 'check_violation';
    end if;
  end if;

  new.username_changed_at := now();
  return new;
end;
$$;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Журнал прогонов (docs/RULES.md → «Миграции»).

insert into ops.applied_migrations (version)
values ('20260906130000_username_cooldown_14_days')
on conflict (version) do nothing;
