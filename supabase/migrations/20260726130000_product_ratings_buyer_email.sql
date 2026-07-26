-- Фикс: оценивать можно и покупку, привязанную к аккаунту ПО EMAIL.
-- Прогнать: СНАЧАЛА preview, ПОТОМ прод.
--
-- Почему: заказы связываются с аккаунтом двумя путями (см.
-- getPurchasesForUser): по user_id (куплено под аккаунтом) И по email
-- среди гостевых заказов (user_id null). Прежняя политика проверяла
-- только user_id, поэтому купленное «гостём по той же почте» оценить было
-- нельзя (а таких заказов большинство). Добавляем ветку по email через
-- auth.email() — ровно то же правило связывания, что в коде.

drop policy "insert own rating if bought" on public.product_ratings;

create policy "insert own rating if bought"
  on public.product_ratings for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = product_ratings.product_id
        and o.status = 'paid'
        and (
          o.user_id = auth.uid()
          or (o.user_id is null and o.customer_email = auth.email())
        )
    )
  );
