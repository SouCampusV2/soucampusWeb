-- ============================================================
-- record_paid_order() — атомарная запись заказа + его позиций.
--
-- Баг, который это чинит: recordPaidOrder() в коде писал orders и
-- order_items ДВУМЯ отдельными запросами. Вебхук и страница успеха могут
-- вызвать запись почти одновременно (см. комментарий в orders.ts про
-- гонку) — и если ЧТЕНИЕ (getPaidOrder, страница успеха) попадало в
-- окно между этими двумя запросами первого писавшего, оно видело заказ
-- уже созданным, а order_items — ещё пустым: "Thank you" с суммой и
-- email, но без единого товара для скачивания. Живой пример: заказ
-- на два товара, показанный без обоих в первые доли секунды после
-- редиректа со Stripe.
--
-- Тело функции PL/pgSQL выполняется как ОДНА транзакция: другой читатель
-- либо не видит заказ вообще (ещё не закоммичен), либо видит его СРАЗУ
-- со всеми позициями — половинчатого состояния снаружи не существует.
--
-- security definer: функция должна писать в orders/order_items, на
-- которые нет ни одной политики RLS ни для одной роли (см. миграцию
-- orders) — под правами вызывающей роли (invoker) она не смогла бы
-- вставить ни строки. Вызывать её может только service_role (см. revoke
-- ниже), так что расширение прав здесь не открывает новую дыру — это
-- ровно то же самое, что уже делает getSupabaseAdmin() из кода.
create or replace function public.record_paid_order(
  p_stripe_session_id text,
  p_customer_email text,
  p_total_cents integer,
  p_currency text,
  p_items jsonb  -- [{product_id, title, price_cents, quantity}, ...]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  insert into public.orders (stripe_session_id, customer_email, status, total_cents, currency)
  values (p_stripe_session_id, p_customer_email, 'paid', p_total_cents, p_currency)
  on conflict (stripe_session_id) do nothing
  returning id into v_order_id;

  -- Конфликт — кто-то другой (вебхук/страница успеха) уже начал (или уже
  -- закончил) запись этого же session_id первым. Раз мы не создатели
  -- строки orders, свои позиции не пишем — иначе рисковали бы вставить
  -- order_items дважды. Идемпотентность на уровне вызывающего кода в
  -- recordPaidOrder() не изменилась, просто теперь гонки не видно наружу.
  if v_order_id is null then
    return null;
  end if;

  insert into public.order_items (order_id, product_id, title, price_cents, quantity)
  select
    v_order_id,
    (item->>'product_id')::uuid,
    item->>'title',
    (item->>'price_cents')::integer,
    (item->>'quantity')::integer
  from jsonb_array_elements(p_items) as item;

  return v_order_id;
end;
$$;

-- Только service_role. anon/authenticated не должны обходить RLS через
-- вызов чужой security definer функции — тот же принцип, что и запрет
-- прямого чтения page_view_counts/site_view_counts анониму.
revoke execute on function public.record_paid_order(text, text, integer, text, jsonb)
  from public, anon, authenticated;
