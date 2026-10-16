-- Новая работа портфолио (2026-10-16): Redspire Commons.
-- Прогнать вручную в Supabase SQL Editor: СНАЧАЛА preview, ПОТОМ прод
-- (docs/RULES.md). Только данные, схема не трогается. Картинка лежит в
-- public/portfolio/, поэтому порядок такой: деплой кода → этот файл.
-- Прогонишь раньше — карточка появится с битой картинкой до деплоя.
--
-- Заказ, 150×150, за неделю. Цену владелец не раскрывает: price_amount
-- пустой, а страница работы для тега «Order» без суммы пишет «Private»
-- вместо «not a paid commission» (правка в portfolio/[slug]/page.tsx).
-- В карусели /portfolio (is_featured = true) — последней панелью: порядок
-- там по sort_order, а здесь берётся максимум + 1. Лимит панелей поднят
-- до шести (PORTFOLIO_HERO_SIZE), иначе шестую срезал бы slice.
-- Перезапускаемо: on conflict (slug) обновляет.

insert into public.projects
  (slug, title, tag, summary, description, image_url,
   price_label, price_amount, size_label, size_x, size_z,
   deadline_label, deadline_days, is_featured, sort_order)
values
  ('redspire-commons', 'Redspire Commons', 'Order',
   'A forest village square beneath a red-spired town hall, with market stalls, a golden wheat field and three coloured plinths.',
   'A lively village hub tucked into a lush forest and sandstone cliffs: a tall timber-and-stone town hall crowned with a red spire looks over a cobbled square, a red-roofed workshop with its own forge, striped market stalls and a golden wheat field. Three coloured plinths in the middle of the square make it a natural gathering point for players. Commissioned build, made in one week.',
   '/portfolio/redspire-commons.webp',
   'Private', NULL, '150×150', 150, 150, '1 week', 7, true,
   (select coalesce(max(sort_order), 0) + 1 from public.projects))

on conflict (slug) do update set
  title = excluded.title, tag = excluded.tag, summary = excluded.summary,
  description = excluded.description, image_url = excluded.image_url,
  price_label = excluded.price_label, price_amount = excluded.price_amount,
  size_label = excluded.size_label, size_x = excluded.size_x, size_z = excluded.size_z,
  deadline_label = excluded.deadline_label, deadline_days = excluded.deadline_days,
  is_featured = excluded.is_featured;
