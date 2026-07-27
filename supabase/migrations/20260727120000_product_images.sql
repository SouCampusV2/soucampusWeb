-- ============================================================
-- product_images — галерея товара магазина (2026-07-27).
--
-- Ровно тот же приём, что у project_images в портфолио: отдельная
-- таблица, а не колонка-массив. У товара может быть 0 скринов, а
-- может 20 — в одну ячейку это не помещается, а отдельные строки
-- ещё и упорядочиваются (position) и удаляются каскадом вместе с
-- товаром.
--
-- image_url у самого products остаётся ОБЛОЖКОЙ (превью карточки и
-- og:image). Эта таблица — дополнительные скриншоты, которые
-- показываются под превью на странице товара и стрелками прямо на
-- карточке витрины.
-- ============================================================

create table public.product_images (
  id          uuid primary key default gen_random_uuid(),

  product_id  uuid not null references public.products(id) on delete cascade,

  url         text not null,
  position    integer not null default 0,   -- порядок внутри галереи
  created_at  timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, position);

alter table public.product_images enable row level security;

-- Читать можно только скрины ОПУБЛИКОВАННЫХ товаров. Подзапрос к
-- products здесь безопасен и работает (в отличие от истории с orders,
-- где помогла только security-definer функция): у products есть
-- политика "public read published", то есть аноним эту таблицу видеть
-- имеет право — просто в урезанном виде. Черновик не опубликован →
-- exists вернёт false → его скрины тоже невидимы.
create policy "public read images of published products" on public.product_images
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.is_published
    )
  );

-- ------------------------------------------------------------
-- Бесплатные товары: цена 0.
--
-- Исходный check (price_cents > 0) писался, когда бесплатных карт не
-- предполагалось. Но категория «Free» на витрине определяется именно
-- ценой 0 (см. filterByCategory в src/lib/products.ts) — с прежним
-- ограничением её физически нечем было наполнить. Ослабляем до >= 0;
-- отрицательная цена по-прежнему запрещена.
-- ------------------------------------------------------------
alter table public.products drop constraint if exists products_price_cents_check;
alter table public.products add constraint products_price_cents_check
  check (price_cents >= 0);
