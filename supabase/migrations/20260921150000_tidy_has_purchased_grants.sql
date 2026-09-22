-- Убрать у has_purchased права, которые никому не нужны.
-- 2026-09-21, по результатам зонда на проде.
--
-- ⚠️ ЭТО НЕ ДЫРА, и важно понимать, почему — иначе следующий читатель
-- решит, что закрывали пробоину. has_purchased(product_id) отвечает
-- только про ТОГО, КТО ЕЁ ПОЗВАЛ: человек берётся из JWT (auth.uid() и
-- auth.email()). У анонима они пусты, значит ответ всегда «нет». Чужие
-- покупки через неё не видны никак.
--
-- Но грант всё равно лишний, и вот чей он. Функция создана
-- 20260726140000 с `grant execute ... to authenticated`, а строчка
-- `=X/postgres` (PUBLIC) и `anon=X/postgres` в её acl никем не
-- выдавались — они появились САМИ при создании. Тот же дефолт, который
-- 21.09 оставил открытой soft_delete_comment и который в этом проекте
-- ловили на consume_rate_limit 23.08.
--
-- Кто зовёт её по-настоящему (проверено, а не предположено):
--   - AddToCartButton.tsx:87 и CommentSection.tsx:79 — обе ТОЛЬКО при
--     живой сессии, то есть от роли authenticated;
--   - политики "insert own comment if bought" и "insert own rating if
--     bought" звали её из выражения политики — обе СНЯТЫ 21.09.
-- То есть anon её не зовёт ниоткуда.
--
-- ⚠️ Почему authenticated ОСТАЁТСЯ. Её зовёт сам клиент, чтобы показать
-- «уже куплено» на странице карты — и это честное чтение о себе, а не
-- запись. Путь A остаётся штатным (ARCHITECTURE.md § 5.4, шаг 4:
-- «чтения не переносятся, никогда»).
--
-- Порядок прогона: любой. Миграция снимает право, которым никто не
-- пользуется, — от деплоя она не зависит.

revoke all on function public.has_purchased(uuid) from public;
revoke all on function public.has_purchased(uuid) from anon;

grant execute on function public.has_purchased(uuid) to authenticated;
grant execute on function public.has_purchased(uuid) to service_role;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Журнал прогонов — последней строкой (docs/RULES.md → «Миграции»).
-- ------------------------------------------------------------
insert into ops.applied_migrations (version)
values ('20260921150000_tidy_has_purchased_grants')
on conflict (version) do nothing;
