-- Характеристики карты отдельными полями — 2026-08-21.
--
-- Закрывает пункт 10 из приоритетов CLAUDE.md («версии карт нужны
-- ОТДЕЛЬНЫМ полем, а не текстом в описании») и даёт содержимое правой
-- колонке страницы товара, которая до сих пор пустовала.
--
-- ПОЧЕМУ НЕ ТЕКСТОМ В ОПИСАНИИ. Написанное прозой нельзя ни отфильтровать
-- («покажи всё под 1.20»), ни сравнить, ни показать одинаково: каждый
-- автор оформит по-своему, и через двадцать карт витрина выглядит как
-- свалка. Поле — это обещание единообразия.
--
-- ПОЧЕМУ МАССИВЫ, А НЕ ОТДЕЛЬНЫЕ ТАБЛИЦЫ. Правильный по учебнику ответ —
-- таблица связей product_versions. Здесь она не нужна: у версий нет
-- собственных свойств (ни описания, ни порядка, ни дат), они не растут
-- бесконечно, и единственная операция над ними — «покажи» и «отфильтруй».
-- text[] c GIN-индексом делает и то и другое, а join'ов не добавляет.
-- Прецедент в этой же базе — rejection_flags (20260730170000).
-- Если у версии однажды заведутся свойства — вот тогда таблица.
--
-- ГДЕ ЖИВЁТ СПИСОК ДОПУСТИМЫХ ЗНАЧЕНИЙ. В коде (src/lib/product-specs.ts),
-- не здесь. Та же граница, что у палитры цвета ника: база стережёт ОБЪЁМ
-- (сколько значений и какой длины каждое), а какие именно значения
-- осмысленны — вопрос вкуса, и добавление версии 1.22 должно быть правкой
-- строки, а не миграцией на проде. Худшее, что даст значение вне списка, —
-- лишняя пилюля на своей же странице.

-- ------------------------------------------------------------
-- 1. Колонки.

alter table public.products
  -- Версии Minecraft, которые карта поддерживает ПО СЛОВАМ АВТОРА.
  -- Это заявление, а не проверенный факт, — площадка их не тестирует.
  add column if not exists mc_versions text[] not null default '{}',

  -- Что это за карта: Spawn, Hub, Survival world… Одно значение —
  -- карта бывает чем-то одним, в отличие от режимов и тем.
  add column if not exists map_type text,

  -- Под какую игру: Survival, Hub & lobby, Minigame… Здесь набор:
  -- один и тот же спавн честно годится и в хаб, и в мини-игру.
  add column if not exists game_modes text[] not null default '{}',

  -- Стилистика: Modern, Medieval, City… Тоже набор — «современный
  -- город» это две метки, а не одна.
  add column if not exists themes text[] not null default '{}',

  -- Масштаб: Small / Medium / Large / Huge. Нарочно словами, а не
  -- числом блоков: число автор всё равно назовёт на глаз, а покупателю
  -- нужна не точность, а порядок величины.
  add column if not exists map_size text,

  -- В каком виде отдаётся: Java world, Schematic, Datapack…
  add column if not exists file_formats text[] not null default '{}',

  -- Свободные метки для поиска. Единственное поле здесь без словаря —
  -- потому и ограничено строже всех (20 штук по 32 символа).
  add column if not exists tags text[] not null default '{}',

  -- Вес файла. Считается из самого файла при загрузке, автор его не
  -- вводит: спрошенное у человека число разъедется с реальностью при
  -- первой же замене файла.
  add column if not exists file_size_bytes bigint,

  -- Когда карта впервые вышла на витрину. created_at для этого не
  -- годится: он про строку в базе, а карта могла месяц пролежать в
  -- очереди. updated_at уже есть и отвечает на «когда правили».
  add column if not exists published_at timestamptz;

