-- ============================================================
-- Креатор читает СВОИ черновики — 2026-07-30.
--
-- Пропущено в 20260730120000: там появились политики на вставку и
-- правку, но не на чтение. Единственная SELECT-политика у products —
-- "public read published" (using (is_published)), то есть строку с
-- is_published = false не видит НИКТО, включая её автора.
--
-- Из-за этого падала сама отправка формы: createProduct делает
-- .insert(...).select("id, slug"), то есть INSERT ... RETURNING, а на
-- RETURNING Postgres применяет SELECT-политики к возвращаемой строке.
-- Вставка проходила, чтение созданной строки — нет.
--
-- Политики RLS складываются по ИЛИ: эта не сужает публичное чтение
-- опубликованного, а добавляет к нему «свои строки, любые».
--
-- Правило миграций: сначала preview, потом прод (docs/RULES.md).
-- ============================================================

create policy "creators read own products" on public.products
  for select
  to authenticated
  using (creator_id = (select auth.uid()));

-- То же для галереи: скрины чернового товара автор должен видеть в
-- своей форме, хотя публично они закрыты (их политика смотрит на
-- p.is_published).
create policy "creators read images of own products" on public.product_images
  for select
  to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.creator_id = (select auth.uid())
    )
  );
