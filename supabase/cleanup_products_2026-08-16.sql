-- ============================================================
-- Чистый лист по картам: снести всё и засеять заново.
-- РАЗОВЫЙ скрипт, НЕ миграция.
--
-- Лежит рядом с migrations/, а не внутри, намеренно: миграции
-- проигрываются на каждой базе и описывают СХЕМУ. Удаление данных не
-- должно однажды повториться само на базе, где карты уже настоящие.
-- Запускать руками в SQL-редакторе Supabase, по одной базе: сначала
-- preview, потом прод (docs/RULES.md).
--
-- Разрешено владельцем 2026-08-16: клиентов и реальных платежей нет,
-- данные можно переписывать свободно.
--
-- ЧТО ДЕЛАЕТ:
--   1) сносит карты и всё, что на них ссылается в базе;
--   2) засевает 10 карт заново — разные цены (включая две бесплатные),
--      все семь категорий, галереи у половины.
--
-- ФАЙЛЫ В STORAGE — ОТДЕЛЬНО, командой `npm run clear:storage`. Причина
-- не в удобстве: Supabase запрещает удалять из storage.objects прямым
-- SQL (см. секцию 1). Порядок между ними любой.
--
-- ЧТО НЕ ТРОГАЕТ: аккаунты (auth.users), профили, статусы креаторов и
-- заявки на них, уведомления, аватары, портфолио, отзывы, статистику
-- посещений. Просьба владельца — аккаунты не трогать «для удобства»,
-- чтобы не заводить вход заново.
--
-- ⚠️ У КАРТ НЕТ ФАЙЛОВ (file_path = null). Это сознательно и сейчас
-- безопасно: Stripe в тестовом режиме, покупателей нет. Файл в Storage
-- из SQL не положишь — он попадает туда только через форму загрузки.
-- ПЕРЕД включением живых платежей эти карты нужно либо снабдить
-- файлами через /creator/upload, либо снести этим же скриптом (секция 1)
-- и не запускать секцию 2.
--
-- ⚠️ Скрипт идемпотентен: секция 1 чистит всё, поэтому повторный прогон
-- даёт ровно те же 10 карт, а не двадцать.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Проверка: кому принадлежат карты.
--
-- Автор ищется ПО НИКУ, а не по uuid: id одного и того же человека на
-- preview и на проде разные, и скрипт с зашитым uuid работает ровно на
-- одной базе из двух (на этом уже обжигались при бэкфилле креаторов).
--
-- Если ника нет — падаем сразу и с внятным текстом, а не вставляем
-- десять карт без автора, у которых на витрине вместо имени «—», а
-- ссылка на профиль ведёт в никуда.
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from public.profiles where lower(display_name) = 'soucampus'
  ) then
    raise exception
      'Профиль с ником SouCampus не найден. Впишите в этот скрипт свой ник (три места: здесь и два подзапроса ниже).';
  end if;
end $$;

begin;

-- ------------------------------------------------------------
-- 1. Снос.
--
-- ПОРЯДОК ВАЖЕН: order_items ссылается на products с `on delete
-- restrict` — база НЕ даст удалить карту, которую хоть раз купили, пока
-- жива строка заказа. Это правильное поведение (иначе покупка теряет
-- предмет), и обходить его нельзя — только удалять сверху вниз.
-- ------------------------------------------------------------
delete from public.order_items;
delete from public.orders;

-- Дальше — то, что висит на картах. Уйдёт и каскадом, но перечислено
-- явно: пусть из скрипта будет видно, что именно исчезает.
delete from public.product_ratings;
delete from public.moderation_log;
delete from public.product_images;
delete from public.products;

-- ⚠️ ФАЙЛЫ В STORAGE ЭТОТ СКРИПТ НЕ ТРОГАЕТ — и не может.
--
-- Здесь стояло `delete from storage.objects`, и Supabase его отбил:
--
--   ERROR 42501: Direct deletion from storage tables is not allowed.
--   Use the Storage API instead.
--
-- Запрет их собственный (триггер storage.protect_delete) и правильный:
-- строка в storage.objects — это только УЧЁТНАЯ ЗАПИСЬ о файле, а сам
-- файл лежит в объектном хранилище. Удалив строку, мы бы получили ровно
-- то, от чего запрет и защищает: файл, за который платим, но которого
-- больше нет ни в одном списке — то есть удалить его потом уже нечем.
--
-- Файлы убираются отдельно, любым из двух способов:
--   • npm run clear:storage — скрипт scripts/clear-product-storage.mjs,
--     служебным ключом, через Storage API (см. его шапку);
--   • руками: Dashboard → Storage → бакет → выделить всё → Delete.
--
-- Бакет `avatars` не трогать ни тем, ни другим: аватары принадлежат
-- аккаунтам, а их владелец просил оставить.

