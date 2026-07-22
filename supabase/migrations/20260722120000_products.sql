-- ============================================================
-- products — товары магазина (Этап 4, подэтап A: каталог).
--
-- Те же принципы, что у projects (см. STRUCTURE.md):
--   - id (uuid) отдельно от slug (text, unique) — id вечный,
--     slug можно переименовать;
--   - готовая строка для показа (price_label) + число для
--     логики (price_cents) — UI не форматирует валюту сам;
--   - text + check вместо enum;
--   - sort_order — явный порядок вместо неявного порядка массива.
--
-- Чего здесь НЕТ и почему:
--   - таблиц orders/order_items — они появятся в подэтапе B
--     вместе со Stripe-вебхуком, писать их сейчас значит гадать;
--   - категорий/тегов — товаров пока единицы, колонка-ярлык
--     добавится одной ALTER TABLE, когда появится потребность.
-- ============================================================

create table public.products (
  id             uuid primary key default gen_random_uuid(),

  slug           text not null unique,   -- адрес: /shop/medieval-spawn
  title          text not null,
  summary        text not null,          -- короткий текст на карточке каталога
  description    text not null,          -- длинный текст на странице товара

  image_url      text not null,          -- обложка товара

  -- Деньги — ЦЕЛОЕ ЧИСЛО ЦЕНТОВ, не numeric/float: с плавающей
  -- точкой 0.1 + 0.2 не равно 0.3, а Stripe и так принимает
  -- суммы в центах — храним сразу в его формате.
  price_cents    integer not null check (price_cents > 0),
  price_currency text not null default 'EUR',
  price_label    text not null,          -- готовая строка: "€15"

  -- Путь к файлу карты в ПРИВАТНОМ бакете Supabase Storage.
  -- Nullable до подэтапа B: каталог показывает товары, но выдача
  -- файла появится только вместе с оплатой. Сам файл никогда не
  -- публичен — покупатель получит временную подписанную ссылку.
  file_path      text,

  -- Черновики невидимы: RLS ниже отдаёт анониму только
  -- опубликованные строки. Добавил товар — он скрыт, пока не
  -- поставишь галочку. Обратное умолчание показывало бы
  -- недописанные товары всем.
  is_published   boolean not null default false,

  sort_order     integer,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index products_slug_idx on public.products (slug);
create index products_published_idx on public.products (is_published, sort_order);

-- Тот же триггер, что у projects/stats (функция уже существует).
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Доступ: аноним читает ТОЛЬКО опубликованное.
--
-- Отличие от projects (там using (true)): у товаров есть
-- черновики. Фильтр в RLS, а не только в запросе кода — даже
-- прямое обращение к REST API Supabase с anon-ключом не покажет
-- неопубликованный товар. Записи из браузера нет ни у кого,
-- контент правится через Table Editor (service role).
-- ------------------------------------------------------------
alter table public.products enable row level security;

create policy "public read published" on public.products
  for select using (is_published);
