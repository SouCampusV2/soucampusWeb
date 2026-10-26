-- ============================================================
-- Ссылки в профиле — 2026-10-26.
--
-- Просьба владельца: Discord, X, YouTube и прочее под именем на
-- /@<username>. Список видов — его ответ 26.10: Discord, X, YouTube,
-- TikTok, Instagram, Twitch, Reddit, Planet Minecraft, BuiltByBit,
-- Modrinth и «свой сайт».
--
-- ⚠️ ИДЁТ ДО ДЕПЛОЯ — файл только ДОБАВЛЯЕТ (функцию, колонку,
-- ограничение, право, колонку представления). Код переживает и обратный
-- порядок: creators.ts и profiles.ts откатываются на набор без links,
-- а форма шлёт links, только если их трогали. Сначала preview, потом
-- прод (docs/RULES.md). Файл перезапускаемый.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Проверка списка ссылок.
--
-- Почему в БАЗЕ, а не в форме: форма пишет в profiles прямо из браузера
-- (права на колонки, 20260915120000), нашего кода в этом пути нет.
-- Проверка в форме — подсказка человеку, запрет — здесь.
--
-- Главное правило — ДОМЕН ПО ВИДУ. Ссылка с иконкой Discord обязана вести
-- на discord.gg / discord.com: иначе кто угодно подпишет фишинговый
-- адрес знакомой иконкой, и посетитель профиля поверит иконке, а не
-- адресу. Без привязки к домену только «website» — у него и иконка
-- нейтральная (глобус), и подпись — сам домен.
--
-- ⚠️ Копия правил для интерфейса — src/lib/profile-links.ts (там же
-- тесты). Добавляешь вид — дописывай в ОБА места; разойдутся — форма
-- пропустит, а база откажет общим «Couldn't save».
--
-- Хост вынимается регуляркой, которая НЕ пускает ни логин, ни порт:
-- https://discord.com@evil.com — классика подмены, где «discord.com»
-- стоит на месте имени пользователя, а настоящий хост — evil.com. После
-- [a-z0-9.-]+ разрешены только / ? # или конец строки, так что «@» и
-- «:» дают null, а null — отказ.
-- ------------------------------------------------------------
create or replace function public.profile_links_valid(p_links jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  item jsonb;
  link_kind text;
  link_url text;
  host text;
  domains text[];
begin
  if p_links is null then
    return true;
  end if;
  if jsonb_typeof(p_links) <> 'array' or jsonb_array_length(p_links) > 8 then
    return false;
  end if;

  for item in select value from jsonb_array_elements(p_links) loop
    -- Ровно два ключа: лишние поля в публичном профиле — место, куда
    -- можно спрятать что угодно в обход проверки.
    if jsonb_typeof(item) <> 'object'
       or (select count(*) from jsonb_object_keys(item)) <> 2 then
      return false;
    end if;

    link_kind := item->>'kind';
    link_url := item->>'url';
    if link_kind is null or link_url is null or length(link_url) > 200 then
      return false;
    end if;

    -- Только https и никаких пробелов, кавычек и угловых скобок: адрес
    -- попадает в href на странице, которую видят все.
    if link_url !~ '^https://[^[:space:]"<>]+$' then
      return false;
    end if;

    host := substring(lower(link_url) from '^https://([a-z0-9.-]+)(?:[/?#]|$)');
    if host is null or position('.' in host) = 0 then
      return false;
    end if;

    domains := case link_kind
      when 'discord'         then array['discord.gg', 'discord.com']
      when 'x'               then array['x.com', 'twitter.com']
      when 'youtube'         then array['youtube.com', 'youtu.be']
      when 'tiktok'          then array['tiktok.com']
      when 'instagram'       then array['instagram.com']
      when 'twitch'          then array['twitch.tv']
      when 'reddit'          then array['reddit.com']
      when 'planetminecraft' then array['planetminecraft.com']
      when 'builtbybit'      then array['builtbybit.com']
      when 'modrinth'        then array['modrinth.com']
      when 'website'         then null
      else array[]::text[]   -- неизвестный вид: пустой список = отказ
    end;

    if domains is not null and not exists (
      select 1 from unnest(domains) as d
      where host = d or right(host, length(d) + 1) = '.' || d
    ) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

-- ⚠️ execute здесь НЕ отзывается — сознательное исключение из правила
-- 23.08 («execute роли PUBLIC выдаётся сам, снимай руками»). Функцию
-- в ограничении Postgres зовёт с правами ТОГО, КТО ПИШЕТ: отними execute
-- у authenticated — и любое сохранение профиля упадёт отказом прав.
-- Правило 23.08 защищает функции, которые что-то читают или меняют;
-- эта не трогает ни одной таблицы и отвечает «да/нет» про переданный ей
-- же текст — звать её из консоли бессмысленно, но безвредно.

-- ------------------------------------------------------------
-- 2. Колонка и ограничение.
--
-- not null default '[]': «ссылок нет» — пустой список, а не null.
-- Два способа сказать одно и то же разъедутся в первом же if.
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists links jsonb not null default '[]'::jsonb;

alter table public.profiles drop constraint if exists profiles_links_valid;
alter table public.profiles
  add constraint profiles_links_valid check (public.profile_links_valid(links));

-- ------------------------------------------------------------
-- 3. Право на колонку. С 15.09 новая колонка profiles закрыта для
--    браузера по умолчанию — без этой строки форма получила бы 42501.
-- ------------------------------------------------------------
grant update (links) on table public.profiles to authenticated;

-- ------------------------------------------------------------
-- 4. Представление: + links. Ссылки публичные по смыслу — человек
--    вписывает их ровно затем, чтобы их видели.
--
-- drop + create и сразу revoke all → grant select — тот же порядок, что
-- в 20261025130000, и по тем же причинам.
-- ------------------------------------------------------------
drop view if exists public.public_profiles;

create view public.public_profiles
with (security_invoker = false) as
  select
    id,
    username,
    username_lower,
    avatar_url,
    bio,
    is_verified,
    is_creator,
    is_founder,
    name_color,
    public.profile_is_client(id) as is_client,
    banner_url,
    created_at,
    links
  from public.profiles;

revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Журнал прогонов — последней строкой (docs/RULES.md → «Миграции»).
-- ------------------------------------------------------------
insert into ops.applied_migrations (version)
values ('20261026120000_profile_links')
on conflict (version) do nothing;
