-- ============================================================
-- stats: tailwind-классы -> смысловой accent
--
-- Зачем. В колонках color/bar лежали готовые классы Tailwind
-- ("text-orange-400", "bg-orange-400"). Это не работает: Tailwind
-- собирает CSS, СКАНИРУЯ исходный код, и класс, который приезжает из
-- базы во время выполнения, в собранный CSS просто не попадает —
-- цвет молча не применяется.
--
-- Правильная граница: в базе хранится СМЫСЛ ("акцент оранжевый"), а
-- какими классами он рисуется — знает компонент. Тогда смена палитры в
-- DESIGN.md не требует правки данных, а данные не могут сломать вёрстку
-- опечаткой в названии класса.
--
-- Ровно так уже устроен accent у reviews — это приведение stats к тому
-- же паттерну, а не новое изобретение.
-- ============================================================

alter table public.stats
  add column accent text not null default 'orange'
    check (accent in ('orange', 'lime', 'blue'));

-- Переносим то, что уже есть: цвет угадывается по id, строк всего три.
update public.stats set accent = 'lime'  where id = 'reach';
update public.stats set accent = 'blue'  where id = 'clients';
update public.stats set accent = 'orange' where id = 'orders';

alter table public.stats drop column color;
alter table public.stats drop column bar;
