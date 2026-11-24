-- ============================================================
-- Два закрытия по аудиту безопасности. 2026-11-10, находки S-15 и S-16.
--
-- Обе части ТОЛЬКО УБИРАЮТ права, которыми сайт не пользуется.
--
-- ⚠️ СРОК: неважно, до деплоя или после — ни старый, ни новый код на
-- эти права не опирается (проверено поиском: `.list(` в коде вызывается
-- только служебным ключом, в /api/creator/cleanup-storage; orders,
-- order_items и moderation_log читает и пишет только служебный ключ).
-- Сначала preview, потом прод (docs/RULES.md → «Миграции»).
-- После прогона — глазами: аватар в навбаре, обложки на витрине,
-- галерея карты, /purchases. Картинки обязаны открываться как раньше.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Содержимое публичных бакетов нельзя ПЕРЕЧИСЛИТЬ (S-15).
--
-- У avatars и product-images стояли политики чтения на storage.objects.
-- Публичному бакету они не нужны: файл по прямой ссылке отдаётся и без
-- них — «публичный» и значит «ссылка открывается всем». Политика давала
-- другое: вызов «перечисли папку» анонимным ключом из бандла сайта. То
-- есть любой получал список всех, кто что-либо загружал, картинки карт
-- в очереди, отклонённых и спрятанных, и сырые загрузки с префиксом
-- pending- (до пересборки, с метаданными исходной фотографии).
--
-- Снимаем по СВОЙСТВУ, а не по имени (инвариант 9): любая политика
-- чтения на storage.objects, чьё условие упоминает один из наших
-- публичных бакетов. `drop policy if exists "имя"` промолчал бы, окажись
-- политика названа иначе (часть создавалась руками в дашборде).
--
-- product-files не трогаем: он приватный и политик у него нет вовсе.
-- ------------------------------------------------------------
do $$
declare
  p record;
begin
  for p in
    select policyname
      from pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and cmd = 'SELECT'
       and (
         qual like '%''avatars''%'
         or qual like '%''product-images''%'
         or qual like '%''portfolio-images''%'
       )
  loop
    raise notice 'Снимаю политику чтения Storage: %', p.policyname;
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 2. Заказы закрыты в два слоя, а не в один (S-16).
--
-- orders, order_items и moderation_log были закрыты только тем, что на
-- них нет ни одной политики RLS. Права самой таблицы у anon и
-- authenticated при этом оставались (Supabase выдаёт их по умолчанию) —
-- то есть одна политика, созданная по ошибке, открывала бы заказы с
-- почтами покупателей. У download_events и discord_* второй слой есть с
-- рождения; здесь он добавляется задним числом.
--
-- Обе строки revoke — намеренно (инвариант 5): права роли PUBLIC и права
-- ролей anon/authenticated выдаются и снимаются отдельно.
-- ------------------------------------------------------------
revoke all on public.orders         from public;
revoke all on public.orders         from anon, authenticated;
revoke all on public.order_items    from public;
revoke all on public.order_items    from anon, authenticated;
revoke all on public.moderation_log from public;
revoke all on public.moderation_log from anon, authenticated;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Проверка после прогона (только чтение, запустить отдельно):
--
--   -- 1. Политик на storage.objects не осталось. Ожидается 0 строк.
--   select policyname, cmd from pg_policies
--    where schemaname = 'storage' and tablename = 'objects';
--
--   -- 2. У вошедшего человека нет прав на заказы. Ожидается false, false.
--   select has_table_privilege('authenticated', 'public.orders', 'select'),
--          has_table_privilege('anon', 'public.order_items', 'select');
-- ------------------------------------------------------------

insert into ops.applied_migrations (version)
values ('20261110140000_audit_hardening')
on conflict (version) do nothing;
