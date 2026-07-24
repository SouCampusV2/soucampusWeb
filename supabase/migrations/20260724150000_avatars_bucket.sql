-- ============================================================
-- avatars — публичный бакет Storage под аватары пользователей.
--
-- Отличие от product-files (приватный): аватар показывается всем на
-- профиле/у креатора, прятать его незачем — бакет public, файл отдаётся
-- по прямой ссылке без подписи. Приватность тут не нужна, а подписанные
-- ссылки только усложнили бы показ.
--
-- Раскладка файлов: <user_id>/avatar — папка = id пользователя. Политики
-- ниже разрешают писать/менять/удалять ТОЛЬКО в своей папке (первый
-- сегмент пути = auth.uid()). Так один пользователь не перезапишет
-- аватар другого.
--
-- Правило миграций: сначала preview, потом прод (docs/RULES.md).
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Чтение — публичное (бакет и так public, но политика нужна для доступа
-- через Storage API/листинг).
create policy "avatars public read"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Загрузка/замена/удаление — только залогиненным и только в своей папке.
-- storage.foldername(name)[1] — первый сегмент пути (наш <user_id>).
create policy "avatars insert own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "avatars update own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "avatars delete own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
