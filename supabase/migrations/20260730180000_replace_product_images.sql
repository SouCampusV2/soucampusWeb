-- ============================================================
-- Атомарная замена галереи товара — 2026-07-30.
--
-- В EditMapForm галерея переписывалась двумя отдельными запросами:
-- delete всех строк product_images, затем insert новых. Между ними есть
-- окно, в котором у товара НОЛЬ картинок — оборвалась сеть, закрыли
-- вкладку, упал второй запрос, и галерея потеряна целиком, восстановить
-- нечем.
--
-- Это ровно та же болезнь, что уже лечили у заказов: там insert в orders
-- и insert в order_items шли подряд, и между ними страница успеха видела
-- заказ без позиций. Вылечили одной функцией в транзакции
-- (record_paid_order, миграция 20260723130000). Здесь то же лекарство.
--
-- Правило миграций: сначала preview, потом прод (docs/RULES.md).
-- ============================================================

create or replace function public.replace_product_images(
  p_product_id uuid,
  p_urls text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- security definer обходит RLS, поэтому владение проверяем ЗДЕСЬ и
  -- явно: без этой проверки любой залогиненный мог бы переписать галерею
  -- чужого товара, зная только его id.
  if not exists (
    select 1 from public.products p
    where p.id = p_product_id
      and p.creator_id = (select auth.uid())
  ) then
    raise exception 'not your product';
  end if;

  delete from public.product_images where product_id = p_product_id;

  -- with ordinality даёт порядковый номер элемента массива — позиция в
  -- галерее берётся из порядка, в котором креатор расставил картинки.
  insert into public.product_images (product_id, url, position)
  select p_product_id, t.url, t.ord - 1
  from unnest(p_urls) with ordinality as t(url, ord);
end;
$$;

-- Аноним галереи не правит; функция только для залогиненных, и внутри
-- всё равно проверяется, что товар его.
revoke execute on function public.replace_product_images(uuid, text[]) from anon;
grant execute on function public.replace_product_images(uuid, text[]) to authenticated;