-- ------------------------------------------------------------
-- 2. Десять карт заново.
--
-- Про колонки состояния (миграции 20260815130000 и 20260816120000):
--   state          = 'live'  — сразу на витрине, мимо очереди. Так можно
--                              ТОЛЬКО отсюда: guard_product_insert
--                              переписывает состояние на 'pending' у
--                              обычных пользователей, но пропускает
--                              служебную роль, под которой работает
--                              SQL-редактор.
--   creator_active            — копия is_creator автора. Ставим из
--                              профиля, а не 'true' наугад: если статус
--                              креатора у владельца закрыт, карты и
--                              должны быть невидимы — витрина считает
--                              видимость как state='live' И creator_active.
--   was_approved   = true    — карта уже была на витрине. От этого
--                              зависит, куда её вернёт «Restore» после
--                              удаления: одобренную в hidden, а не в очередь.
--
-- Категории — все семь непустых. «free» категорией НЕ ставим: бесплатность
-- на витрине определяется ценой 0 (см. filterByCategory), иначе платная
-- карта могла бы оказаться под тегом Free.
--
-- Обложки переиспользуют картинки портфолио из public/portfolio —
-- отдельных рендеров под магазин пока нет.
-- ------------------------------------------------------------
insert into public.products
  (slug, title, summary, description, image_url,
   price_cents, price_currency, price_label, category, file_path,
   state, creator_active, was_approved, submission_kind,
   creator_id, sort_order)
select
  v.slug, v.title, v.summary, v.description, v.image_url,
  v.price_cents, 'EUR', v.price_label, v.category, null::text,
  'live', coalesce(pr.is_creator, false), true, 'first',
  pr.id, v.sort_order
from (values
  ('emberfall-manor', 'Emberfall Manor',
   'A weathered stone manor with a walled garden and lantern-lit courtyard.',
   'A compact medieval manor built to drop straight into a survival or roleplay world: weathered stone walls, steep slate roofs, a walled herb garden and a lantern-lit courtyard. Interiors are furnished, the roofline holds up close, and the footprint stays small enough to fit an existing village.',
   '/portfolio/emberfall-manor.png', 1500, '€15', 'building', 101),

  ('skyhold-sanctuary', 'Skyhold Sanctuary',
   'A floating temple of pale stone and hanging gardens.',
   'A floating sanctuary for hub worlds and spawn areas: pale carved stone, arched galleries and hanging gardens spilling over the island edge. Built around a clear central platform, so portals, NPCs or a scoreboard drop in without reworking the build.',
   '/portfolio/skyhold-sanctuary.png', 2500, '€25', 'spawn', 102),

  ('prismport-hub', 'Prismport Hub',
   'A bright harbour hub with piers, market stalls and a lighthouse.',
   'A colourful harbour town shaped as a server hub: a wide central plaza ringed by market stalls, four piers leading to separate minigame portals, and a lighthouse that reads as a landmark from spawn. Warm palette, readable silhouettes, no oversized detailing that would eat frames on a full lobby.',
   '/portfolio/prismport.png', 3000, '€30', 'spawn', 103),

  ('amethyst-grove', 'Amethyst Grove',
   'A terraformed crystal grove — terrain only, ready to build on.',
   'A hand-terraformed grove of amethyst spires rising out of soft mossy hills, with a stream cutting through the middle and a natural clearing left open for your own build. Pure terrain: no structures, no interiors — a landscape you finish yourself.',
   '/portfolio/amethyst-grove.png', 1800, '€18', 'landscape', 104),

  ('dragon-shrine', 'Dragon Shrine',
   'A half-collapsed mountain shrine guarding a dragon statue.',
   'A ruined shrine cut into a mountainside: broken columns, a cracked stairway and a weathered dragon statue at the summit. Built as a landmark or boss arena — the central platform is flat and open, and the ruin reads well from a distance as well as up close.',
   '/portfolio/dragon-shrine.png', 2200, '€22', 'adventure', 105),

  ('arena-atoll', 'Arena Atoll',
   'A four-team PvP arena on a ring-shaped island.',
   'A symmetrical PvP arena built on a ring of tropical rock: four team spawns at equal distance, a raised centre platform for the objective, and sight lines kept deliberately open so fights read from the stands. Comes with a spectator gallery above the water line.',
   '/portfolio/arena-atoll.jpg', 2400, '€24', 'minigame', 106),

  ('porto-fiorenza', 'Porto Fiorenza',
   'A mediterranean coastal town of terracotta roofs and stepped streets.',
   'A sun-bleached coastal town: terracotta roofs, stepped alleys, balconies with washing lines and a small marina at the foot of the hill. A complete settlement — town square, docks and a dozen furnished houses — for survival or roleplay worlds.',
   '/portfolio/porto-fiorenza.jpg', 4000, '€40', 'building', 107),

  ('duskspire-interiors', 'Duskspire Interiors',
   'Twelve furnished room sets — tavern, forge, library, bedrooms.',
   'A pack of finished interiors to fill buildings you have already placed: a tavern common room, a working forge, a library with a reading nook, four bedrooms and a handful of storage rooms. Each set is a separate schematic sized to a standard 9×9 footprint.',
   '/portfolio/duskspire-quarter.png', 1200, '€12', 'interior', 108),

  ('frostwick-holiday-props', 'Frostwick Holiday Props',
   'A free winter prop set — trees, stalls, sleighs and lights.',
   'A free set of winter props to dress an existing world for the season: decorated trees, market stalls, a sleigh, gift piles and strings of lights. Each prop is a separate small schematic, so you can scatter them rather than paste one big block.',
   '/portfolio/frostwick-holiday.png', 0, 'Free', 'assets', 109),

  ('pixelmone-starter-assets', 'Pixelmone Starter Assets',
   'A free starter pack of small builds — huts, bridges, wells.',
   'A free starter pack for anyone learning to build: a handful of small, readable structures — huts, a wooden bridge, a well, a watchtower — kept deliberately simple so the block choices and proportions are easy to study and copy.',
   '/portfolio/Pixelmone.jpg', 0, 'Free', 'assets', 110)
) as v(slug, title, summary, description, image_url,
       price_cents, price_label, category, sort_order)
