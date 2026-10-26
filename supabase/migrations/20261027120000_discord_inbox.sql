-- ============================================================
-- Входящие из Discord-бота BoCampus — фаза 4 бота, 2026-10-27.
--
-- Бот присылает (с согласия клиента) две вещи: черновик работы для
-- портфолио и отзыв. Ни то ни другое не публикуется само: строка ложится
-- сюда со статусом pending, владелец решает в /admin/discord.
--
-- Почему отдельная таблица, а не черновик прямо в projects/reviews: у них
-- нет состояния «не опубликовано» — всё, что лежит в projects, видно на
-- сайте. Добавлять туда флаг ради одного источника значит трогать каждое
-- чтение витрины. Очередь снаружи не трогает ничего.
--
-- ⚠️ ИДЁТ ДО ДЕПЛОЯ: /api/discord/bridge пишет сюда сразу.
-- Сначала preview, потом прод. Файл перезапускаемый.
-- ============================================================

create table if not exists public.discord_inbox (
  -- Ключ идемпотентности от бота: 'portfolio:<ticketId>' / 'review:<ticketId>'.
  -- Повтор той же отправки (бот ретраит) — on conflict do nothing.
  key          text primary key,
  kind         text not null check (kind in ('portfolio_draft', 'review')),
  payload      jsonb not null,
  -- Фото, уже скопированные в portfolio-images (ссылки Discord живут ~сутки).
  image_urls   text[] not null default '{}',
  status       text not null default 'pending'
               check (status in ('pending', 'published', 'dismissed')),
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  decided_by   uuid references public.profiles(id)
);

create index if not exists discord_inbox_pending_idx
  on public.discord_inbox (created_at desc) where status = 'pending';

-- Пишет и читает только служебный ключ (обработчик и админка). RLS без
-- политик = браузеру нельзя ничего — это и есть запрет.
alter table public.discord_inbox enable row level security;
revoke all on public.discord_inbox from public;
revoke all on public.discord_inbox from anon, authenticated;

-- Новый вид уведомления админу: «пришло из Discord».
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in (
    'creator_application_submitted',
    'creator_approved',
    'creator_rejected',
    'creator_revoked',
    'map_approved',
    'map_rejected',
    'map_suspended',
    'map_deleted',
    'map_sold',
    'purchase',
    'announcement',
    'discord_inbox'
  ));

notify pgrst, 'reload schema';

insert into ops.applied_migrations (version) values ('20261027120000_discord_inbox')
on conflict do nothing;
