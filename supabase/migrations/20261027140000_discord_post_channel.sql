-- ============================================================
-- Канал у поста витрины — 2026-10-27 (вечер).
--
-- Владелец постит в три канала: Portfolio, Premade builds, Free builds,
-- у каждого свой вебхук (DISCORD_SHOWCASE/PREMADE/FREE_WEBHOOK_URL).
-- Пост помнит, куда ушёл: Update и Remove обязаны идти в вебхук ТОГО
-- канала — сообщение другого канала чужой вебхук не видит.
--
-- product_slug — пост о карте маркетплейса (премейд или бесплатная), а не
-- о работе портфолио. Не внешний ключ — по той же причине, что
-- project_slug: пост переживает переименование.
--
-- ⚠️ ИДЁТ ДО ДЕПЛОЯ (только добавляет). Сначала preview, потом прод.
-- Старые строки — посты портфолио, им достаётся значение по умолчанию.
-- Файл перезапускаемый.
-- ============================================================

alter table public.discord_posts
  add column if not exists channel text not null default 'portfolio',
  add column if not exists product_slug text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'discord_posts_channel_check') then
    alter table public.discord_posts
      add constraint discord_posts_channel_check
      check (channel in ('portfolio', 'premade', 'free'));
  end if;
end $$;

notify pgrst, 'reload schema';

insert into ops.applied_migrations (version) values ('20261027140000_discord_post_channel')
on conflict do nothing;
