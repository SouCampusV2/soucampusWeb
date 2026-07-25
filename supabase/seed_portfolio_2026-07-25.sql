-- Восемь новых работ портфолио (2026-07-25).
-- Прогнать вручную в Supabase SQL Editor: СНАЧАЛА preview, ПОТОМ прод
-- (правило docs/RULES.md). Идемпотентно: on conflict (slug) обновляет,
-- поэтому повторный прогон безопасен.
--
-- ⚠️ Сроки у duskspire-quarter / sakura-hollow / arena-atoll / solace-spires
-- не задавались — проставлены оценкой, поправить при желании.

insert into public.projects
  (slug, title, tag, summary, description, image_url,
   price_label, price_amount, size_label, size_x, size_z,
   deadline_label, deadline_days, is_featured, sort_order)
values
  ('pinecliff-haven', 'Pinecliff Haven', 'Order',
   'A sunlit island town of terracotta roofs and pinewoods, linked to its outlying towers by rope bridges.',
   'A bright, cozy island settlement wrapped in blue water: terracotta-roofed cottages and a central keep set among dense pine forest, with rope bridges reaching out to slender lookout towers on neighbouring cliffs. Warm lantern light and a tidy, walkable layout make it feel lived-in. Commissioned build, made in two weeks.',
   '/portfolio/pinecliff-haven.png',
   '€350', 350, '300×300', 300, 300, '2 weeks', 14, false, 17),

  ('duskspire-quarter', 'Duskspire Quarter', 'Order',
   'A grand fantasy palace and riverside quarter bathed in dusk light.',
   'A moody fantasy district at dusk: a towering ornate palace overlooking a winding river, framed by giant bonsai-like trees and a cluster of steep-roofed houses climbing the hillside toward a distant spire. Soft pink evening light ties the whole scene together. Commissioned build.',
   '/portfolio/duskspire-quarter.png',
   '€250', 250, '250×250', 250, 250, '2 weeks', 14, false, 18),

  ('skyward-armada', 'Skyward Armada', 'Personal project',
   'A cluster of sky islands patrolled by a fleet of drifting airships.',
   'A personal project from a couple of years back: a chain of lush sky islands crowned with a red-roofed keep, orbited by a small armada of hot-air airships and a moored galleon. Bright, airy and full of movement. Built for myself over three weeks.',
   '/portfolio/skyward-armada.jpg',
   'personal project', NULL, '400×400', 400, 400, '3 weeks', 21, false, 19),

  ('driftstone-isles', 'Driftstone Isles', 'Order',
   'A set of self-contained biome islands — forest, canyon, snow and more — built as ready-to-drop plots.',
   'A commission for a set of standalone islands, each its own 150×150 biome — verdant forest, red canyon, snowy peak and others — designed to be dropped into a world as ready-made plots. Presented together as a single render. Built in about a week and a half.',
   '/portfolio/driftstone-isles.png',
   '€250', 250, '150×150 each', 150, 150, '1.5 weeks', 10, false, 20),

  ('emberpeak-village', 'Emberpeak Village', 'Personal project',
   'A fantasy mountain village clustered around a white spired castle on glowing ember-red cliffs.',
   'A small fantasy build set into dramatic ember-red rock: timber cottages with glowing windows gathered around an ornate white-spired castle, wrapped in mist and pine. A personal piece built in a week.',
   '/portfolio/emberpeak-village.png',
   'personal project', NULL, '150×150', 150, 150, '1 week', 7, false, 21),

  ('sakura-hollow', 'Sakura Hollow', 'Order',
   'A serene island of cherry blossoms and tiered pagodas rising from calm water.',
   'A tranquil island commission: multi-tiered pagodas and shrines set among dense cherry blossoms and pine, connected by winding paths down to waterside pavilions, all reflected in still turquoise water. Commissioned build.',
   '/portfolio/sakura-hollow.png',
   '€200', 200, '250×250', 250, 250, '2 weeks', 14, false, 22),

  ('arena-atoll', 'Arena Atoll', 'Order',
   'A compact PvP arena set on a water-bound island ringed by tree-topped stone pillars.',
   'A small, focused PvP island: a green-and-gold colonnade arena at its heart, surrounded by drifting stone pillars topped with tall trees and sakura, all sitting on open water. Tight, symmetrical and built for combat. Commissioned build.',
   '/portfolio/arena-atoll.jpg',
   '€75', 75, '75×75', 75, 75, '1 week', 7, false, 23),

  ('solace-spires', 'Solace Spires', 'Order',
   'A cluster of sleek white high-rise towers rising out of a misty palm jungle.',
   'A modern build breaking from the usual fantasy style: sleek white glass towers with rounded crowns, joined by walkways and set into a steep, misty jungle of palms and stone outcrops. Bright and clean. Commissioned build.',
   '/portfolio/solace-spires.png',
   '€100', 100, '125×125', 125, 125, '1 week', 7, false, 24),

  ('corsair-isle', 'Corsair Isle', 'Order',
   'A tropical volcano island with a palm-covered pirate village, stone pillars and a galleon at anchor.',
   'A pirate-themed tropical island commission: a smoking volcano at its heart, a village of golden-roofed huts and a bustling dockside market spread across palm-covered sand, ringed by moss-topped stone pillars, with a galleon moored at the beach. Built in a week.',
   '/portfolio/corsair-isle.jpg',
   '€200', 200, '250×250', 250, 250, '1 week', 7, false, 25),

  ('yuletide-isle', 'Yuletide Isle', 'Order',
   'A floating snow island holding a festive Christmas village of candy canes and red-roofed cabins.',
   'A festive floating island commission: snow-dusted cabins with red roofs gathered along a path lined with candy canes and pines, a wrapped gift and a Santa-hatted rock tucked among the drifts. Cozy holiday lighting throughout. Built in a week.',
   '/portfolio/yuletide-isle.png',
   '€150', 150, '100×100', 100, 100, '1 week', 7, false, 26),

  ('dragon-cathedral', 'Dragon Cathedral', 'Order',
   'A gothic cathedral crowned by a great fire-orange dragon coiled across its roof.',
   'A commission pairing high-gothic architecture with a centrepiece creature: a pale stone cathedral of spires, flying buttresses and tall windows, with a massive orange dragon draped across its nave, wings spread against a soft golden haze. Built in a week.',
   '/portfolio/dragon-cathedral.jpg',
   '€200', 200, '600×600', 600, 600, '1 week', 7, false, 27)

on conflict (slug) do update set
  title = excluded.title, tag = excluded.tag, summary = excluded.summary,
  description = excluded.description, image_url = excluded.image_url,
  price_label = excluded.price_label, price_amount = excluded.price_amount,
  size_label = excluded.size_label, size_x = excluded.size_x, size_z = excluded.size_z,
  deadline_label = excluded.deadline_label, deadline_days = excluded.deadline_days,
  is_featured = excluded.is_featured, sort_order = excluded.sort_order;
