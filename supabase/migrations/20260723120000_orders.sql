-- ============================================================
-- orders / order_items — заказы магазина (Этап 4, подэтап B: Stripe).
--
-- Те же принципы, что у products (см. STRUCTURE.md):
--   - id (uuid) отдельно от stripe_session_id — id вечный, id сессии
--     Stripe используется только чтобы найти заказ по вебхуку;
--   - деньги — целое число центов, не numeric/float;
--   - text + check вместо enum для status.
--
-- Зачем order_items хранит title/price_cents отдельно от products,
-- хотя это дублирование: это СНИМОК цены на момент покупки. Если
-- через месяц автор поднимет цену на товар, старый заказ должен
-- показывать цену, которую человек реально заплатил, а не текущую.
-- Тот же принцип, что price_label у projects — готовое значение,
-- а не пересчёт на лету.
--
-- Чего здесь НЕТ и почему:
--   - user_id — авторизации ещё нет (подэтап D), заказ пока привязан
--     только к email, который Stripe получает при оплате;
--   - order_files — файл выдаётся через join order_items -> product_id
--     -> products.file_path в момент запроса на скачивание, отдельная
--     таблица под уже готовые ссылки не нужна: подписанная ссылка живёт
--     недолго, хранить её незачем.
-- ============================================================

create table public.orders (
  id                 uuid primary key default gen_random_uuid(),

  -- Идентификатор Checkout Session в Stripe. Уникален — вебхук может
  -- прийти дважды (Stripe сам ретраит недоставленные события), и
  -- повторная обработка того же session_id не должна создать второй
  -- заказ. unique здесь даёт то же самое, что page_views_unique_visitor
  -- у просмотров: защита от дубля на уровне БД, а не только в коде.
  stripe_session_id  text not null unique,

  customer_email     text not null,

  -- pending — Checkout Session создана, оплата ещё не подтверждена
  --   (вебхук checkout.session.completed ещё не пришёл);
  -- paid — оплата подтверждена, файлы можно выдавать;
  -- failed — оплата не прошла;
  -- refunded — деньги возвращены, доступ к файлам закрывается.
  status             text not null default 'pending'
                      check (status in ('pending', 'paid', 'failed', 'refunded')),

  total_cents        integer not null check (total_cents > 0),
  currency           text not null default 'EUR',

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index orders_stripe_session_idx on public.orders (stripe_session_id);
create index orders_email_idx on public.orders (customer_email);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();


create table public.order_items (
  id           uuid primary key default gen_random_uuid(),

  order_id     uuid not null references public.orders(id) on delete cascade,

  -- restrict, не cascade: удалить товар, на который есть заказы,
  -- не должно стирать историю покупок. Товары в шопе не удаляются
  -- физически (Table Editor снимает is_published), так что практике
  -- это не мешает.
  product_id   uuid not null references public.products(id) on delete restrict,

  -- Снимок на момент покупки — см. пояснение в шапке файла.
  title        text not null,
  price_cents  integer not null check (price_cents > 0),
  quantity     integer not null default 1 check (quantity > 0),

  created_at   timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);


-- ------------------------------------------------------------
-- Доступ: обе таблицы закрыты для анонима полностью, без единой
-- политики. Тот же паттерн, что у page_views:
--   - пишет заказ только вебхук /api/stripe/webhook под service_role;
--   - читает заказы (для выдачи файла/истории покупок) тоже сервер.
-- Публичного чтения своих заказов пока нет — до подэтапа D (Supabase
-- Auth) страницу "мои покупки" показывать некому, а гостю ссылку на
-- скачивание отдаёт сама страница успеха оплаты, без обращения к
-- этой таблице напрямую из браузера.
-- ------------------------------------------------------------
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
