-- У карты может быть до трёх файлов, 2026-08-25. Шаг 1 из двух.
--
-- ЗАЧЕМ. Одна карта — один файл (products.file_path). А форматов у неё
-- может быть несколько: тот же мир в .zip и он же схематикой. Из-за
-- этого характеристика file_formats уже сегодня умеет врать — автор
-- отмечает «Java world + Schematic», а отдать может только одно.
-- Решение владельца 25.08: до трёх файлов, 15 МБ на файл, 25 МБ на карту.
--
-- ⚠️ ПОЧЕМУ ДОЧЕРНЯЯ ТАБЛИЦА, А НЕ file_path_2 / file_path_3. Три колонки
-- обязали бы КАЖДОГО читателя карты знать про все три, а четвёртый файл
-- потребовал бы миграции и правки всех запросов. Связь «один ко многим»
-- в реляционной базе выражается таблицей — и у нас уже дважды так:
-- projects/project_images, products/product_images. Третий раз тем же
-- приёмом.
--
-- ⚠️ ЭТО ШАГ 1: products.file_path и file_size_bytes ОСТАЮТСЯ. Правило
-- из docs/RULES.md: миграция, которая удаляет, идёт ПОСЛЕ деплоя — иначе
-- работающий на проде код спросит то, чего уже нет. Данные скопированы
-- сюда, старые колонки продолжают жить; сносит их отдельная миграция,
-- когда код доедет. Тот же порядок, что у product_state шаг 1 → шаг 2.

-- ------------------------------------------------------------
-- 1. Сама таблица.

