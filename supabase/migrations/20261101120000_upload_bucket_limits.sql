-- ============================================================
-- Потолки на самих бакетах и запрет ссылаться на непроверенный файл (2026-11-01).
--
-- Порядок: только добавляет запреты, новому и старому коду не мешает, можно
-- до деплоя. Сначала preview, потом прод.
--
-- 1. Подписанный токен загрузки не фиксирует ни размер, ни тип: их называет
--    браузер. confirm сверяет это потом, но confirm можно не вызывать, а
--    product-images и avatars ПУБЛИЧНЫЕ: загруженный «text/html» открылся бы
--    по прямой ссылке как страница ещё до всякой проверки. Запрет здесь
--    исполняет сам Storage, в момент записи.
--    У portfolio-images он уже стоит (20261025140000).
--
-- 2. Адрес аватара и баннера браузер пишет в profiles сам (20260915120000),
--    и проверка смотрит только на свою папку. Значит, сюда годился бы и
--    pending-объект, минуя перекодирование в confirm.
-- ============================================================

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/gif', 'image/webp']
where id in ('product-images', 'avatars');

-- У файлов карт типы разные (браузер шлёт zip или octet-stream), поэтому
-- только размер. Бакет приватный, напрямую его не открыть.
update storage.buckets
set file_size_limit = 15728640
where id = 'product-files';

alter table public.profiles drop constraint if exists profiles_avatar_url_not_pending;
alter table public.profiles
  add constraint profiles_avatar_url_not_pending
  check (avatar_url is null or avatar_url !~ '/pending-');

alter table public.profiles drop constraint if exists profiles_banner_url_not_pending;
alter table public.profiles
  add constraint profiles_banner_url_not_pending
  check (banner_url is null or banner_url !~ '/pending-');

notify pgrst, 'reload schema';

-- Проверка, ждём три строки с заполненным лимитом:
-- select id, file_size_limit, allowed_mime_types from storage.buckets
-- where id in ('product-images', 'avatars', 'product-files');

insert into ops.applied_migrations (version) values ('20261101120000_upload_bucket_limits')
on conflict do nothing;
