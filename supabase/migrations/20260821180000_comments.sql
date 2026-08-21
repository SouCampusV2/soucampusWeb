-- Комментарии под картой — 2026-08-21.
--
-- РЕШЕНИЯ ВЛАДЕЛЬЦА, все приняты до кода:
--   • писать может ТОЛЬКО КУПИВШИЙ, остальным поле заблокировано;
--   • ветки ПЛОСКИЕ — ответов на ответы нет;
--   • удалять может автор комментария, автор карты и площадка;
--   • удаление НЕ СТИРАЕТ строку, а помечает её.
--
-- ПОЧЕМУ ПРАВО ПИСАТЬ ПРОВЕРЯЕТ БАЗА, А НЕ ФОРМА. Комментарий пишется из
-- браузера прямо в таблицу — нашего серверного кода в этом пути нет.
-- Заблокированное поле в интерфейсе не мешает вставить строку запросом из
-- консоли: спрятать кнопку — не значит закрыть дверь. Механизм уже
-- готов и проверен: has_purchased() (миграция 20260726140000) так же
-- стережёт оценки.
--
-- ⚠️ ЧТО СЧИТАЕТСЯ ПОКУПКОЙ. has_purchased() смотрит на ОПЛАЧЕННЫЙ заказ,
-- а с 20260812120000 заказ может быть на нулевую сумму. То есть скачавший
-- бесплатную карту — тоже «купивший», и писать он вправе. Это не дыра, а
-- решение владельца (обсуждено 21.08): бесплатная карта — такая же карта,
-- и человек, который её поставил, имеет что сказать. Но помнить об этом
-- надо: при двух бесплатных картах на витрине право писать получает
-- практически любой зарегистрированный.
--
-- ПОЧЕМУ УДАЛЁННОЕ НЕ СТИРАЕТСЯ. Иначе работает такой приём: человек
-- пишет гадость, ему отвечают, он удаляет своё — и чужой ответ остаётся
-- висеть беспричинной агрессией. Помеченный комментарий сохраняет
-- порядок разговора, не показывая текста.

-- ------------------------------------------------------------
-- 1. Таблица.
--
-- Родителя (parent_id) здесь НЕТ, и это решение, а не упущение. Ветки
-- плоские: вложенность — это заметно больше кода и заметно больше
-- модерации, а под картой обсуждают карту, а не друг друга. Если ветки
-- однажды понадобятся, добавить колонку легко; убрать её потом, вместе с
-- уже написанными ответами, — нельзя.

create table if not exists public.product_comments (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  -- on delete cascade: удалил аккаунт — унёс свои комментарии. Здесь это
  -- верно (в отличие от карт, где остаются покупатели): комментарий не
  -- продукт, за него никто не платил.
  user_id    uuid not null references auth.users(id) on delete cascade,

  -- Потолок такой же, как у отзыва: 2000. Форма считает до 1000 —
  -- разрыв намеренный, тот же довод, что в 20260820140000_text_limits:
  -- форма про удобство, база про гарантию.
  body       text not null check (char_length(body) between 1 and 2000),

  -- Кто удалил: 'author' (сам написавший), 'creator' (автор карты),
  -- 'moderator' (площадка). null — комментарий живой.
  --
  -- Три значения, а не флаг: «человек передумал» и «сняли за нарушение» —
  -- разные события, и показывать их одинаково значит терять смысл. Ровно
  -- тот же довод, по которому у карт завели deleted_by (20260815150000).
  deleted_by text check (deleted_by in ('author', 'creator', 'moderator')),
  deleted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Лента под картой читается по product_id и в порядке времени — индекс
-- ровно под этот запрос.
create index if not exists product_comments_product_idx
  on public.product_comments (product_id, created_at desc);

create trigger product_comments_set_updated_at
  before update on public.product_comments
  for each row execute function public.set_updated_at();

alter table public.product_comments enable row level security;

-- ------------------------------------------------------------
-- 2. Кто что может.

-- Читают все, включая анонимов: комментарии — часть страницы карты.
-- Удалённые отдаются тоже — без текста их не показать «удалённым», а
-- вырезать текст должен показ, а не выборка (иначе на месте комментария
-- окажется пустота, и порядок разговора всё равно сломается).
create policy "public read comments"
  on public.product_comments for select
  to anon, authenticated using (true);

-- Пишет только купивший и только от своего имени.
--
-- Обе половины обязательны: auth.uid() = user_id не даёт подписаться
-- чужим именем, has_purchased() не даёт написать не купив. Ни одна из
-- них не заменяет другую.
create policy "insert own comment if bought"
  on public.product_comments for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.has_purchased(product_id)
  );

