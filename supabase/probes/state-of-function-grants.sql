-- Второй зонд для прода: кто может ЗВАТЬ функции.
-- 2026-09-21.
--
-- ⚠️ ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. Зонд про политики (state-of-write-policies)
-- показывает пустоту и выглядит успокаивающе — но функции он не видит
-- ВООБЩЕ. А ровно там 21.09 и осталась открытая дверь: политики снялись,
-- а soft_delete_comment продолжала зваться из браузера, потому что
-- `revoke ... from authenticated` не снимает грант, выданный роли PUBLIC
-- по умолчанию.
--
-- То есть «политик на запись ноль» — это ПОЛОВИНА ответа. Вторая
-- половина здесь.
--
-- КАК ЧИТАТЬ acl:
--   service_role=X/postgres   → звать может только сервер. Так и надо.
--   authenticated=X/postgres  → зовёт любой вошедший из консоли браузера.
--   =X/postgres               → ⚠️ ГРАНТ РОЛИ PUBLIC (имя слева пустое).
--                               Это «звать может кто угодно», включая
--                               анонима. Выдаётся САМ при создании
--                               функции, снимается только явным
--                               `revoke ... from public`.
--   (пусто / null)            → прав никому, кроме владельца.
--
-- Что ожидается на закрытой базе:
--   soft_delete_comment        — только service_role
--   soft_delete_comment_for    — только service_role
--   has_purchased_for          — только service_role
--   consume_rate_limit         — только service_role
--   replace_product_images     — только service_role
--   has_purchased              — authenticated ЗДЕСЬ НОРМА: её зовут
--                                политики чтения и сам клиент («уже
--                                куплено» на странице карты).

select
  p.proname as function,
  coalesce(array_to_string(p.proacl, '  |  '), '(нет явных прав)') as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'soft_delete_comment',
    'soft_delete_comment_for',
    'has_purchased',
    'has_purchased_for',
    'consume_rate_limit',
    'replace_product_images'
  )
order by p.proname;
