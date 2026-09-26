-- Журнал скачиваний купленных карт. (2026-09-26)
--
-- ЗАЧЕМ. Аудит перед живыми платежами (docs/STRIPE.md → Payments
-- security): при споре о списании (chargeback) банк спрашивает, получил
-- ли покупатель товар. У цифрового товара ответ — «вот когда и с какого
-- устройства он его скачал». До этой миграции такого факта не было
-- нигде: ссылка выдавалась, скачивание не записывалось.
--
-- ⚠️ СТРОКА ПИШЕТСЯ НА КЛИК, А НЕ НА ПОКАЗ СТРАНИЦЫ. /purchases и
-- страница успеха раньше подписывали ссылку на файл при каждом рендере
-- — для всех карт сразу. Запись в момент подписи означала бы «открыл
-- список», а не «скачал». Поэтому кнопка Download теперь ведёт на
-- /api/download, и строка появляется там, перед редиректом на файл.
--
-- ⚠️ ДОБАВЛЯЮЩАЯ — ИДЁТ ДО ДЕПЛОЯ. Новый код пишет в эту таблицу при
-- каждом скачивании. Если таблицы нет, скачивание всё равно отдаётся
-- (запись журнала не имеет права отнять у покупателя файл), но в лог
-- сервера сыплются ошибки, а доказательства не копятся.
--
-- Что НЕ храним: сам IP (только хэш с солью, как в page_views) — это
-- обещано в /privacy. Хэш при этом годится как доказательство: соль
-- наша, и IP из квитанции Stripe можно прогнать через ту же функцию и
-- сравнить.
--
-- Файл перезапускаемый.

create table if not exists public.download_events (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  -- Какой заказ дал право скачать. set null, а не cascade: журнал —
  -- доказательство, и удаление заказа не должно стирать то, что файл
  -- был получен. Заказы у нас не удаляются, но журнал на это не
  -- полагается.
  order_id       uuid references public.orders(id) on delete set null,
  product_id     uuid references public.products(id) on delete set null,
  -- Снимок названия: как у order_items.title, карта может быть
  -- переименована или удалена, а в споре важно, что было куплено.
  title          text not null,
  -- null у гостевого заказа — тогда человека определяет почта.
  user_id        uuid references auth.users(id) on delete set null,
  customer_email text not null,
  -- Откуда нажали: список покупок или страница после оплаты.
  source         text not null check (source in ('purchases', 'success')),
  ip_hash        text not null,
  -- Строка браузера, обрезанная обработчиком до 300 символов. Для спора
  -- это «с какого устройства», для нас — ничего больше.
  user_agent     text
);

create index if not exists download_events_created_idx
  on public.download_events (created_at desc);
create index if not exists download_events_email_idx
  on public.download_events (customer_email);

-- Закрыта от браузера целиком: пишет обработчик /api/download, читает
-- админка — обе служебным ключом. RLS без единой политики не отдаёт ни
-- строки; revoke — второй рубеж и честный отказ прав (42501) вместо
-- пустого списка. Тот же рецепт, что у page_views и product_comments.
alter table public.download_events enable row level security;
revoke all on public.download_events from public, anon, authenticated;
revoke all on sequence public.download_events_id_seq from public, anon, authenticated;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Журнал прогонов — последней строкой (docs/RULES.md → «Миграции»).
-- ------------------------------------------------------------
insert into ops.applied_migrations (version)
values ('20260926120000_download_events')
on conflict do nothing;
