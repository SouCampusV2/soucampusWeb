-- Ограничения длины текстовых полей — 2026-08-20.
--
-- Пункт 5.1 из docs/ARCHITECTURE.md, первый шаг блока B1
-- (docs/PLAN-2026-08.md). Сделан первым, потому что он единственный из
-- всего блока по-настоящему НАШ: остальное живёт в настройках Supabase
-- Auth, куда кодом не дотянуться.
--
-- ЧТО ЭТО ЗАКРЫВАЕТ И ЧТО НЕТ.
-- Закрывает РАЗДУВАНИЕ ОБЪЁМА: сейчас форма профиля считает био до 500
-- символов, а база не ограничивает ничем — то есть запросом из консоли
-- в неё кладётся мегабайт, и так столько раз, сколько захочется.
-- Хранилище платное, а страница с таким био открывается у всех.
--
-- НЕ закрывает и не должна: SQL-инъекцию (её делает невозможной
-- параметризация, а не длина) и XSS (за него отвечают экранирование
-- React и sanitize.ts). Три угрозы, которые легко перепутать, — разбор
-- в ARCHITECTURE.md § 6.
--
-- ПОЧЕМУ NOT VALID У КАЖДОГО.
-- Обычный check проверяет ВСЕ существующие строки при добавлении, и
-- одна старая строка длиннее лимита роняет миграцию целиком — на проде,
-- где данные писались без ограничений. `not valid` означает «на новые и
-- изменяемые строки правило действует, старые не проверяю». Защита при
-- этом полноценная: чтобы записать длинное, надо пройти проверку.
-- Когда захочется убедиться, что старых нарушителей нет:
--   alter table public.profiles validate constraint profiles_bio_len;
-- Это отдельное решение и отдельный момент, а не побочный эффект
-- миграции.
--
-- ЧИСЛА ВЫШЕ ФОРМЕННЫХ НАМЕРЕННО.
-- Форма — про удобство («не пиши роман»), база — про гарантию («не
-- клади мегабайт»). Если поставить их вплотную, любое послабление в
-- интерфейсе тут же упрётся в базу и даст непонятную ошибку сохранения.

-- ------------------------------------------------------------
-- Профили.

alter table public.profiles drop constraint if exists profiles_display_name_len;
alter table public.profiles
  add constraint profiles_display_name_len
  check (char_length(display_name) between 2 and 32) not valid;

alter table public.profiles drop constraint if exists profiles_bio_len;
alter table public.profiles
  add constraint profiles_bio_len
  check (bio is null or char_length(bio) <= 1000) not valid;

alter table public.profiles drop constraint if exists profiles_names_len;
alter table public.profiles
  add constraint profiles_names_len
  check (
    (first_name is null or char_length(first_name) <= 100)
    and (last_name is null or char_length(last_name) <= 100)
  ) not valid;

-- Ссылки. 2048 — общепринятый практический потолок длины URL.
alter table public.profiles drop constraint if exists profiles_avatar_url_len;
alter table public.profiles
  add constraint profiles_avatar_url_len
  check (avatar_url is null or char_length(avatar_url) <= 2048) not valid;

-- ------------------------------------------------------------
-- Карты.
--
-- description — HTML из редактора, поэтому потолок высокий: разметка
-- занимает больше самого текста. 200 000 символов это ~200 КБ на карту,
-- заведомо больше любого осмысленного описания и заведомо меньше того,
-- чем можно забить базу.
--
-- ⚠️ Дыру рядом эта миграция НЕ закрывает: sanitize.ts пускает в img
-- схему data:, а картинка, вписанная прямо в описание, съедает лимит
-- целиком и законно (ARCHITECTURE.md § 7, пункт 3). Настоящее лечение —
-- запретить data: и ограничить img своим бакетом, это пункт 11 в
-- приоритетах CLAUDE.md.

alter table public.products drop constraint if exists products_text_len;
alter table public.products
  add constraint products_text_len
  check (
    char_length(slug) <= 140
    and char_length(title) <= 120
    and char_length(summary) <= 300
    and char_length(description) <= 200000
    and char_length(image_url) <= 2048
    and char_length(price_label) <= 32
  ) not valid;

-- Причина снятия/удаления пишется владельцем сайта из админки, но пусть
-- и у неё будет потолок: поле показывается автору на его странице.
alter table public.products drop constraint if exists products_suspension_reason_len;
alter table public.products
  add constraint products_suspension_reason_len
  check (suspension_reason is null or char_length(suspension_reason) <= 2000) not valid;

notify pgrst, 'reload schema';