create table if not exists public.product_files (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  -- Путь к объекту в бакете product-files. Не URL: ссылка подписывается
  -- служебным ключом в момент скачивания (src/lib/orders.ts).
  path        text not null,
  size_bytes  bigint not null check (size_bytes > 0),
  -- Порядок показа покупателю. Первый = основной формат.
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists product_files_product_idx
  on public.product_files (product_id, position);

-- Один и тот же объект нельзя привязать к карте дважды: иначе кнопка
-- «скачать» задвоится, а размер посчитается два раза.
create unique index if not exists product_files_unique_path
  on public.product_files (product_id, path);

-- ------------------------------------------------------------
-- 2. Лимиты стережёт БАЗА.
--
-- Проверка в форме (src/lib/upload-limits.ts) остаётся — но она про
-- удобство: сказать человеку «слишком большой» до того, как он двадцать
-- минут ждал загрузку. Защита здесь: size_bytes приходит от браузера,
-- то есть от загружающего, и соврать в нём — дело секунды.
--
-- ⚠️ ЧИСЛА ЖИВУТ В ДВУХ МЕСТАХ, и это осознанно, а не недосмотр. В коде
-- они нужны форме, здесь — исполнению. Расходиться им нельзя: правишь
-- одно — правь второе. Если однажды разойдутся, верным считается ЭТО
-- место, потому что оно единственное, которое нельзя обойти.

create or replace function public.guard_product_files_limits()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  max_files    constant int    := 3;
  max_one      constant bigint := 15 * 1024 * 1024;  -- 15 МБ на файл
  max_total    constant bigint := 25 * 1024 * 1024;  -- 25 МБ на карту
  files_after  int;
  bytes_after  bigint;
begin
  if new.size_bytes > max_one then
    raise exception 'product_file_too_large:%', max_one
      using errcode = 'check_violation';
  end if;

  -- Считаем, каким станет набор ПОСЛЕ этой операции. Своя строка
  -- исключается по id: при update она уже есть в таблице со старым
  -- размером, и без исключения он посчитался бы вместе с новым.
  select count(*), coalesce(sum(size_bytes), 0)
    into files_after, bytes_after
    from public.product_files
   where product_id = new.product_id
     and id is distinct from new.id;

  files_after := files_after + 1;
  bytes_after := bytes_after + new.size_bytes;

  if files_after > max_files then
    raise exception 'product_files_too_many:%', max_files
      using errcode = 'check_violation';
  end if;

  if bytes_after > max_total then
    raise exception 'product_files_total_too_large:%', max_total
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists product_files_guard_limits on public.product_files;
create trigger product_files_guard_limits
  before insert or update on public.product_files
  for each row execute function public.guard_product_files_limits();

-- ------------------------------------------------------------
-- 3. ⚠️ ПЕРЕЕЗД ФАЙЛОВ ЛОМАЕТ ВОЗВРАТ В МОДЕРАЦИЮ. Чиним здесь же.
--
-- До сегодня правило «живая карта с подменённым файлом уходит на
-- повторный разбор» держалось на ОДНОЙ строке в guard_product_author_edit:
--
--   file_changed := new.file_path is distinct from old.file_path
--
-- Это триггер на products. Файлы уехали в другую таблицу — строка
-- products при добавлении файла не меняется, и триггер слепнет. Автор
-- живой карты подложил бы покупателям непроверенный файл, не потревожив
-- модерацию. Защита исчезла бы МОЛЧА, без единой ошибки.
--
-- ⚠️ И ОЧЕВИДНОЕ ЛЕЧЕНИЕ НЕ РАБОТАЕТ. «Повесить триггер на product_files,
-- пусть переводит карту в pending» — не сработает, тоже молча:
--
--   триггер product_files → update products set state='pending'
--                         → срабатывает guard_product_author_edit
--                         → new.state := old.state, то есть обратно 'live'
--
-- Гвард отличает автора от сервера по auth.role(), а это КЛАИМ ИЗ
-- ТОКЕНА, а не роль в базе: security definer его не меняет. Наш
-- собственный триггер он считает правкой из браузера и откатывает.
--
-- Поэтому гварду нужен признак «правка пришла изнутри». Транзакционная
-- настройка (третий аргумент set_config = true, живёт до конца
-- транзакции) — стандартный для Postgres способ это выразить.
--
-- ⚠️ Снаружи её не выставить: PostgREST произвольный SQL не выполняет, а
-- функции set_config среди наших RPC нет. Если когда-нибудь появится
-- функция, дающая клиенту звать set_config, — этот флаг станет дырой.
-- Проверять при добавлении КАЖДОЙ новой RPC.

create or replace function public.guard_product_author_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_end_user  boolean := auth.role() = 'authenticated' and auth.uid() is not null;
  file_changed boolean := new.file_path is distinct from old.file_path;
begin
  -- Правка пришла от нашего же триггера product_files. Пропускаем: он
  -- умеет ровно одно — отправить живую карту на повторный разбор, то
  -- есть УЖЕСТОЧИТЬ, а не ослабить. Без этой ветки он затрёт сам себя.
  if current_setting('app.product_files_change', true) = '1' then
    return new;
  end if;

  -- Служебная роль (наш сервер: модерация, каталог, действия автора через
  -- /api/creator/product) и миграции — без ограничений.
  if not is_end_user then
    return new;
  end if;

  -- Всё, что решает судьбу карты, назначаем сами. Перечисляем поимённо и
  -- берём из old: так не нужно угадывать, каким полем попробуют соврать
  -- в следующий раз.
  new.state             := old.state;
  new.creator_active    := old.creator_active;
  new.creator_id        := old.creator_id;
  new.submission_kind   := old.submission_kind;
  new.was_approved      := old.was_approved;
  new.deleted_by        := old.deleted_by;
  new.suspension_reason := old.suspension_reason;
  new.rejection_reason  := old.rejection_reason;
  new.rejection_flags   := old.rejection_flags;

  if old.state = 'deleted' then
    return new;
  end if;

  if old.state = 'suspended' then
    new.state           := 'pending';
    new.submission_kind := 'after_takedown';
    new.rejection_reason := null;
    new.rejection_flags  := '{}';

  elsif old.state = 'rejected' then
    new.state           := 'pending';
    new.submission_kind := 'after_rejection';
    new.rejection_reason := null;
    new.rejection_flags  := '{}';

  elsif old.state = 'live' and file_changed then
    -- Без этого можно было бы провести безобидную карту через модерацию,
    -- а потом подложить покупателям что угодно под нашим брендом.
    new.state           := 'pending';
    new.submission_kind := 'file_changed';
    new.rejection_reason := null;
    new.rejection_flags  := '{}';
  end if;

  return new;
end;
$$;

-- Сам триггер на файлах.
--
-- Правило стало СТРОЖЕ прежнего и честнее: раньше в очередь отправляла
-- только ПОДМЕНА файла, теперь — любое изменение состава. Добавили
-- четвёртый формат к живой карте — его тоже никто не смотрел.

create or replace function public.product_files_touch_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.product_id, old.product_id);
  parent_state text;
begin
  select state into parent_state
    from public.products where id = target;

  -- Живой карты это касается всегда; остальные состояния и так означают,
  -- что карта либо ждёт разбора, либо снята, либо удалена.
  if parent_state is distinct from 'live' then
    return coalesce(new, old);
  end if;

  perform set_config('app.product_files_change', '1', true);

  update public.products
     set state            = 'pending',
         submission_kind  = 'file_changed',
         rejection_reason = null,
         rejection_flags  = '{}'
   where id = target;

  perform set_config('app.product_files_change', '', true);

  return coalesce(new, old);
