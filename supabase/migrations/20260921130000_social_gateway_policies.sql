-- ============================================================
-- Шлюз записи, пути №5, №9–13: снятие последних разрешений на запись.
-- 2026-09-21.
--
-- ⚠️ ПРОГОНЯТЬ ТОЛЬКО ПОСЛЕ ДЕПЛОЯ КОДА, сначала preview, потом прод.
-- Этот файл УДАЛЯЕТ разрешения. Прогонишь до деплоя — старый код на
-- Vercel ещё пишет напрямую, а права уже нет: сломаются загрузка
-- картинок, аватар, комментарии, оценки, реакции и уведомления. Ровно
-- тот же порядок, что у 20260911120000 и 20260913120000.
--
-- Пара к 20260921120000_social_gateway_functions (та — ДО деплоя).
--
-- ------------------------------------------------------------
-- ЧТО ЭТИМ ЗАКАНЧИВАЕТСЯ
-- ------------------------------------------------------------
-- Это последние шесть путей записи из тринадцати (docs/ARCHITECTURE.md
-- § 5.4). После прогона из браузера в базу не пишется НИЧЕГО, кроме
-- шести колонок профиля (пути №7–8, оставлены на правах колонок
-- сознательно — «Шаг 2б») и форм Supabase Auth, которые так и задуманы.
--
-- ⚠️ ПЕРЕД СНЯТИЕМ КАЖДАЯ ПОЛИТИКА ПЕРЕЧИТАНА ЦЕЛИКОМ, и вот что в них
-- было написано — потому что снятая политика уносит ВСЁ, что говорила
-- (урок 13.09, когда вместе с политикой почти потеряли паузу после
-- тяжёлого отказа):
--
--   product-images insert own folder → своя ли папка. Теперь путь
--     строит сервер, и «своя папка» больше не факт, который надо
--     проверять: другой он назвать не может.
--   avatars insert/update/delete own → то же про бакет аватаров.
--   insert own comment if bought     → свой ли user_id И has_purchased().
--     Обе половины воспроизведены в /api/comments: вторая — через
--     has_purchased_for(), первая — тем, что user_id берётся из сессии,
--     а не из тела запроса.
--   update own comment               → правка своего комментария. В
--     интерфейсе её НЕ БЫЛО НИКОГДА (кнопки нет, шлюза нет): политика
--     разрешала то, чего никто не делает. Вернётся вместе с функцией,
--     если она появится, — уже в обработчике.
--   insert own rating if bought      → свой ли user_id И has_purchased().
--     Воспроизведено в /api/feedback.
--   update/delete own rating         → переоценка и снятие оценки.
--     Переоценка теперь идёт upsert'ом через шлюз; снятия оценки в
--     интерфейсе нет.
--   insert/delete own reaction       → свой ли user_id. Воспроизведено
--     в /api/feedback.
--   mark own notifications read      → своя ли строка. Воспроизведено
--     явным .eq("user_id", …) в /api/notifications — служебный ключ
--     политик не спрашивает, и забыть это условие значило бы отдать
--     чужой ящик.
--   delete own notifications         → то же.
--
-- ⚠️ ЧТО ПРИ ЭТОМ УШЛО ИЗ БАЗЫ НЕЗАМЕТНО. Триггеры лимитов
-- (20260822130000) первой строкой пропускают всё, что пришло не от роли
-- authenticated, — то есть шлюзу они ничего не считают. Комментарии и
-- реакции держатся теперь на ops.rate_events с ТЕМИ ЖЕ числами
-- (rate-limit.ts: 1 в 20 секунд, 10 в час, 30 реакций в час). Триггеры
-- НЕ удаляются: они остаются вторым рубежом, если запись однажды пойдёт
-- мимо шлюза. Но правила теперь в двух местах, и об этом надо знать.
--
-- ------------------------------------------------------------
-- ЗОНДЫ ПОСЛЕ ПРОГОНА (ждём нули)
-- ------------------------------------------------------------
--   select count(*) from pg_policies
--    where schemaname = 'storage' and tablename = 'objects'
--      and policyname in ('product-images insert own folder',
--                         'avatars insert own', 'avatars update own',
--                         'avatars delete own');
--   -- → 0
--
--   select count(*) from pg_policies
--    where tablename in ('product_comments','product_ratings',
--                        'product_reactions','notifications')
--      and cmd <> 'SELECT';
--   -- → 0
--
-- ⚠️ cmd <> 'SELECT' обязателен: политики на ЧТЕНИЕ здесь остаются и
-- снимать их не надо. Без этого условия зонд отвечает не нулём и
-- выдаёт правильное состояние за провал — на этом уже попались 15.09
-- с зондом `like 'creators%'`.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Storage: картинки карты и аватар.
-- ------------------------------------------------------------
drop policy if exists "product-images insert own folder" on storage.objects;
drop policy if exists "avatars insert own" on storage.objects;
drop policy if exists "avatars update own" on storage.objects;
drop policy if exists "avatars delete own" on storage.objects;

-- Чтение остаётся публичным: бакеты public, картинки показываются всем.
-- Загрузку теперь разрешает одноразовый токен, который выдал сервер
-- (createSignedUploadUrl), — тот же механизм, что у файла карты с 11.09.

-- ------------------------------------------------------------
-- 2. Комментарии.
-- ------------------------------------------------------------
drop policy if exists "insert own comment if bought" on public.product_comments;
drop policy if exists "update own comment" on public.product_comments;

-- Старую функцию из браузера больше не звать. Сама она жива — её
-- по-прежнему может позвать код, работающий от лица человека; но путь
-- закрыт, а значит закрыт и он.
revoke execute on function public.soft_delete_comment(uuid) from authenticated;

-- ------------------------------------------------------------
-- 3. Оценки.
-- ------------------------------------------------------------
drop policy if exists "insert own rating if bought" on public.product_ratings;
drop policy if exists "update own rating" on public.product_ratings;
drop policy if exists "delete own rating" on public.product_ratings;

-- ------------------------------------------------------------
-- 4. Реакции.
-- ------------------------------------------------------------
drop policy if exists "insert own reaction" on public.product_reactions;
drop policy if exists "delete own reaction" on public.product_reactions;

-- ------------------------------------------------------------
-- 5. Свои уведомления.
-- ------------------------------------------------------------
drop policy if exists "mark own notifications read" on public.notifications;
drop policy if exists "delete own notifications" on public.notifications;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Журнал прогонов — последней строкой (docs/RULES.md → «Миграции»).
-- ------------------------------------------------------------
insert into ops.applied_migrations (version)
values ('20260921130000_social_gateway_policies')
on conflict (version) do nothing;
