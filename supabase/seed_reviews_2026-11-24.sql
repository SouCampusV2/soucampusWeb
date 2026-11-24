-- Отзывы 24.11: два новых (Jorge, Zhyrr) и длинные тире из старых.
--
-- Порядок прогона:
--   1. деплой кода — аватары public/reviews/jorge.png и zhyrr.png и их
--      строки в REVIEW_AVATARS (src/lib/reviews.ts). Без деплоя карточки
--      выйдут с заглушкой вместо аватара, но не сломаются;
--   2. этот файл. Сначала preview, потом прод.
--
-- Новые встают первыми, новейший — самым первым: Zhyrr (-1), Jorge (0),
-- дальше остальные с 1. Цвета чередуются: Zhyrr orange, Jorge lime,
-- Erik orange.
-- Флаги: Jorge — 🇲🇽 (Мексика), Zhyrr — 🇳🇱 (Нидерланды); оба со слов
-- владельца.
--
-- Тире (решение владельца 24.11): в текстах отзывов длинных тире не
-- должно быть. Каждый текст переписан руками — где тире разделяло две
-- мысли, стала точка, где вводило перечисление — двоеточие. Слова
-- клиентов не менялись. Обновление срабатывает, только пока в тексте
-- ещё есть тире: если на какой-то базе отзыв уже правили руками, он не
-- перезапишется.
--
-- Перезапускаемо: вставка при совпадении slug обновляет тексты, но не
-- sort_order; правки тире после первого прогона больше ничего не находят.

insert into public.reviews (slug, name, role, flag, review_text, accent, sort_order)
values
  (
    'zhyrr',
    'Zhyrr',
    'Commission client',
    '🇳🇱',
    $t$I commissioned SouCampus to merge certain assets while maintaining their original style. Where other builders struggled to match the style, SouCampus immediately adapted and didn't mind any of the small edits I requested. An absolutely fantastic builder, and I would definitely work with them again if I ever need something else!$t$,
    'orange',
    -1
  ),
  (
    'jorge',
    'Jorge',
    'Founder, Keystone Games',
    '🇲🇽',
    $t$We've only known Sou for a short time, but he's already proven to be a promising builder. Whenever we've needed extra help, we've brought him in on projects, and he's earned our confidence a little more each time. He has a great attitude and has been fitting in well with our team's culture. We've been happy with the results so far and plan to keep working with him!$t$,
    'lime',
    0
  )
on conflict (slug) do update set
  name        = excluded.name,
  role        = excluded.role,
  flag        = excluded.flag,
  review_text = excluded.review_text,
  accent      = excluded.accent;

update public.reviews as r
   set review_text = v.new_text
  from (values
    ('erik',          $t$Worked with SouCampus for over a year across multiple projects: fast communication, reliably great results, and rarely needs creative direction.$t$),
    ('ghost',         $t$Consistently impressed by his creativity and skill. Every build feels like it belongs in a living world, with a soul and story behind the design.$t$),
    ('rambomine',     $t$Incredibly skilled and reliable. Builds match the vision perfectly, deadlines are respected, and the attention to detail stands out every time.$t$),
    ('the-erik-cz',   $t$Worked with SouCampus from early commissions to now supplying builds for our shop. Hugely talented, with a great eye for detail.$t$),
    ('scooter',       $t$Fast, responsive and easy to work with. Every build has consistently exceeded expectations.$t$),
    ('luke-and-sven', $t$Fantastic results that genuinely improved the player experience on our servers: fast delivery, fair pricing, and an easy recommendation.$t$),
    ('nathan',        $t$Loved the creativity and the communication. Our new spawn is a hit with players. Nothing to complain about.$t$),
    ('giel',          $t$Always fast, professional, and great with feedback. He delivered on large projects, even ones he'd never done before, with creativity I haven't seen elsewhere.$t$),
    ('muthely',       $t$His style, designs, and how he treats clients stood out from the start. Always delivered on the agreed date and happy to make changes. A bit pricey, but worth it.$t$)
  ) as v(slug, new_text)
 where r.slug = v.slug
   and r.review_text like '%—%';

-- Проверка (только чтение): должно вернуть ноль строк.
--   select slug, review_text from public.reviews where review_text like '%—%';