-- Править своё — можно, пока комментарий жив.
--
-- ⚠️ Окна в несколько минут, которое обсуждалось, здесь НЕТ. Довод: срок
-- пришлось бы держать в двух местах (тут и в интерфейсе), а защищает он
-- от «подменил текст после ответа» — приёма, который и так виден, потому
-- что правка ставит updated_at, и показ об этом говорит. Заводить время
-- ради того, что уже решено иначе, незачем.
create policy "update own comment"
  on public.product_comments for update
  to authenticated
  using (auth.uid() = user_id and deleted_by is null)
  with check (auth.uid() = user_id);

-- Удаления политикой НЕТ ВОВСЕ, и это не пропуск: удаление у нас мягкое,
-- то есть update. Настоящий delete не разрешён никому — ни автору
-- комментария, ни автору карты, ни площадке (та ходит служебным ключом,
-- который RLS не касается). Строка не должна исчезать.

-- ------------------------------------------------------------
-- 3. Мягкое удаление — одной функцией на всех.
--
-- ПОЧЕМУ ФУНКЦИЯ, А НЕ ПОЛИТИКА НА UPDATE. Право удалить есть у ТРЁХ
-- разных людей, и различаются они не полем, а отношением к строке:
-- написавший, автор карты, площадка. Выразить это политикой можно, но
-- тогда каждый из трёх пишет deleted_by сам — и ничто не мешает автору
-- карты пометить чужое как «author передумал». Функция ставит метку
-- САМА, по тому, кто её позвал, и соврать вызывающий не может.

create or replace function public.soft_delete_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  who text;
begin
  select pc.*, p.creator_id
    into c
    from public.product_comments pc
    join public.products p on p.id = pc.product_id
   where pc.id = p_comment_id;

  if not found then
    -- Не «нет прав», а «нет такого»: сообщать постороннему, что
    -- комментарий существует, незачем.
    raise exception 'comment_not_found' using errcode = 'no_data_found';
  end if;

  if c.deleted_by is not null then
    return; -- Уже удалён. Повтор — не ошибка, просто нечего делать.
  end if;

  if auth.uid() = c.user_id then
    who := 'author';
  elsif auth.uid() = c.creator_id then
    who := 'creator';
  else
    -- Площадка сюда не приходит: админка ходит служебным ключом и пишет
    -- строку напрямую. Всё остальное — посторонний.
    raise exception 'comment_forbidden' using errcode = 'insufficient_privilege';
  end if;

  update public.product_comments
     set deleted_by = who, deleted_at = now()
   where id = p_comment_id;
end;
$$;

grant execute on function public.soft_delete_comment(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4. Сколько комментариев у карт — одним запросом.
--
-- Тот же приём и та же причина, что у get_reaction_counts: считать по
-- карте отдельным запросом значит двадцать запросов на витрину.
-- Удалённые не в счёт — их не показывают числом.

create or replace function public.get_comment_counts(p_ids uuid[])
returns table (product_id uuid, comments bigint)
language sql
security definer
set search_path = ''
as $$
  select c.product_id, count(*)::bigint
    from public.product_comments c
   where c.product_id = any(p_ids)
     and c.deleted_by is null
   group by c.product_id;
$$;

grant execute on function public.get_comment_counts(uuid[]) to anon, authenticated;

notify pgrst, 'reload schema';
