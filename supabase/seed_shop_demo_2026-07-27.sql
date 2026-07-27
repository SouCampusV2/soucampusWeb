-- ============================================================
-- 10 ДЕМО-товаров магазина + галереи к ним (2026-07-27).
--
-- ⚠️ ЭТО ВИТРИНА-ЗАГЛУШКА, а не настоящий товар:
--   - file_path = NULL — скачивать нечего. Покупка такой карты
--     пройдёт оплату и покажет в профиле «файл ещё не загружен».
--     Пока Stripe в ТЕСТОВОМ режиме (реально проходит только карта
--     4242…), это безопасно; ПЕРЕД включением live-платежей их надо
--     либо снабдить файлами, либо снять с публикации.
--   - обложки переиспользуют картинки портфолио из public/portfolio —
--     отдельных рендеров под магазин ещё нет.
--
-- Порядок прогона (правило docs/RULES.md): СНАЧАЛА preview, ПОТОМ прод.
-- ⚠️ Перед этим файлом обязательно прогнать миграцию
-- 20260727120000_product_images.sql: без неё нет таблицы галерей и не
-- разрешена цена 0 (две бесплатные карты ниже не вставятся).
--
-- Идемпотентно: on conflict (slug) обновляет, галерея пересобирается
-- заново — повторный прогон безопасен.
-- ============================================================

insert into public.products
  (slug, title, summary, description, image_url,
   price_cents, price_currency, price_label, file_path, is_published, sort_order)
values
  ('emberfall-manor-pack', 'Emberfall Manor',
   'A weathered stone manor with a walled garden and lantern-lit courtyard.',
   'A compact medieval manor built to drop straight into a survival or roleplay world: weathered stone walls, steep slate roofs, a walled herb garden and a lantern-lit courtyard. Interiors are furnished, the roofline is detailed enough to hold up close, and the footprint stays small enough to fit an existing village.',
   '/portfolio/emberfall-manor.png',
   1500, 'EUR', '€15', null, true, 101),

  ('skyhold-sanctuary-pack', 'Skyhold Sanctuary',
   'A floating temple of pale stone and hanging gardens.',
   'A floating sanctuary for hub worlds and spawn areas: pale carved stone, arched galleries and hanging gardens spilling over the island edge. Built with a clear central platform so you can place portals, NPCs or a scoreboard without reworking the build.',
   '/portfolio/skyhold-sanctuary.png',
   2500, 'EUR', '€25', null, true, 102),

  ('prismport-hub', 'Prismport Hub',
   'A bright harbour hub with piers, market stalls and a lighthouse.',
   'A colourful harbour town shaped as a server hub: a wide central plaza ringed by market stalls, four piers leading to separate minigame portals, and a lighthouse that reads as a landmark from spawn. Warm palette, readable silhouettes, no oversized detailing that would eat frames on a full lobby.',
   '/portfolio/prismport.png',
   3000, 'EUR', '€30', null, true, 103),

  ('amethyst-grove-biome', 'Amethyst Grove',
   'A terraformed crystal grove — terrain only, ready to build on.',
   'A hand-terraformed grove of amethyst spires rising out of soft mossy hills, with a stream cutting through the middle and a natural clearing left open for your own build. Pure terrain: no structures, no interiors — a landscape you finish yourself.',
   '/portfolio/amethyst-grove.png',
   1800, 'EUR', '€18', null, true, 104),

  ('dragon-shrine-ruin', 'Dragon Shrine',
   'A half-collapsed mountain shrine guarding a dragon statue.',
   'A ruined shrine cut into a mountainside: broken columns, a cracked stairway and a weathered dragon statue at the summit. Built as a landmark or boss arena — the central platform is flat and open, and the ruin reads well from a distance as well as up close.',
   '/portfolio/dragon-shrine.png',
   2200, 'EUR', '€22', null, true, 105),

  ('mistgrove-fairground', 'Mistgrove Fairground',
   'A fantasy fairground with tents, rides and a lantern-lit midway.',
   'A travelling fairground for event servers: striped tents, a carousel, a small ferris wheel and a midway strung with lanterns. Everything sits on a flat plot so it can be pasted onto an existing world without terraforming, and the stalls are spaced for player traffic.',
   '/portfolio/mistgrove-fairground.png',
   2800, 'EUR', '€28', null, true, 106),

  ('porto-fiorenza-town', 'Porto Fiorenza',
   'A mediterranean coastal town of terracotta roofs and stepped streets.',
   'A sun-bleached coastal town: terracotta roofs, stepped alleys, balconies with washing lines and a small marina at the foot of the hill. Built as a complete settlement — town square, docks, and a dozen furnished houses — for survival or roleplay worlds.',
   '/portfolio/porto-fiorenza.jpg',
   4000, 'EUR', '€40', null, true, 107),

  ('voidframe-enclave', 'Voidframe Enclave',
   'A dark sci-fi outpost of black metal and cold light.',
   'A compact sci-fi outpost: black panelled frames, exposed structure and cold cyan lighting, built as a hub or faction base. Modular by design — the corridors repeat cleanly, so the enclave can be extended in either direction without breaking the look.',
   '/portfolio/voidframe-enclave.jpg',
   2600, 'EUR', '€26', null, true, 108),

  ('frostwick-holiday-props', 'Frostwick Holiday Props',
   'A free winter prop set — trees, stalls, sleighs and lights.',
   'A free set of winter props to dress an existing world for the season: decorated trees, market stalls, a sleigh, gift piles and strings of lights. Each prop is a separate small schematic, so you can scatter them rather than paste one big block.',
   '/portfolio/frostwick-holiday.png',
   0, 'EUR', 'Free', null, true, 109),

  ('pixelmone-starter-assets', 'Pixelmone Starter Assets',
   'A free starter pack of small builds — huts, bridges, wells.',
   'A free starter pack for anyone learning to build: a handful of small, readable structures — huts, a wooden bridge, a well, a watchtower — kept deliberately simple so the block choices and proportions are easy to study and copy.',
   '/portfolio/Pixelmone.jpg',
   0, 'EUR', 'Free', null, true, 110)