-- ------------------------------------------------------------
-- 2. Потолки.
--
-- Тот же довод, что в 20260820140000_text_limits: без них массив
-- принимает сколько угодно элементов какой угодно длины, а запись идёт
-- из браузера. Числа с запасом над разумным — форма про удобство,
-- база про гарантию.
--
-- not valid у каждого — по той же причине, что и там: на проде уже
-- лежат строки, и правило должно действовать на новые записи, не
-- проверяя старые. Здесь старые заведомо пусты (колонки только что
-- созданы с default '{}'), но привычка стоит дешевле исключения.

create or replace function public.array_within(arr text[], max_items int, max_len int)
returns boolean
language sql
immutable
as $$
  select arr is null
     or (coalesce(array_length(arr, 1), 0) <= max_items
         and not exists (
           select 1 from unnest(arr) as v where char_length(v) > max_len
         ));
$$;

alter table public.products drop constraint if exists products_specs_len;
alter table public.products
  add constraint products_specs_len
  check (
    public.array_within(mc_versions, 40, 16)
    and public.array_within(game_modes, 12, 32)
    and public.array_within(themes, 12, 32)
    and public.array_within(file_formats, 8, 32)
    and public.array_within(tags, 20, 32)
    and (map_type is null or char_length(map_type) <= 32)
    and (map_size is null or char_length(map_size) <= 32)
  ) not valid;

-- ------------------------------------------------------------
-- 3. Отбор по характеристикам.
--
-- GIN — индекс под вопрос «содержит ли массив такое значение»
-- (оператор @>). Обычный btree на массиве умеет сравнивать массивы
-- целиком и на «есть ли 1.20 среди версий» не отвечает.
--
-- Только на версии и метки: по ним будут искать. Ставить индекс на
-- каждую колонку «на всякий случай» — это платить записью за чтение,
-- которого нет.

create index if not exists products_mc_versions_idx on public.products using gin (mc_versions);
create index if not exists products_tags_idx on public.products using gin (tags);

-- ------------------------------------------------------------
-- 4. Дата выхода для тех, кто уже на витрине.
--
-- Задним числом честнее всего взять created_at: точной даты выхода для
-- старых карт не существует нигде, а пустое поле на живой карте
-- выглядит как поломка. Только для тех, кто уже live, — у карты в
-- очереди даты выхода нет, и выдумывать её нельзя.

update public.products
   set published_at = created_at
 where published_at is null and state = 'live';

-- ------------------------------------------------------------
-- 5. Дальше дату ставит база, а не код.
--
-- Соблазн был поставить published_at в обработчике одобрения. Но карта
-- уходит в live не из одного места (одобрение модератором, возврат
-- статуса автору, снятие блокировки), и каждое пришлось бы помнить.
-- Правило «вышла на витрину впервые — запиши когда» — свойство самого
-- перехода, а не какого-то одного экрана, поэтому оно живёт рядом с
-- остальными правилами перехода. Тот же довод, что у guard_product_*.
--
-- Только если пусто: повторный выход после снятия — не новая премьера.

-- ⚠️ Заодно закрывает подлог. Автор правит карту ЗАПРОСОМ ИЗ БРАУЗЕРА
-- (оттого и существует guard_product_author_edit), то есть может прислать
-- любое published_at и объявить карту вышедшей в 2019-м. Дату премьеры
-- назначает площадка, поэтому у конечного пользователя мы её просто
-- возвращаем из old — тем же приёмом, что и поля состояния.

create or replace function public.stamp_published_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and auth.uid() is not null then
    if tg_op = 'INSERT' then
      -- Новая карта премьеры ещё не было. Присланное значение — заявка
      -- на дату, которой не существует.
      new.published_at := null;
    elsif old.published_at is not null then
      new.published_at := old.published_at;
    end if;
  end if;

  if new.state = 'live' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists products_stamp_published_at on public.products;
create trigger products_stamp_published_at
  before insert or update on public.products
  for each row execute function public.stamp_published_at();

notify pgrst, 'reload schema';
