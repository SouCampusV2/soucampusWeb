-- ============================================================
-- Шлюз записи, путь №2: карта пишется только нашим обработчиком.
-- 2026-09-13.
--
-- Продолжение 20260911120000_map_file_gateway. Тот снял запись ФАЙЛА из
-- браузера, этот — запись самой КАРТЫ: строки products и её галереи.
-- Разбор — docs/ARCHITECTURE.md § 5.4 (шаг 3) и шапка
-- src/app/api/creator/map/route.ts.
--
-- ⚠️ ПОРЯДОК ОБРАТНЫЙ ОБЫЧНОМУ — КАК У ПРЕДЫДУЩЕЙ.
-- Миграция УДАЛЯЕТ разрешения, значит идёт ПОСЛЕ деплоя кода. Прогонишь
-- раньше — старый код на Vercel ещё пишет в таблицу напрямую, а
-- политики уже нет: загрузка и правка карт ломаются на проде.
--
-- ⚠️ ЧТО ПОЛИТИКА ГОВОРИЛА, ПОМИМО «ЧЬЯ СТРОКА».
-- "creators insert own products" (20260811160000) проверяла ТРИ вещи:
-- свой creator_id, наличие is_creator и паузу submissions_blocked_until
-- после тяжёлого отказа. Все три перенесены в обработчик; третья — та,
-- которую легче всего было потерять молча, потому что её отсутствие
-- ничего не ломает и ничем не видно.
--
-- ⚠️ ТРИГГЕРЫ ОСТАЮТСЯ, И ЭТО НЕ ЗАБЫВЧИВОСТЬ.
-- guard_product_insert и guard_product_author_edit не удаляются:
-- служебную роль они и так пропускают, а для любого пути, который
-- когда-нибудь снова пойдёт из браузера, остаются работающим запретом.
-- Второй рубеж, а не единственный механизм (ARCHITECTURE.md § 5.4,
-- шаг 5).
--
-- ЧТО НЕ ТРОГАЕТСЯ: политики бакетов product-images и avatars. Картинки
-- по-прежнему летят в Storage из браузера — это путь №5, отдельная
-- задача. Граница проведена по бакету, потому что доказательством
-- служит снятая политика, а снять половину политики нельзя.
--
-- Правило миграций: сначала preview, потом прод (docs/RULES.md).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Карту из браузера не пишет никто.
-- ------------------------------------------------------------
drop policy if exists "creators insert own products" on public.products;
drop policy if exists "creators update own products" on public.products;
-- Имя из первой редакции (20260730120000) — на случай базы, где
-- 20260730160000 почему-то не прогонялась.
drop policy if exists "creators update own unpublished products" on public.products;

-- ------------------------------------------------------------
-- 2. Галерею тоже.
--
-- Это заодно закрывает путь №4 из инвентаризации: обе политики
-- product_images существовали ради тех же двух форм.
-- ------------------------------------------------------------
drop policy if exists "creators insert images of own products" on public.product_images;
drop policy if exists "creators delete images of own products" on public.product_images;

-- ------------------------------------------------------------
-- 3. replace_product_images — теперь только для сервера.
--
-- Функция security definer, и владение она проверяла по auth.uid().
-- Под служебным ключом auth.uid() равен null, то есть наш обработчик
-- получил бы «not your product» на собственной же карте.
--
-- ⚠️ Проверку НЕ убираем, а делаем условной — ровно тем же способом,
-- каким это написано во всех guard_*: «не конечный пользователь —
-- пропускаем». Убрать её целиком было бы верно ровно до того дня, когда
-- execute кому-нибудь вернут; а условие остаётся верным всегда.
--
-- Владение при этом проверяет и обработчик, ДО вызова. Два раза — не
-- избыточность: одна проверка отвечает «его ли это карта», вторая
-- страхует функцию от того, кто позовёт её мимо обработчика.
-- ------------------------------------------------------------
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
  if auth.role() = 'authenticated' and auth.uid() is not null then
    if not exists (
      select 1 from public.products p
      where p.id = p_product_id
        and p.creator_id = (select auth.uid())
    ) then
      raise exception 'not your product';
    end if;
  end if;

  delete from public.product_images where product_id = p_product_id;

  insert into public.product_images (product_id, url, position)
  select p_product_id, t.url, t.ord - 1
  from unnest(p_urls) with ordinality as t(url, ord);
end;
$$;

-- ⚠️ Postgres выдаёт execute новой функции роли PUBLIC ПО УМОЛЧАНИЮ, и
-- create or replace этого не сбрасывает. Снимаем поимённо: это то же
-- правило, что ловили пять раз за август и ещё раз на consume_rate_limit
-- 23.08 — разрешение здесь выдаётся само и молча.
revoke execute on function public.replace_product_images(uuid, text[]) from public;
revoke execute on function public.replace_product_images(uuid, text[]) from anon;
revoke execute on function public.replace_product_images(uuid, text[]) from authenticated;

-- Журнал прогонов — последней строкой (docs/RULES.md → «Миграции»).
insert into ops.applied_migrations (version)
values ('20260913120000_map_write_gateway')
on conflict (version) do nothing;

notify pgrst, 'reload schema';
