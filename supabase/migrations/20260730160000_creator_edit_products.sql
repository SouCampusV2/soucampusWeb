-- ============================================================
-- Креатор редактирует свои карты — 2026-07-30.
--
-- В 20260730120000 правка была разрешена ТОЛЬКО пока карта не
-- опубликована: «после публикации строка для него закрывается». На деле
-- это слишком строго — опечатку в описании или новый скриншот автор
-- должен уметь поправить сам, не проходя модерацию заново.
--
-- Но у послабления есть опасная сторона: если разрешить менять ВСЁ,
-- креатор мог бы провести безобидную карту через модерацию, а потом
-- подменить файл на что угодно — и покупатели скачивали бы уже это, под
-- нашим брендом. Поэтому правка разрешается вся, КРОМЕ подмены файла у
-- опубликованной карты: замена file_path автоматически снимает карту с
-- публикации и возвращает в очередь (триггер ниже).
--
-- Правило миграций: сначала preview, потом прод (docs/RULES.md).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Правка своих карт — в любом состоянии.
-- ------------------------------------------------------------
drop policy if exists "creators update own unpublished products" on public.products;

create policy "creators update own products" on public.products
  for update
  to authenticated
  using (creator_id = (select auth.uid()))
  with check (creator_id = (select auth.uid()));

-- ------------------------------------------------------------
-- 2. Замена файла у опубликованной карты = повторная модерация.
--
-- Здесь же закрывается и вторая дыра: политика выше разрешает креатору
-- любой update своей строки, включая is_published = true. То есть без
-- этого триггера автор мог бы опубликовать себя сам одним запросом из
-- браузера, минуя очередь. Триггер возвращает оба поля на место, если
-- их меняет обычный пользователь, а не наш сервер.
--
-- Как и в protect_is_admin: отличаем «запрос от залогиненного конечного
-- пользователя» (роль authenticated) от служебной роли и postgres, под
-- которыми ходят сервер, SQL-редактор и миграции.
-- ------------------------------------------------------------
create or replace function public.guard_product_publication()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_end_user boolean := auth.role() = 'authenticated' and auth.uid() is not null;
begin
  if not is_end_user then
    return new;   -- сервер (service_role) и миграции — без ограничений
  end if;

  -- Публиковать и снимать с модерации может только сервер.
  new.is_published := old.is_published;
  new.status       := old.status;
  -- Причину отказа автор тоже не стирает сам.
  new.rejection_reason := old.rejection_reason;

  -- Подменил файл у уже опубликованной карты — она уходит на проверку
  -- заново, а с витрины снимается до одобрения.
  if new.file_path is distinct from old.file_path and old.is_published then
    new.is_published := false;
    new.status := 'pending';
    new.rejection_reason := null;
  end if;

  return new;
end;
$$;

drop trigger if exists products_guard_publication on public.products;
create trigger products_guard_publication
  before update on public.products
  for each row execute function public.guard_product_publication();
