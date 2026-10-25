-- ============================================================
-- Портфолио правится из админки + «бесплатно» у ссылки — 2026-10-25.
--
-- Две просьбы владельца одного вечера:
--   1. Ссылка на BuiltByBit бывает и на бесплатный премейд (Redspire
--      Commons): кнопка «Buy» там врёт. Отсюда флаг listing_is_free.
--   2. Работы в портфолио добавлять из админки, как карты, а не через
--      Table Editor и папку public/. Отсюда бакет portfolio-images.
--
-- ⚠️ ИДЁТ ДО ДЕПЛОЯ: колонку listing_is_free код запрашивает сразу, а
-- getAllProjects на незнакомую колонку ПАДАЕТ намеренно (src/lib/
-- projects.ts) — задеплоишь раньше, и портфолио не соберётся.
-- Сначала preview, потом прод. Файл перезапускаемый.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Вид ссылки: купить или скачать бесплатно.
--
-- Флаг, а не свободная подпись кнопки: вариантов два, и текст у каждого
-- должен быть одинаковым по всему сайту. Подпись в данных разъехалась бы
-- с первой же новой работой.
-- ------------------------------------------------------------
alter table public.projects
  add column if not exists listing_is_free boolean not null default false;

-- Описание обещало «any player can now buy it» — кнопка и текст под ней
-- должны говорить одно и то же. replace(), а не новый текст целиком:
-- остальное описание не трогаем, и повторный прогон ничего не меняет.
update public.projects
  set listing_is_free = true,
      description = replace(
        description,
        'where any player can now buy it',
        'where any player can now download it for free'
      )
  where slug = 'redspire-commons';

-- ------------------------------------------------------------
-- 2. Бакет фото портфолио.
--
-- Свой, а не product-images: уборка Storage (/api/creator/cleanup-storage)
-- удаляет из product-images всё, на что не ссылается ни одна КАРТА. Фото
-- работы туда легли бы и через час исчезли.
--
-- Публичный: фото работ видит каждый посетитель, как и раньше из public/.
-- Политик на запись НЕТ и не будет — пишет только шлюз служебным ключом
-- по одноразовому токену (/api/creator/image, kind "portfolio"), и только
-- у админа. Без политики браузер сюда не пишет ничего — это и есть запрет.
--
-- Лимиты бакета — второй рубеж к проверке в шлюзе (10 МБ, картинки).
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-images',
  'portfolio-images',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';

-- Проверка, ждём redspire-commons = true и одну строку бакета:
-- select slug, listing_is_free from public.projects where listing_url is not null;
-- select id, public from storage.buckets where id = 'portfolio-images';

-- ------------------------------------------------------------
-- Журнал прогонов — последней строкой (docs/RULES.md → «Миграции»).
-- ------------------------------------------------------------
insert into ops.applied_migrations (version)
values ('20261025140000_portfolio_admin')
on conflict (version) do nothing;
