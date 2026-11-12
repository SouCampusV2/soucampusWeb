-- 18 работ под Box SMP — ЧЕРНОВИКАМИ (2026-11-12).
--
-- Один заказчик, один режим (Box SMP), каждая — за неделю, €150. Сайт их
-- НЕ показывает: is_published = false. Владелец выкладывает по одной
-- кнопкой Publish в /admin/portfolio — в тот же день, что и пост в
-- Discord; опубликованная встаёт первой в списке.
--
-- Порядок прогона:
--   1. миграция 20261112140000_project_drafts (колонка is_published);
--   2. деплой кода (картинки лежат в public/portfolio/);
--   3. этот файл. Сначала preview, потом прод.
-- До миграции файл упадёт на незнакомой колонке — это и есть защита от
-- того, чтобы 18 работ не вышли на сайт разом.
--
-- sort_order: 1000 + номер рендера (sou_map1…18) — в самый конец. На
-- сайте это место ничего не значит: Publish ставит работу первой.
--
-- Перезапускаемо: при совпадении slug обновляются тексты, цена и размер,
-- но НЕ is_published и НЕ sort_order — повторный прогон не снимет с сайта
-- то, что уже опубликовано, и не сдвинет его.

insert into public.projects
  (slug, title, tag, summary, description, image_url,
   price_label, price_amount, size_label, size_x, size_z,
   deadline_label, deadline_days, is_featured, is_published, sort_order)
select slug, title, tag, summary, description, image_url,
       price_label, price_amount, size_label, size_x, size_z,
       deadline_label, deadline_days, is_featured, is_published, 1000 + n
