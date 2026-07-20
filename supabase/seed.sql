-- Данные, сгенерированные из src/lib/projects.ts и src/lib/reviews.ts
-- (Этап 3, шаг 3). Разовый перенос: после него источник истины — БД.

insert into public.projects
  (slug, title, tag, summary, description, image_url,
   price_label, price_amount, size_label, size_x, size_z,
   deadline_label, deadline_days, is_featured, sort_order)
values
  ('bluespawn', 'BlueSpawn', 'Order', 'A bright and lively spawn built for a marketplace, available for purchase.', 'A custom BlueSpawn build made for a marketplace — available for purchase by any player for $8.90. Bright, cozy and lively spawn: tropical vegetation, tidy layout and detailed locations that are a pleasure to explore. Built in a week.', '/portfolio/bluespawn.webp',
   '€150', 150, '250×250', 250, 250,
   '1 week', 7, true, 1),
  ('pirate-rpg', 'Pirate RPG Map', 'RPG map', 'A massive pirate map with dozens of buildings and detailed exteriors.', 'A large-scale commission for a huge pirate-themed RPG map. Dozens of buildings, every location''s exterior fully detailed — a lot of effort and care went into it. Bright, rich and genuinely massive map. Built over a month together with other builders.', '/portfolio/pirate-rpg.jpeg',
   'team project', NULL, '2000×2000', 2000, 2000,
   '1 month', 30, true, 2),
  ('sky-cathedral', 'Sky Cathedral', 'Personal project', 'A detailed church on floating islands — an experiment and a passion project.', 'A personal project with no client — built out of inspiration and as an experiment. A detailed church on floating islands surrounded by sakura trees. Built in a week.', '/portfolio/sky-cathedral.png',
   'personal project', NULL, '350×350', 350, 350,
   '1 week', 7, true, 3),
  ('dragon-shrine', 'Dragon Shrine', 'Trial work', 'An atmospheric shrine with an organic dragon carving above a temple complex.', 'Trial work for a build studio. An incredibly atmospheric build: an organic, large-scale dragon soaring above a temple complex. Built in 2 weeks.', '/portfolio/dragon-shrine.png',
   'trial', NULL, '350×350', 350, 350,
   '2 weeks', 14, true, 4),
  ('pink-village', 'Pink Village', 'Order', 'A pastel medieval-fantasy village wrapped in cherry blossoms, floating just above the water.', 'A cluster of layered medieval-fantasy houses in blue and pink, built on a small island ringed with cherry blossom trees and pale stone cliffs. Soft, dreamy lighting and a tight, detailed footprint make it feel like a postcard. Built in a week.', '/portfolio/pink-village.png',
   '€187.5', 187.5, '150×150', 150, 150,
   '1 week', 7, true, 5),
  ('porto-fiorenza', 'Porto Fiorenza', 'Team project', 'A dense Italian coastal city of terracotta roofs, plazas and winding roads.', 'A full Italian city district built from the ground up: terracotta-roofed townhouses, domed civic buildings, palm-lined boulevards and a network of roads connecting it all, wrapped around a turquoise bay. Built together with other builders over a month.', '/portfolio/porto-fiorenza.jpg',
   'team project', NULL, '750×750', 750, 750,
   '1 month', 30, false, 6),
  ('frostwick-holiday', 'Frostwick Holiday', 'Personal project', 'A snow-covered village built around a towering, glowing Christmas tree.', 'A festive village of candy-striped cabins and frosted spires gathered around a massive decorated tree, with Santa''s sleigh crossing the night sky overhead. A seasonal passion project built for the holidays.', '/portfolio/frostwick-holiday.png',
   '€300', 300, '200×200', 200, 200,
   '2 weeks', 14, false, 7),
  ('skyhold-sanctuary', 'Skyhold Sanctuary', 'Personal project', 'A cluster of pine-covered floating islands anchored by a grand stone keep.', 'A chain of rugged floating islands connected by bridges and vines, crowned with a large stone-and-timber keep overlooking a green pine forest. A bigger, wilder companion piece to Sky Cathedral.', '/portfolio/skyhold-sanctuary.png',
   'personal project', NULL, '400×400', 400, 400,
   '3 weeks', 21, false, 8),
  ('hollowpeak-hold', 'Hollowpeak Hold', 'Order', 'A fortified medieval mountain stronghold with tiered towers and red war banners.', 'A defensible medieval mountain base built into a forested cliffside: layered stone-and-timber towers, a windmill, and a central courtyard, all flying red banners. Commissioned as a server spawn and stronghold.', '/portfolio/hollowpeak-hold.png',
   '€200', 200, '300×300', 300, 300,
   '2 weeks', 14, false, 9),
  ('mistgrove-fairground', 'Mistgrove Fairground', 'Order', 'A foggy amusement park with a working ferris wheel and a grand entrance gate.', 'A full amusement park commission: a fog-wrapped ferris wheel, a fountain plaza, and a pair of ornate mansions framed by cherry blossoms.', '/portfolio/mistgrove-fairground.png',
   '€300', 300, '350×350', 350, 350,
   '3 weeks', 21, false, 10),
  ('amberhive-hollow', 'Amberhive Hollow', 'Order', 'A fantasy garden sanctuary built into a giant hollowed-out honeycomb hive.', 'A glowing hollow built around an oversized beehive, with lantern-lit paths framed by huge stylised flowers and crystal formations. Built as a commissioned sanctuary hub for a server.', '/portfolio/amberhive-hollow.png',
   '€120', 120, '150×150', 150, 150,
   '1 week', 7, false, 11),
  ('ironholt', 'Ironholt', 'Order', 'A sprawling RPG city blending medieval, Japanese and grand European quarters.', 'A massive multi-district RPG city built for a fantasy server: a rugged medieval quarter, a Japanese-inspired district, and a grander high-medieval European core, each with its own architecture and character. Home to a mixed fantasy population — orcs and other races/factions each holding their own corner of the city. Gallery includes ground-level streets and a dusk-lit town square.', '/portfolio/ironholt.png',
   '€800', 800, '500×500', 500, 500,
   '1 month', 30, false, 12),
  ('prismport', 'Prismport', 'Personal project', 'A vibrant, rainbow-colored island city with a bustling harbor.', 'A lively island city with glowing terracotta towers, a covered market street and a small harbor, all wrapped in dense jungle. Built as a personal project exploring bold, saturated color.', '/portfolio/prismport.png',
   'personal project', NULL, '300×300', 300, 300,
   '1 week', 7, false, 13),
  ('nova-ringport', 'Nova Ringport', 'Personal project', 'A neon space station encircled by a glowing planetary ring.', 'A sci-fi space station built around a massive control spire, wrapped in a luminous pink ring and orbited by drifting asteroids and a passing starship. A personal project exploring neon/glow builds outside the usual fantasy style.', '/portfolio/nova-ringport.png',
   '€450', 450, '250×250', 250, 250,
   '2 weeks', 14, false, 14),
  ('amethyst-grove', 'Amethyst Grove', 'Order', 'A glowing violet fantasy-medieval village surrounded by oversized magic flora.', 'A small fantasy-medieval village bathed in purple light, framed by oversized magic blossoms and floating platforms. Built as a study in purple and violet lighting.', '/portfolio/amethyst-grove.png',
   '€150', 150, '150×150', 150, 150,
   '1 week', 7, false, 15),
  ('voidframe-enclave', 'Voidframe Enclave', 'Order', 'A city sealed inside a glowing wireframe dome, floating above alien terrain.', 'A compact futuristic city enclosed in a glowing geodesic dome, set above a pink alien landscape. A sci-fi showcase build.', '/portfolio/voidframe-enclave.jpg',
   '€300', 300, '200×200', 200, 200,
   '2 weeks', 14, false, 16);

