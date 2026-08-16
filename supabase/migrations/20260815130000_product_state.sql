-- ============================================================
-- Состояние карты — одна колонка вместо четырёх. Шаг 1 из 2.
--
-- Замечание владельца 2026-08-15: после «удалить → восстановить» карта
-- попадала в состояние, из которого автор не мог её вернуть и в котором
-- ему не показывали причину. Починить конкретный переход было легко, но
-- он вылез не случайно.
--
-- Сейчас состояние карты размазано по ЧЕТЫРЁМ полям: status
-- ('pending'/'published'/'rejected'), is_published, deleted_at и
-- hidden_by ('creator'/'moderator'/'revoked'/null). Комбинаций из них
-- получается несколько десятков, осмысленных — семь. Всё остальное —
-- состояния, которых не должно существовать, но которые прекрасно
-- записываются: ровно так и вышло с «уже не удалена, но всё ещё снята».
-- База при этом не возражала, потому что и не могла: каждое поле по
-- отдельности было заполнено допустимо.
--
-- Отсюда решение (владелец, 2026-08-15): одна колонка `state` с явным
-- перечнем и разрешёнными переходами. Невозможное состояние должно быть
-- НЕВЫРАЗИМЫМ, а не починенным по факту обнаружения.
--
--   pending    — в очереди на разбор (первая заявка или правка)
--   rejected   — отказано, причина в rejection_reason/rejection_flags
--   live       — на витрине
--   hidden     — автор снял сам; сам же и возвращает
--   suspended  — сняла площадка, причина обязательна; правка → pending
--   deleted    — убрана из каталога мягко; restore → hidden
--
-- Чего в перечне НЕТ и почему: 'revoked'. Карта, ушедшая с витрины
-- вместе со статусом автора, — это свойство АВТОРА, а не карты. Сейчас
-- оно пишется в hidden_by, и при возврате статуса непонятно, куда
-- возвращать каждую карту: прежнее значение затёрто. Поэтому (решение
-- владельца) карта сохраняет своё state, а видимость считается ещё и от
-- автора — см. creator_active ниже. Вернули статус — карты сами
-- вернулись туда, где были, без ведения списков.
--
-- ШАГ 1 (эта миграция): state появляется РЯДОМ со старыми колонками и
-- становится источником правды; старые колонки продолжают жить, но
-- теперь их считает триггер. Значит RLS-политики, представления и ещё не
-- переписанный код работают ровно как раньше, а откат — это просто «не
-- пользоваться новой колонкой».
--
-- ШАГ 2 (отдельная миграция, после проверки на проде): старые колонки
-- удаляются, политики переписываются на state.
--
-- Правило миграций: сначала preview, потом прод (docs/RULES.md).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Колонки.
-- ------------------------------------------------------------
alter table public.products
  add column if not exists state text;

alter table public.products
  drop constraint if exists products_state_check;
alter table public.products
  add constraint products_state_check
  check (state in ('pending', 'rejected', 'live', 'hidden', 'suspended', 'deleted'));

comment on column public.products.state is
  'Единственный источник правды о том, где карта находится. is_published/deleted_at/hidden_by считаются от него триггером и будут удалены (шаг 2).';

-- Активен ли автор как креатор. Денормализация — сознательная.
--
-- Видимость карты зависит от статуса автора, но политика на products не
-- может заглянуть в profiles: та закрыта RLS, и аноним получил бы из
-- такого подзапроса пусто, то есть витрина опустела бы целиком. Вариант
-- с security definer-функцией на каждую строку — это вызов функции на
-- каждую карту в каждой выборке.
--
-- Поэтому флаг лежит на самой карте, а поддерживает его триггер на
-- profiles (ниже). Дублирование данных здесь дешевле и честнее, чем
-- дублирование логики доступа.
alter table public.products
  add column if not exists creator_active boolean not null default true;

comment on column public.products.creator_active is
  'Копия profiles.is_creator автора, чтобы RLS витрины не ходила в закрытую profiles. Поддерживается триггером.';

-- ------------------------------------------------------------
-- 2. Перенос данных.
--
-- Порядок веток — от самого сильного состояния к самому слабому, тот
-- же, что у бейджа в кабинете автора: удаление важнее отказа, отказ
-- важнее снятия.
-- ------------------------------------------------------------
update public.products
set state = case
  when deleted_at is not null                      then 'deleted'
  when status = 'rejected'                         then 'rejected'
  when status = 'pending'                          then 'pending'
  when is_published                                then 'live'
  when hidden_by = 'moderator'                     then 'suspended'
  -- Карта снята вместе со статусом автора. В state пишем 'live' — то,
  -- чем она была до отзыва и чем снова станет, когда статус вернут; с
  -- витрины её сейчас держит creator_active, а не собственное состояние.
  when hidden_by = 'revoked'                       then 'live'
  else                                                  'hidden'
