-- ============================================================
-- Посты витрины в Discord — 2026-10-27.
--
-- Владелец собирает пост о работе портфолио в /admin/discord: черновик,
-- превью, публикация через вебхук канала витрины (src/lib/discord-showcase.ts).
-- Здесь — сами посты: черновики и опубликованные (с id сообщения в
-- Discord, чтобы править и удалять опубликованное на месте).
--
-- ⚠️ ИДЁТ ДО ДЕПЛОЯ. Сначала preview, потом прод. Файл перезапускаемый.
-- ============================================================

create table if not exists public.discord_posts (
  id            uuid primary key default gen_random_uuid(),
  -- Работа, о которой пост. Не внешний ключ: пост может пережить
  -- переименование slug или быть вообще не о работе (анонс).
  project_slug  text,
  -- Весь пост целиком (ShowcasePost): форма ↔ превью ↔ вебхук читают одно и
  -- то же. Колонка на каждое поле = миграция на каждую новую настройку.
  post          jsonb not null,
  status        text not null default 'draft'
                check (status in ('draft', 'published')),
  message_id    text,                 -- id сообщения в Discord после публикации
  published_at  timestamptz,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Опубликован = знаем id сообщения. Иначе «Update» и «Remove» некуда слать.
  constraint discord_posts_published_has_message
    check (status = 'draft' or message_id is not null)
);

create index if not exists discord_posts_recent_idx on public.discord_posts (updated_at desc);

-- Только служебный ключ: админка пишет через /api/admin/discord/showcase.
alter table public.discord_posts enable row level security;
revoke all on public.discord_posts from public;
revoke all on public.discord_posts from anon, authenticated;

notify pgrst, 'reload schema';

insert into ops.applied_migrations (version) values ('20261027130000_discord_posts')
on conflict do nothing;
