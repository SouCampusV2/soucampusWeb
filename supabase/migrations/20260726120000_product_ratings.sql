-- Оценки товаров + публичные агрегаты витрины (оценки и покупки).
-- Прогнать: СНАЧАЛА preview, ПОТОМ прод (правило docs/RULES.md).
--
-- Идея: сами оценки приватны (каждый видит только свою), а витрине нужны
-- только агрегаты (средний балл, число оценок, число покупок). Их отдаёт
-- security-definer функция get_product_stats() — она считает поверх
-- приватных таблиц (orders/order_items/product_ratings), но наружу отдаёт
-- только обезличенные числа, не вскрывая, кто что купил или оценил.

create table public.product_ratings (
  id          uuid primary key default gen_random_uuid(),

  product_id  uuid not null references public.products(id) on delete cascade,
  -- Оценку ставит залогиненный пользователь; при удалении аккаунта его
  -- оценки уходят вместе с ним.
  user_id     uuid not null references auth.users(id) on delete cascade,

  stars       integer not null check (stars between 1 and 5),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Одна оценка на пару (товар, пользователь) — повторная оценка меняет
  -- прежнюю (upsert по этому ограничению), а не плодит вторую.
  unique (product_id, user_id)
);

-- Быстрый агрегат по товару (avg/count в get_product_stats).
create index product_ratings_product_idx on public.product_ratings (product_id);

alter table public.product_ratings enable row level security;

-- Читать можно только СВОИ оценки (нужно, чтобы в «My purchases» показать,
-- что ты уже поставил). Публичного чтения чужих оценок нет — наружу идут
-- только агрегаты через функцию ниже.
create policy "read own ratings"
  on public.product_ratings for select
  using (auth.uid() = user_id);

-- Поставить оценку может только САМ пользователь и только тому товару,
-- который он реально КУПИЛ (оплаченный заказ на его аккаунт). Так «оценки»
-- остаются честными — не накрутить, не купив.
create policy "insert own rating if bought"
  on public.product_ratings for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = product_ratings.product_id
        and o.user_id = auth.uid()
        and o.status = 'paid'
    )
  );

-- Менять — только свою оценку.
create policy "update own rating"
  on public.product_ratings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Удалить — только свою.
create policy "delete own rating"
  on public.product_ratings for delete
  using (auth.uid() = user_id);

-- Публичные агрегаты витрины. security definer: функция выполняется с
-- правами владельца и обходит RLS приватных таблиц, но возвращает только
-- обезличенные числа. set search_path — обязательная страховка для
-- security definer (иначе можно подменить объекты через search_path).
create or replace function public.get_product_stats()
returns table (
  product_id   uuid,
  rating_avg   numeric,
  rating_count bigint,
  sales_count  bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    coalesce(round(avg(r.stars)::numeric, 2), 0) as rating_avg,
    count(r.stars)                               as rating_count,
    coalesce((
      select sum(oi.quantity)
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = p.id and o.status = 'paid'
    ), 0)                                         as sales_count
  from public.products p
  left join public.product_ratings r on r.product_id = p.id
  group by p.id;
$$;

grant execute on function public.get_product_stats() to anon, authenticated;
