-- ============================================================
-- Creator self-serve upload ("Add a map") — 2026-07-30.
--
-- До сих пор КАЖДЫЙ товар писался вручную через Table Editor
-- (service role) — ни INSERT/UPDATE политики на products/product_images,
-- ни бакет под изображения, ни воспроизводимая политика на product-files
-- не существовали. Эта миграция открывает креатору узкий путь: он может
-- создать СВОЙ черновик и залить в него картинки/файл, но не может
-- опубликовать сам (см. status/is_published ниже) и не может трогать
-- чужие строки — только is_published=false свои.
--
-- Правило миграций: сначала preview, потом прод (docs/RULES.md).
-- ============================================================

-- ------------------------------------------------------------
-- 1. products: статус модерации + реальная категория.
--
-- status — отдельно от is_published: is_published управляет тем, что
-- видит витрина (как и раньше), status — это то, что видит владелец
-- сайта в Table Editor как очередь на проверку. Черновик креатора
-- всегда status='pending', is_published=false; владелец публикует
-- вручную, выставляя оба поля (is_published=true, status='published').
--
-- category — раньше только производная от slug (deriveCategory в
-- products.ts, TODO в коде ровно на этот случай). Три значения — те же,
-- что уже показывает витрина (SHOP_CATEGORIES); "free" сюда не входит
-- (бесплатность — это цена 0, а не отдельный тег, см. filterByCategory).
-- ------------------------------------------------------------
alter table public.products
  add column status text not null default 'pending'
    check (status in ('pending', 'published')),
  add column category text
    check (category in ('assets', 'landscape'));

update public.products
  set status = case when is_published then 'published' else 'pending' end;

-- ------------------------------------------------------------
-- 2. RLS: креатор может создать свою карту и редактировать её, пока она
-- не опубликована. После публикации строка для него закрывается —
-- правки живого платного товара уже не через эту форму (см. docs).
-- ------------------------------------------------------------
create policy "creators insert own products" on public.products
  for insert
  to authenticated
  with check (creator_id = (select auth.uid()));

create policy "creators update own unpublished products" on public.products
  for update
  to authenticated
  using (creator_id = (select auth.uid()) and is_published = false)
  with check (creator_id = (select auth.uid()));

create policy "creators insert images of own products" on public.product_images
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.creator_id = (select auth.uid())
    )
  );

create policy "creators delete images of own products" on public.product_images
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.creator_id = (select auth.uid())
    )
  );

-- ------------------------------------------------------------
-- 3. product-files (приватный бакет с файлами карт) — существовал только
-- вручную в проде (signedDownloadUrl в orders.ts на него полагается), но
-- ни бакет, ни политики не были воспроизводимы из миграций. Добавляем
-- обе вещи здесь: insert-политика позволяет только СВОЮ папку
-- (<user_id>/...) — как у avatars, без update/delete (переезалив = новый
-- путь, старый файл просто перестаёт быть на кого-то ссылку).
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-files', 'product-files', false)
on conflict (id) do nothing;

create policy "product-files insert own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- ------------------------------------------------------------
-- 4. product-images — новый ПУБЛИЧНЫЙ бакет под обложку и галерею.
-- Раньше картинки товаров были обычными внешними URL, вписанными вручную
-- (никакого бакета под них не было вовсе). Публичный, как avatars: показ
-- товара не должен ходить за подписанной ссылкой на каждую миниатюру.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product-images public read"
  on storage.objects
  for select
  using (bucket_id = 'product-images');

create policy "product-images insert own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