-- Галерея. project_id ищется по slug подзапросом — так не нужно
-- знать uuid'ы, которые база сгенерировала сама секунду назад.
insert into public.project_images (project_id, url, position)
values
  ((select id from public.projects where slug = 'ironholt'), '/portfolio/ironholt-2.png', 0),
  ((select id from public.projects where slug = 'ironholt'), '/portfolio/ironholt-3.png', 1);

insert into public.reviews (slug, name, role, flag, review_text, accent, sort_order)
values
  ('erik', 'Erik', 'Server Owner, Luckycraft', '🇳🇱', 'Worked with SouCampus for over a year across multiple projects — fast communication, reliably great results, and rarely needs creative direction.', 'orange', 1),
  ('ghost', 'Ghost', 'Owner, GuardiumMC', '🇺🇸', 'Consistently impressed by his creativity and skill — every build feels like it belongs in a living world, with a soul and story behind the design.', 'lime', 2),
  ('rambomine', 'rambomine', 'Owner, RamboMC', '🇳🇱', 'Incredibly skilled and reliable — builds match the vision perfectly, deadlines are respected, and the attention to detail stands out every time.', 'orange', 3),
  ('the-erik-cz', 'TheErikCZ', 'Founder, BreadBuilds', '🇨🇿', 'Worked with SouCampus from early commissions to now supplying builds for our shop — hugely talented, with a great eye for detail.', 'lime', 4),
  ('scooter', 'Scooter', 'Owner, Stranded', '🇳🇱', 'Fast, responsive and easy to work with — every build has consistently exceeded expectations.', 'orange', 5),
  ('luke-and-sven', 'Luke & Sven', 'Owners, AstroSMP', '🇳🇱', 'Fantastic results that genuinely improved the player experience on our servers — fast delivery, fair pricing, and an easy recommendation.', 'lime', 6),
  ('nathan', 'Nathan', 'Owner, LunaSMP', '🇳🇱', 'Loved the creativity and the communication — our new spawn is a hit with players. Nothing to complain about.', 'orange', 7);

insert into public.stats (id, label, value, suffix, color, bar, sort_order)
values
  ('orders', 'Crafted orders and projects', 246, '+', 'text-orange-400', 'bg-orange-400', 1),
  ('reach', 'Players who''ve seen the builds', 30, 'K+', 'text-lime-300', 'bg-lime-400', 2),
  ('clients', 'Really happy clients', 81, '+', 'text-blue-400', 'bg-blue-400', 3);