cross join (
  select id, is_creator from public.profiles
  where lower(display_name) = 'soucampus'
  limit 1
) as pr;

-- ------------------------------------------------------------
-- 3. Галереи.
--
-- Обложка в product_images НЕ дублируется: код и так ставит её первым
-- кадром (rowToProduct), а дубли отфильтровывает. Галерея есть не у всех
-- — так на витрине видно и карточки со стрелками листания, и без них.
-- ------------------------------------------------------------
insert into public.product_images (product_id, url, position)
select p.id, v.url, v.position
from (values
  ('emberfall-manor',   '/portfolio/ironholt-2.png',        1),
  ('emberfall-manor',   '/portfolio/ironholt-3.png',        2),
  ('skyhold-sanctuary', '/portfolio/hollowpeak-hold-2.png', 1),
  ('skyhold-sanctuary', '/portfolio/hollowpeak-hold-3.png', 2),
  ('skyhold-sanctuary', '/portfolio/hollowpeak-hold-4.png', 3),
  ('prismport-hub',     '/portfolio/pirate-rpg.jpeg',       1),
  ('prismport-hub',     '/portfolio/pirate-rpg-2.jpeg',     2),
  ('dragon-shrine',     '/portfolio/dragon-cathedral.jpg',  1),
  ('dragon-shrine',     '/portfolio/sky-cathedral.png',     2),
  ('porto-fiorenza',    '/portfolio/pink-village.png',      1),
  ('porto-fiorenza',    '/portfolio/pinecliff-haven.png',   2),
  ('arena-atoll',       '/portfolio/driftstone-isles.png',  1),
  ('arena-atoll',       '/portfolio/corsair-isle.jpg',      2)
) as v(slug, url, position)
join public.products p on p.slug = v.slug;

commit;

-- ------------------------------------------------------------
-- Проверка глазами. Ожидаем: 10 карт, все live, 13 картинок галереи,
-- ноль заказов, и у карт есть автор.
-- ------------------------------------------------------------
select
  (select count(*) from public.products)                              as maps,
  (select count(*) from public.products where state = 'live')         as live,
  (select count(*) from public.products where creator_id is null)     as without_author,
  (select count(*) from public.products where not creator_active)     as hidden_by_creator_status,
  (select count(*) from public.product_images)                        as gallery_images,
  (select count(*) from public.orders)                                as orders;

-- Если hidden_by_creator_status = 10, карты на витрине не появятся: у
-- профиля закрыт статус креатора (profiles.is_creator = false). Это не
-- ошибка скрипта — витрина считает видимость как state='live' И
-- creator_active. Выдать статус можно через /admin/applications.

-- ------------------------------------------------------------
-- ПО ЖЕЛАНИЮ: разложить пару карт по другим состояниям, чтобы проверить
-- бейджи и фильтры каталога админки. Выполнять ОТДЕЛЬНО, после основного
-- скрипта — по умолчанию все десять карт живые.
--
-- update public.products set state = 'pending'   where slug = 'amethyst-grove';
-- update public.products set state = 'hidden'    where slug = 'duskspire-interiors';
-- update public.products set state = 'suspended',
--        suspension_reason = 'Screenshots do not match the map contents.'
--        where slug = 'arena-atoll';
-- update public.products set state = 'deleted', deleted_by = 'creator'
--        where slug = 'pixelmone-starter-assets';
-- ------------------------------------------------------------
