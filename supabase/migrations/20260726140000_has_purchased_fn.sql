-- НАСТОЯЩИЙ фикс оценок. Прогнать: СНАЧАЛА preview, ПОТОМ прод.
--
-- Корень проблемы: политика вставки оценки проверяла покупку подзапросом
-- к orders/order_items. Но эти таблицы закрыты RLS (читает только
-- service_role), а подзапрос внутри политики выполняется С ПРАВАМИ
-- ПОЛЬЗОВАТЕЛЯ — то есть видит НОЛЬ заказов. Итог: проверка «купил ли»
-- всегда ложна, любая оценка отклоняется (проверено end-to-end на
-- preview: и по user_id, и по email — 42501 RLS violation).
--
-- Решение: вынести проверку в security-definer функцию has_purchased() —
-- она выполняется с правами владельца и обходит RLS заказов, а auth.uid()/
-- auth.email() внутри неё по-прежнему берутся из JWT вызывающего. Политика
-- зовёт функцию — и подзапрос наконец видит заказы. (Прошлые миграции
-- 20260726130000/…120000 правили ветку email, но не саму причину.)

create or replace function public.has_purchased(p_product_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = p_product_id
      and o.status = 'paid'
      and (
        o.user_id = auth.uid()
        or (o.user_id is null and o.customer_email = auth.email())
      )
  );
$$;

-- authenticated — чтобы политика (и клиент, если понадобится проверить
-- «уже куплено») могла её звать. Аноним покупок не имеет, ему ни к чему.
grant execute on function public.has_purchased(uuid) to authenticated;

-- Пересобираем политику вставки: теперь через функцию.
drop policy "insert own rating if bought" on public.product_ratings;

create policy "insert own rating if bought"
  on public.product_ratings for insert
  with check (
    auth.uid() = user_id
    and public.has_purchased(product_id)
  );