end;
$$;

drop trigger if exists product_files_touch_parent on public.product_files;
create trigger product_files_touch_parent
  after insert or update or delete on public.product_files
  for each row execute function public.product_files_touch_parent();

-- ------------------------------------------------------------
-- 4. RLS. Закрываем всегда — правило 22.08: защита, живущая в чужих
-- настройках, не защита.
--
-- Читать список файлов ПУБЛИЧНО не нужно никому: покупателю ссылку
-- подписывает сервер служебным ключом (signedDownloadUrl), витрине
-- достаточно количества. Поэтому наружу таблица закрыта целиком, а автор
-- видит и правит только свои строки — чтобы форма редактирования могла
-- показать, что уже загружено.

alter table public.product_files enable row level security;

drop policy if exists "author reads own product files" on public.product_files;
create policy "author reads own product files"
  on public.product_files for select to authenticated
  using (
    exists (
      select 1 from public.products p
       where p.id = product_files.product_id
         and p.creator_id = auth.uid()
    )
  );

drop policy if exists "author writes own product files" on public.product_files;
create policy "author writes own product files"
  on public.product_files for insert to authenticated
  with check (
    exists (
      select 1 from public.products p
       where p.id = product_files.product_id
         and p.creator_id = auth.uid()
         and p.state <> 'deleted'
    )
  );

drop policy if exists "author removes own product files" on public.product_files;
create policy "author removes own product files"
  on public.product_files for delete to authenticated
  using (
    exists (
      select 1 from public.products p
       where p.id = product_files.product_id
         and p.creator_id = auth.uid()
         and p.state <> 'deleted'
    )
  );

-- Update намеренно НЕ разрешён: замена файла — это удалить строку и
-- вставить новую. Правка path на месте обошла бы уборку Storage, и
-- старый объект остался бы в платном хранилище навсегда — ту болезнь
-- лечили 30.07 (api/creator/cleanup-storage).

-- ------------------------------------------------------------
-- 5. Перенос того, что уже есть.
--
-- Идемпотентно: повторный прогон не задвоит строки (см. unique-индекс
-- выше плюс not exists). Карты без файла (десять засеянных на витрине)
-- просто не дают строк — ноль файлов остаётся законным состоянием.
--
-- size_bytes у старых карт мог не заполниться (колонка появилась 21.08,
-- позже самих карт) — тогда ставим 1 байт: нулю мешает check выше, а
-- настоящий размер всё равно неизвестен и будет перезаписан при первой
-- же замене файла.
--
-- ⚠️ ТРИГГЕР НА ВРЕМЯ ПЕРЕНОСА ВЫКЛЮЧЕН, И ЭТО НЕ ПЕРЕСТРАХОВКА.
-- product_files_touch_parent срабатывает на КАЖДОЙ вставке и отправляет
-- живую карту на повторный разбор. А перенос вставляет строку каждой
-- карте, у которой есть файл, — то есть без этой пары строк миграция
-- сняла бы с витрины ВЕСЬ каталог разом и поставила его в очередь
-- модерации. Причём выглядело бы это как «сайт опустел после миграции»,
-- и связать одно с другим было бы нечем.
--
-- Логика тут простая: перенос не меняет НИЧЕГО по существу. Файл у карты
-- тот же самый, что и минуту назад, он просто лежит в другой таблице.
-- Правило «состав файлов изменился → на разбор» про будущие правки
-- автора, а не про переезд схемы.

alter table public.product_files disable trigger product_files_touch_parent;

insert into public.product_files (product_id, path, size_bytes, position)
select p.id, p.file_path, coalesce(nullif(p.file_size_bytes, 0), 1), 0
  from public.products p
 where p.file_path is not null
   and not exists (
     select 1 from public.product_files f
      where f.product_id = p.id and f.path = p.file_path
   );

alter table public.product_files enable trigger product_files_touch_parent;

-- Проверка, что перенос не тронул витрину. Если миграция всё же увела
-- живые карты в очередь, это видно СРАЗУ, а не через день по пустому
-- каталогу. Ноль — норма.
do $$
declare
  stuck int;
begin
  select count(*) into stuck
    from public.products
   where state = 'pending' and submission_kind = 'file_changed'
     and was_approved;
  if stuck > 0 then
    raise warning 'Перенос задел % карт(ы): они ушли в очередь. Проверить вручную.', stuck;
  end if;
end;
$$;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Журнал прогонов (docs/RULES.md → «Миграции»).

insert into ops.applied_migrations (version) values ('20260825130000_product_files')
on conflict do nothing;
