-- ============================================================
-- orders.user_id — связь заказа с аккаунтом (Этап 4, подэтап D).
--
-- Раньше заказ был привязан только к email (авторизации не было). Теперь
-- покупка требует логина, и /api/checkout кладёт id аккаунта в Stripe
-- (client_reference_id). Вебхук достаёт его и пишет сюда — так «My
-- purchases» в профиле находит заказы по аккаунту, а не только по почте
-- (email можно сменить, id аккаунта постоянен).
--
-- Nullable: старые гостевые заказы (до Auth) user_id не имеют — их
-- профиль подхватывает по совпадению customer_email (см. orders.ts,
-- getPurchasesForUser). on delete set null: удалили аккаунт — заказ как
-- финансовая запись остаётся, теряется только ссылка на пользователя.
--
-- Правило миграций: сначала preview, потом прод (docs/RULES.md).
-- ============================================================

alter table public.orders
  add column user_id uuid references auth.users(id) on delete set null;

create index orders_user_id_idx on public.orders (user_id);


-- record_paid_order пересоздаём с новым параметром p_user_id. Сигнатура
-- меняется (добавился аргумент) — старую версию дропаем, иначе в БД
-- останутся две перегрузки функции.
drop function if exists public.record_paid_order(text, text, integer, text, jsonb);

create or replace function public.record_paid_order(
  p_stripe_session_id text,
  p_customer_email text,
  p_user_id uuid,
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
  insert into public.orders (stripe_session_id, customer_email, user_id, status, total_cents, currency)
  values (p_stripe_session_id, p_customer_email, p_user_id, 'paid', p_total_cents, p_currency)
  on conflict (stripe_session_id) do nothing
  returning id into v_order_id;

  -- Конфликт — этот session_id уже записан кем-то (вебхук/страница
  -- успеха пришли первыми). Не наши строки — свои позиции не пишем.
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

-- Только service_role — как и раньше (см. миграцию record_paid_order_fn).
revoke execute on function public.record_paid_order(text, text, uuid, integer, text, jsonb)
  from public, anon, authenticated;