from (values
  -- 1
  ('firepeak-cove', 'Firepeak Cove', 'Order',
   'A pirate camp hiding at the foot of a live volcano.',
   'Only pirates would set up camp next to a volcano that''s still smoking. Two teal-roofed halls, a striped trading stand and winding dirt paths sit under the trees, with lava running down the peak right behind them. Built in one week for a Box SMP server.',
   '/portfolio/firepeak-cove.webp',
   '€150', 150, '150×150', 150, 150, '1 week', 7, false, false, 1),
  -- 2
  ('crows-nest-isle', 'Crow''s Nest Isle', 'Order',
   'Two pirate islands linked by a rope bridge, watched over by a lookout mast.',
   'The lookout up in the crow''s nest sees everything: the rope bridge between the two islands, the captain''s beach hut with its own deck, and every ship that comes near. Mossy cliffs and tall palms make it easy to hide in. Built in one week for a Box SMP server.',
   '/portfolio/crows-nest-isle.webp',
   '€150', 150, '150×150', 150, 150, '1 week', 7, false, false, 2),
  -- 3
  ('palmcloud-isle', 'Palmcloud Isle', 'Order',
   'A palm island floating in the clouds, with a piñata party spot on the shore.',
   'A classic island to start from: tall palms, big round leafy trees, a small waterfall in the back and a sandy beach running around the edge, all wrapped in soft clouds. Down by the sand there''s a bright piñata party pad, a special spot where the server runs its events. Built in one week for a Box SMP server.',
   '/portfolio/palmcloud-isle.webp',
   '€150', 150, '150×150', 150, 150, '1 week', 7, false, false, 3),
  -- 4
  ('skullroot-hideout', 'Skullroot Hideout', 'Order',
   'A pirate hideout guarded by a skull carved into a giant tree.',
   'This is where the captain lives, and the giant tree with a skull grinning out of it makes sure nobody forgets that. Below it stand a golden-roofed house, torches on posts, a campfire and a mast with yellow sails behind the roof. Built in one week for a Box SMP server.',
   '/portfolio/skullroot-hideout.webp',
   '€150', 150, '150×150', 150, 150, '1 week', 7, false, false, 4),
  -- 5
  ('red-hill-favela', 'Red Hill Favela', 'Order',
   'A favela-style hillside around a bright lagoon, in our own take.',
   'Inspired by the favelas of Brazil, but done our way: red and orange houses stacked up the hillside, stairs and walkways squeezed between them, and a bright lagoon with little stalls at the bottom. A portal hides in a stone arch by the water. Built in one week for a Box SMP server.',
   '/portfolio/red-hill-favela.webp',
   '€150', 150, '150×150', 150, 150, '1 week', 7, false, false, 5),
  -- 6
  ('bloom-isle', 'Bloom Isle', 'Order',
   'A round island covered in flowers the size of trees.',
   'From above it looks like a cake: round, layered, and covered in flowers the size of trees. Waterfalls run down the terraces, a wooden pier comes in from the sea, and clouds circle the whole island. One of a series built for a Box SMP server, made in one week.',
   '/portfolio/bloom-isle.webp',
   '€150', 150, '150×150', 150, 150, '1 week', 7, false, false, 6),
  -- 7
  ('wildflower-hill', 'Wildflower Hill', 'Order',
   'A hilly island where the flowers grow taller than the trees.',
   'What if the flowers outgrew the trees? Pink, blue and red blooms poke above the leaves, streams trickle down the hill, and sandy beaches wrap around the bottom. Plenty of corners to explore without it feeling crowded. Built in one week for a Box SMP server.',
   '/portfolio/wildflower-hill.webp',
   '€150', 150, '150×150', 150, 150, '1 week', 7, false, false, 7),
  -- 8
  ('amethyst-keep', 'Amethyst Keep', 'Order',
   'A white-and-purple castle rising out of a thick pine forest.',
   'White stone, purple spires and gold trim: you can spot this castle from far away, but once you''re among the pines it disappears. A wide golden stair leads up to the gate, and small towers peek out of the woods around it. Built in one week for a Box SMP server.',
   '/portfolio/amethyst-keep.webp',
   '€150', 150, '150×150', 150, 150, '1 week', 7, false, false, 8),
  -- 9
  ('fallbrook-village', 'Fallbrook Village', 'Order',
   'A small village in a valley full of waterfalls, with a cherry tree in the middle.',
   'The village grew where the water comes down: waterfalls pour off the cliffs at the back and run past the houses in little streams. Golden-roofed homes sit between the trees, and a big pink cherry tree marks the centre where everyone meets. Built in one week for a Box SMP server.',
   '/portfolio/fallbrook-village.webp',
   '€150', 150, '200×200', 200, 200, '1 week', 7, false, false, 9),
  -- 10
  ('knightcliff-castle', 'Knightcliff Castle', 'Order',
   'A knights'' castle with red towers on top of an orange cliff island.',
   'Home of the knights: grey walls, a crowd of red pointed towers, and a courtyard where they train under a cherry tree. The castle stands right on the edge of an orange cliff, so no one gets in without being seen. Built in one week for a Box SMP server.',
   '/portfolio/knightcliff-castle.webp',
   '€150', 150, '150×150', 150, 150, '1 week', 7, false, false, 10),
  -- 11
  ('sunleaf-glade', 'Sunleaf Glade', 'Order',
   'A sunny glade with a pink-and-gold tree, a pond and a little dock.',
   'Mostly nature, and that''s the point. One big tree, pink on top and gold underneath, stands over a pond with a small wooden dock. Around it there''s a teal-roofed house with flower boxes, stone steps and a portal waiting behind the trees. Built in one week for a Box SMP server.',
   '/portfolio/sunleaf-glade.webp',
   '€150', 150, '150×150', 150, 150, '1 week', 7, false, false, 11),
  -- 12
  ('mesa-plaza', 'Mesa Plaza', 'Order',
   'A sun-baked town square with a fountain, under a curving red mesa.',
   'A bit of the Wild West with a Mexican touch: a dusty tiled square with a fountain in the middle, bright flags strung between the posts, and wooden houses with curly roofs. Behind them, a red mesa bends up and over like a wave of rock. Built in one week for a Box SMP server.',
   '/portfolio/mesa-plaza.webp',
   '€150', 150, '150×150', 150, 150, '1 week', 7, false, false, 12),
  -- 13
  ('great-oak-green', 'Great Oak Green', 'Order',
   'A sunny clearing under a giant old oak, with a bell tower in the distance.',
   'The old oak was here long before anything else, and everything else was built around it. Sandy paths, red brick planters, stacked crates and flower beds fill the clearing, with a timber house and a white bell tower peeking through the trees. Built in one week for a Box SMP server.',
   '/portfolio/great-oak-green.webp',
   '€150', 150, '150×150', 150, 150, '1 week', 7, false, false, 13),
  -- 14
  ('crossroads-market', 'Crossroads Market', 'Order',
   'A market where Japanese pagodas meet medieval timber houses.',
   'East and West meet at one market. Red-roofed stalls line a stone street, a long wooden hall stands under a cherry tree, and a tall pagoda rises over the bamboo, while across the road a medieval timber house joins in. A waterfall comes down the mountain behind it all. Built in one week for a Box SMP server.',
   '/portfolio/crossroads-market.webp',
   '€150', 150, '200×200', 200, 200, '1 week', 7, false, false, 14),
  -- 15
  ('mushroom-lane', 'Mushroom Lane', 'Order',
   'A forest village of red mushroom houses and lantern-lit paths.',
   'Red-and-white mushroom houses, lanterns hanging from the branches, and neat hedges along every path. In the middle there''s a small square with coloured markers, and snowy peaks rise behind the trees. Built in one week for a Box SMP server.',
   '/portfolio/mushroom-lane.webp',
   '€150', 150, '200×200', 200, 200, '1 week', 7, false, false, 15),
  -- 16
  ('goldcrown-castle', 'Goldcrown Castle', 'Order',
   'A white castle with golden domes, floating above the clouds.',
   'A castle that wants to be seen from every side: white walls, golden domes and tall thin towers rising out of a ring of pines. Out front there''s an open courtyard with lamp posts and a purple spawn pad, plus four spots where the server''s NPCs stand to greet players. Built in one week as a server spawn.',
   '/portfolio/goldcrown-castle.webp',
   '€150', 150, '150×150', 150, 150, '1 week', 7, false, false, 16),
  -- 17
  ('whirlpool-pagoda', 'Whirlpool Pagoda', 'Order',
   'A Japanese pagoda by a lake with a whirlpool spinning in its centre.',
   'The lake looks calm until you notice the whirlpool in the middle, slowly pulling everything in. A green-roofed pagoda watches over it from the shore, a wooden bridge crosses the water, and the clouds above spin in the same spiral. Built in one week for a Box SMP server.',
   '/portfolio/whirlpool-pagoda.webp',
   '€150', 150, '250×250', 250, 250, '1 week', 7, false, false, 17),
  -- 18
  ('northwind-isle', 'Northwind Isle', 'Order',
   'A small Viking island with pines, a cozy village and a wide sandy shore.',
   'A Viking village on a small northern island: wooden houses with steep teal roofs gathered around a central yard, banners flapping on the posts, and a pine forest all around. The wide sandy shore is where the boats get pulled in after a long trip. Built in one week for a Box SMP server.',
   '/portfolio/northwind-isle.webp',
   '€150', 150, '150×150', 150, 150, '1 week', 7, false, false, 18)
) as w (slug, title, tag, summary, description, image_url,
        price_label, price_amount, size_label, size_x, size_z,
        deadline_label, deadline_days, is_featured, is_published, n)

on conflict (slug) do update set
  title = excluded.title, tag = excluded.tag, summary = excluded.summary,
  description = excluded.description, image_url = excluded.image_url,
  price_label = excluded.price_label, price_amount = excluded.price_amount,
  size_label = excluded.size_label, size_x = excluded.size_x, size_z = excluded.size_z,
  deadline_label = excluded.deadline_label, deadline_days = excluded.deadline_days;

-- Проверка: ждём 18 строк; до первой публикации у всех is_published = false.
-- select slug, size_label, is_published, sort_order from public.projects
--   where image_url like '/portfolio/%.webp' and tag = 'Order' and price_label = '€150'
--   order by sort_order;
