-- ============================================================
-- Начальная схема SouCampus builds (Этап 3, шаг 2).
--
-- Переносит в БД то, что сейчас лежит в src/lib/*.ts:
--   projects.ts -> projects + project_images
--   reviews.ts  -> reviews
--   Stats.tsx   -> stats
--
-- Проектирование и обоснование каждого решения — в STRUCTURE.md.
-- Этот файл лежит в git специально: схема должна быть
-- воспроизводимой из репозитория, а не существовать только
-- в облаке Supabase.
-- ============================================================


-- ------------------------------------------------------------
-- 1. projects — работы портфолио
-- ------------------------------------------------------------
create table public.projects (
  -- Вечный внутренний идентификатор. На него ссылаются другие
  -- таблицы. Не меняется никогда, даже если slug переименуют.
  id              uuid primary key default gen_random_uuid(),

  -- То, что видно в адресе: /portfolio/bluespawn.
  -- unique — двух проектов с одним адресом быть не может.
  slug            text not null unique,

  title           text not null,
  tag             text not null,   -- "Order" / "Personal project" / ...
  summary         text not null,   -- короткий текст на карточке
  description     text not null,   -- длинный текст на странице проекта

  image_url       text not null,   -- главное фото

  -- Цена в двух видах: label — то, что показываем человеку
  -- (может быть "trial", а не число), amount — число для
  -- сортировки/фильтров, пустое там, где цены нет.
  price_label     text not null,
  price_amount    numeric,
  price_currency  text not null default 'EUR',

  -- Тот же принцип для размера и сроков: строка для показа,
  -- числа (nullable) на будущее — "покажи самые крупные".
  size_label      text not null,
  size_x          numeric,
  size_z          numeric,

  deadline_label  text not null,
  deadline_days   numeric,

  -- Попадает ли в hero-карусель на /portfolio. Отдельный флаг,
  -- а не "первые 5 по порядку" — иначе перестановка карточек в
  -- сетке случайно меняла бы состав карусели (см. STRUCTURE.md).
  is_featured     boolean not null default false,

  -- Порядок отображения. В массиве порядок был неявным (индекс),
  -- в таблице строки не упорядочены — нужна явная колонка.
  sort_order      integer,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Индекс = оглавление книги. Без него поиск по slug читает всю
-- таблицу подряд; с ним — сразу прыгает в нужную строку.
-- Именно так работает getProject(slug) на каждой странице проекта.
create index projects_slug_idx on public.projects (slug);

-- Частый запрос "дай карусель по порядку" — тоже по индексу.
create index projects_featured_idx on public.projects (is_featured, sort_order);


-- ------------------------------------------------------------
-- 2. project_images — галерея проекта
--
-- Отдельная таблица, а не колонка со списком: у проекта может
-- быть 0 фото, а может 20, и в одну ячейку это не помещается.
-- ------------------------------------------------------------
create table public.project_images (
  id          uuid primary key default gen_random_uuid(),

  -- references — ссылка на владельца. БД сама не даст вставить
  -- фото с несуществующим project_id.
  -- on delete cascade — удалили проект, его фото удалились сами
  -- (проект ВЛАДЕЕТ своими фото, отдельно они не существуют).
  project_id  uuid not null references public.projects(id) on delete cascade,

  url         text not null,
  position    integer not null default 0,   -- порядок внутри галереи
  created_at  timestamptz not null default now()
);

create index project_images_project_idx on public.project_images (project_id, position);


-- ------------------------------------------------------------
-- 3. reviews — отзывы клиентов
-- ------------------------------------------------------------
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,   -- адрес: /reviews/erik

  name        text not null,
  role        text not null,          -- "Owner, GuardiumMC"
  flag        text not null,          -- эмодзи-флаг

  -- Не "text": так называется тип данных в SQL, путались бы
  -- и база, и человек. В коде это поле Review.text.
  review_text text not null,

  -- check — правило, которое БД проверяет сама: сюда нельзя
  -- записать ничего, кроме этих двух значений. Дешевле enum:
  -- поменять список — одна команда, а не миграция типа.
  accent      text not null default 'orange'
              check (accent in ('orange', 'lime')),

  sort_order  integer,
  created_at  timestamptz not null default now()
);

create index reviews_slug_idx on public.reviews (slug);


-- ------------------------------------------------------------
-- 4. stats — три цифры на главной
--
-- id текстовый, а не uuid: это константный список настроек,
-- который правится руками, а не растущий список записей.
-- ------------------------------------------------------------
create table public.stats (
  id          text primary key,       -- "orders" / "reach" / "clients"
  label       text not null,
  value       numeric not null,
  suffix      text not null default '',   -- "+", "k", "%"
  color       text not null,          -- tailwind-класс: "text-orange-400"
  bar         text not null,          -- tailwind-класс: "bg-orange-400"
  sort_order  integer,
  updated_at  timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 5. Автоматический updated_at
--
-- Колонка updated_at сама себя не обновляет — без этого она
-- показывала бы время создания и врала. Триггер = правило
-- "перед каждым обновлением строки сделай вот это".
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger stats_set_updated_at
  before update on public.stats
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 6. Доступ (RLS)
--
-- RLS уже включена автоматически (галочка при создании проекта),
-- но включаем явно — чтобы схема воспроизводилась из этого файла
-- на любом другом проекте Supabase. Повторное включение безвредно.
--
-- Пока политик нет, таблица заперта наглухо. Ниже открываем
-- РОВНО одно: чтение для всех. Записи (insert/update/delete)
-- из браузера не будет ни у кого — контент правится через
-- Table Editor, который ходит в базу под служебной ролью и RLS
-- не подчиняется.
--
-- Политик на запись здесь СОЗНАТЕЛЬНО нет: писать их не под кого,
-- пока нет авторизации. Появится админ (Этап 3, шаг 6) — тогда
-- и появятся, под конкретного пользователя.
-- ------------------------------------------------------------
alter table public.projects       enable row level security;
alter table public.project_images enable row level security;
alter table public.reviews        enable row level security;
alter table public.stats          enable row level security;

create policy "public read" on public.projects
  for select using (true);

create policy "public read" on public.project_images
  for select using (true);

create policy "public read" on public.reviews
  for select using (true);

create policy "public read" on public.stats
  for select using (true);