on conflict (slug) do update set
  title          = excluded.title,
  summary        = excluded.summary,
  description    = excluded.description,
  image_url      = excluded.image_url,
  price_cents    = excluded.price_cents,
  price_currency = excluded.price_currency,
  price_label    = excluded.price_label,
  is_published   = excluded.is_published,
  sort_order     = excluded.sort_order;


-- ------------------------------------------------------------
-- Галереи. Обложка в product_images НЕ дублируется: код и так ставит
-- её первым кадром (rowToProduct), а дубли отфильтровывает.
--
-- Сначала чистим галереи именно этих товаров, потом вставляем заново —
-- так повторный прогон не размножает строки (у product_images нет
-- уникального ключа, на который можно было бы опереться в on conflict).
-- ------------------------------------------------------------
delete from public.product_images
where product_id in (
  select id from public.products where slug in (
    'emberfall-manor-pack', 'skyhold-sanctuary-pack', 'prismport-hub',
    'dragon-shrine-ruin', 'porto-fiorenza-town', 'voidframe-enclave',
    'sky-cathedral', 'ironholt-keep', 'medieval-keep', 'sky-village'
  )
);

insert into public.product_images (product_id, url, position)
select p.id, v.url, v.position
from (values
  ('emberfall-manor-pack',   '/portfolio/ironholt-2.png',         1),
  ('emberfall-manor-pack',   '/portfolio/ironholt-3.png',         2),
  ('skyhold-sanctuary-pack', '/portfolio/hollowpeak-hold-2.png',  1),
  ('skyhold-sanctuary-pack', '/portfolio/hollowpeak-hold-3.png',  2),
  ('skyhold-sanctuary-pack', '/portfolio/hollowpeak-hold-4.png',  3),
  ('prismport-hub',          '/portfolio/pirate-rpg.jpeg',        1),
  ('prismport-hub',          '/portfolio/pirate-rpg-2.jpeg',      2),
  ('dragon-shrine-ruin',     '/portfolio/dragon-cathedral.jpg',   1),
  ('dragon-shrine-ruin',     '/portfolio/sky-cathedral.png',      2),
  ('porto-fiorenza-town',    '/portfolio/pink-village.png',       1),
  ('porto-fiorenza-town',    '/portfolio/pinecliff-haven.png',    2),
  ('voidframe-enclave',      '/portfolio/nova-ringport.png',      1),
  ('voidframe-enclave',      '/portfolio/prismport.png',          2),

  -- Четыре УЖЕ существовавших товара магазина: без галереи на них
  -- нечем было проверить стрелки листания на карточках витрины.
  -- Картинки временные, из портфолио — заменить настоящими скринами
  -- этих карт, когда они будут отрендерены.
  ('sky-cathedral',          '/portfolio/dragon-cathedral.jpg',   1),
  ('sky-cathedral',          '/portfolio/solace-spires.png',      2),
  ('sky-cathedral',          '/portfolio/skyward-armada.jpg',     3),
  ('ironholt-keep',          '/portfolio/ironholt-2.png',         1),
  ('ironholt-keep',          '/portfolio/ironholt-3.png',         2),
  ('ironholt-keep',          '/portfolio/duskspire-quarter.png',  3),
  ('medieval-keep',          '/portfolio/hollowpeak-hold.png',    1),
  ('medieval-keep',          '/portfolio/hollowpeak-hold-2.png',  2),
  ('medieval-keep',          '/portfolio/hollowpeak-hold-3.png',  3),
  ('sky-village',            '/portfolio/driftstone-isles.png',   1),
  ('sky-village',            '/portfolio/arena-atoll.jpg',        2),
  ('sky-village',            '/portfolio/emberpeak-village.png',  3)
) as v(slug, url, position)
join public.products p on p.slug = v.slug;
