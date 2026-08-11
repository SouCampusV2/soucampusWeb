-- ------------------------------------------------------------
-- Форма ссылок в заявке на статус креатора.
--
-- Заявка вставляется НАПРЯМУЮ из браузера (см. шапку
-- CreatorApplicationForm.tsx): политика "submit own application"
-- ограничивает автора и статус, но не содержимое полей. Значит,
-- проверка в форме — это удобство, а не защита: тот же insert
-- отправляется из консоли браузера в обход неё.
--
-- Поэтому та же проверка стоит здесь. Она грубее, чем в contact-links.ts
-- (регулярное выражение против разбора URL), и это осознанно: база
-- обязана отсечь мусор, а точная нормализация — работа формы. Строже
-- всего то, что действительно опасно, — схема: адрес попадает в href на
-- странице админки, и `javascript:` там сработал бы по клику владельца,
-- у которого прав больше всех.
--
-- NULL проходит обе проверки: оба поля необязательны, «не указал» —
-- законный ответ. Пустую строку форма превращает в NULL сама.
--
-- not valid + validate constraint отдельным шагом: старые строки, если
-- они успели набраться, не должны ронять миграцию. Если валидация
-- упадёт — значит такие строки есть, и разбирать их надо руками, а не
-- откатывать всю миграцию.
-- ------------------------------------------------------------
alter table public.creator_applications
  drop constraint if exists creator_applications_portfolio_url_check;

alter table public.creator_applications
  add constraint creator_applications_portfolio_url_check
  check (
    portfolio_url is null
    -- https://<хост с точкой>/<что угодно без пробелов>
    or portfolio_url ~* '^https?://[^\s/]+\.[^\s/]+'
  )
  not valid;

alter table public.creator_applications
  drop constraint if exists creator_applications_discord_check;

alter table public.creator_applications
  add constraint creator_applications_discord_check
  check (
    discord is null
    -- современный ник: 2–32 символа, буквы/цифры/точка/подчёркивание
    or discord ~ '^[a-zA-Z0-9._]{2,32}$'
    -- старый формат с дискриминатором
    or discord ~ '^.{2,32}#[0-9]{4}$'
    -- ссылка-приглашение
    or discord ~* '^https?://(www\.)?(discord\.gg|discord\.com)/'
  )
  not valid;

alter table public.creator_applications
  validate constraint creator_applications_portfolio_url_check;

alter table public.creator_applications
  validate constraint creator_applications_discord_check;