end
where state is null;

alter table public.products
  alter column state set not null;

-- Умолчание для новых заявок: карта появляется в очереди на разбор.
-- Нужно ещё и технически — код загрузки про state пока не знает и
-- вставляет строку без него, а колонка not null.
alter table public.products
  alter column state set default 'pending';

-- Флаг активности — из профиля автора.
update public.products p
set creator_active = coalesce(pr.is_creator, false)
from public.profiles pr
where pr.id = p.creator_id;

-- Индекс под главный запрос витрины: «покажи всё живое».
create index if not exists products_live_idx
  on public.products (state)
  where state = 'live';

-- ------------------------------------------------------------
-- 3. Старые колонки теперь ПРОИЗВОДНЫЕ.
--
-- Одностороннее правило: state → (is_published, deleted_at, hidden_by).
-- Обратного пересчёта нет намеренно — два источника правды, спорящие
-- друг с другом, и есть та болезнь, от которой эта миграция.
--
-- Живёт до шага 2. Как только политики и код перейдут на state, триггер
-- и сами колонки уезжают.
-- ------------------------------------------------------------
create or replace function public.sync_legacy_product_flags()
returns trigger
language plpgsql
as $$
begin
  new.is_published := (new.state = 'live' and new.creator_active);

  -- old существует только при update: на insert обращение к ней —
  -- ошибка выполнения, а не null.
  new.deleted_at := case
    when new.state <> 'deleted' then null
    when tg_op = 'UPDATE'       then coalesce(old.deleted_at, now())
    else now()
  end;

  new.hidden_by := case
    when new.state = 'suspended' then 'moderator'
    when new.state = 'deleted'   then 'moderator'
    when new.state = 'hidden'    then 'creator'
    when not new.creator_active  then 'revoked'
    else null
  end;

  -- status остаётся ради очереди модерации и триггера публикации,
  -- которые на него смотрят; на шаге 2 уйдёт и он.
  new.status := case
    when new.state = 'pending'  then 'pending'
    when new.state = 'rejected' then 'rejected'
    else 'published'
  end;

  return new;
end;
$$;

drop trigger if exists products_sync_legacy_flags on public.products;
create trigger products_sync_legacy_flags
  before insert or update on public.products
  for each row execute function public.sync_legacy_product_flags();

-- ------------------------------------------------------------
-- 4. Разрешённые переходы.
--
-- Смысл всей миграции. Раньше «можно ли так» знал только код — в трёх
-- разных обработчиках, каждый про свою часть. Теперь знает база, и
-- обойти её нельзя ни из браузера, ни из route handler'а, ни рукой в
-- Table Editor.
--
-- Читать как «откуда → куда»:
--   pending   → live | rejected                (вердикт модератора)
--   rejected  → pending                        (автор поправил)
--   live      → hidden | suspended | pending   (автор спрятал / сняли /
--                                               подменён файл)
--   hidden    → live | pending | suspended | deleted
--   suspended → pending | live | deleted       (правка / сняли претензию)
--   deleted   → hidden                         (восстановление)
--
-- Чего тут нет и почему: deleted → live (восстановление НЕ публикует
-- молча, это отдельное осознанное действие) и suspended → hidden (снятие
-- площадкой автор не отменяет собственной кнопкой — иначе бан не значил
-- бы ничего).
-- ------------------------------------------------------------
create or replace function public.guard_product_state()
returns trigger
language plpgsql
as $$
begin
  if new.state = old.state then
    return new;
  end if;

  if not (
    (old.state = 'pending'   and new.state in ('live', 'rejected')) or
    (old.state = 'rejected'  and new.state in ('pending')) or
    (old.state = 'live'      and new.state in ('hidden', 'suspended', 'pending', 'deleted')) or
    (old.state = 'hidden'    and new.state in ('live', 'pending', 'suspended', 'deleted')) or
    (old.state = 'suspended' and new.state in ('pending', 'live', 'deleted')) or
    (old.state = 'deleted'   and new.state in ('hidden'))
  ) then
    raise exception 'Недопустимый переход состояния карты: % → %', old.state, new.state
      using errcode = 'check_violation';
  end if;

  -- Снятие площадкой обязано быть объяснено. Проверка здесь, а не в
  -- обработчике: причина нужна автору, и «забыли передать» не должно
  -- быть техническим вариантом.
  if new.state = 'suspended' and coalesce(new.suspension_reason, '') = '' then
    raise exception 'Снятие карты требует причины'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists products_guard_state on public.products;
create trigger products_guard_state
  before update on public.products
  for each row execute function public.guard_product_state();

-- ------------------------------------------------------------
-- 5. Статус автора — на его карты.
--
-- Отозвали статус: карты уходят с витрины, СОХРАНЯЯ своё state. Вернули:
-- те, что были live, снова live — сами, без списков и без угадывания.
-- Раньше прежнее значение затиралось, и возврат был приблизительным.
-- ------------------------------------------------------------
create or replace function public.sync_products_creator_active()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_creator is distinct from old.is_creator then
    update public.products
    set creator_active = new.is_creator
    where creator_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_products_creator_active on public.profiles;
create trigger profiles_sync_products_creator_active
  after update on public.profiles
  for each row execute function public.sync_products_creator_active();

-- ------------------------------------------------------------
-- 6. Правка автором — теперь тоже про state.
--
-- Триггер guard_product_publication (миграция 20260811150000) решал, что
-- происходит, когда карту правит сам автор: снятую отправить на
-- повторный разбор, отклонённую вернуть в очередь, у живой с подменённым
-- файлом снять публикацию. Логика верная и остаётся, но писала она в
-- status и is_published — а те теперь производные от state, и триггер
-- синхронизации ниже по порядку просто затёр бы её обратно.
--
-- Порядок срабатывания триггеров у одной таблицы — алфавитный по имени,
-- и он здесь как раз нужный:
--   products_guard_publication  → решает, куда переводить (пишет state)
--   products_guard_state        → проверяет, что переход разрешён
--   products_sync_legacy_flags  → пересчитывает старые колонки
--
-- Порядок веток внутри — тот же, что и был, и по той же причине: снятие
-- площадкой тяжелее всего, оно идёт первым, даже если заодно сменился
-- файл.
-- ------------------------------------------------------------
create or replace function public.guard_product_publication()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_end_user boolean := auth.role() = 'authenticated' and auth.uid() is not null;
  file_changed boolean := new.file_path is distinct from old.file_path;
begin
  if not is_end_user then
    return new;   -- сервер (service_role) и миграции — без ограничений
  end if;

  -- Состояние конечный пользователь не выбирает сам НИКОГДА: ни спрятать,
  -- ни опубликовать правкой строки. Свои законные действия он делает
  -- через /api/creator/product, который ходит служебным ключом.
  new.state := old.state;
  -- И источник заявки тоже: иначе автор пометил бы свою карту как
  -- «первая» и спрятал от модератора, что её уже снимали.
  new.submission_kind := old.submission_kind;

  -- Удалённую карту не воскрешает ничто из того, что делает автор.
  if old.state = 'deleted' then
    new.rejection_reason := old.rejection_reason;
    new.rejection_flags := old.rejection_flags;
    return new;
  end if;

  if old.state = 'suspended' then
    -- Карта снята площадкой: правка — это ответ на претензию, и она
    -- обязана уйти на повторный разбор.
    --
    -- suspension_reason НЕ стираем, в отличие от вердикта по отказу:
    -- модератору нужно видеть, за что карту сняли, чтобы решить, снят ли
    -- повод. Стирание причины означало бы разбирать возврат вслепую.
    new.state := 'pending';
    new.submission_kind := 'after_takedown';
    new.rejection_reason := null;
    new.rejection_flags := '{}';

  elsif old.state = 'rejected' then
    -- Любая правка отклонённой карты возвращает её в очередь и стирает
    -- прошлый вердикт: модератор смотрит свежую версию, а не судит по
    -- заметке к предыдущей.
    new.state := 'pending';
    new.submission_kind := 'after_rejection';
    new.rejection_reason := null;
    new.rejection_flags := '{}';

  elsif old.state in ('live', 'hidden') and file_changed then
    -- Подменил файл — на повторную проверку. Без этого можно было бы
    -- провести безобидную карту через модерацию, а потом подложить
    -- покупателям что угодно под нашим брендом.
    --
    -- 'hidden' добавлен к 'live' (раньше ветка смотрела только на
    -- опубликованные): спрятанная карта возвращается на витрину одной
    -- кнопкой автора, и подмена файла у неё прошла бы вообще мимо
    -- разбора.
    new.state := 'pending';
    new.submission_kind := 'file_changed';
    new.rejection_reason := null;
    new.rejection_flags := '{}';

  else
    -- Обычная правка (карта на проверке, живая или спрятанная, файл тот
    -- же) — состояние и вердикт остаются как были.
    new.rejection_reason := old.rejection_reason;
    new.rejection_flags := old.rejection_flags;
  end if;

  return new;
end;
$$;
