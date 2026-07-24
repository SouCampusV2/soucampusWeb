-- ============================================================
-- profiles — профиль пользователя (расширение auth.users)
--
-- auth.users (служебная таблица Supabase) хранит логин/пароль/email и
-- трогать её нельзя. Всё «наше» про пользователя — ник, имя, аватар,
-- флаг креатора — держим в отдельной таблице public.profiles, связанной
-- с auth.users один-к-одному по id.
--
-- Правило миграций: сначала прогнать на preview-базе, потом на проде
-- (см. docs/RULES.md).
-- ============================================================


-- ------------------------------------------------------------
-- 1. Таблица
--
-- id ссылается на auth.users(id): profile существует ровно пока
-- существует аккаунт. on delete cascade — удалили пользователя в
-- Supabase, его профиль уходит автоматически.
--
-- email СОЗНАТЕЛЬНО не дублируем: он живёт в auth.users, копия здесь
-- рассинхронизировалась бы при смене почты. Читаем email из auth.users.
-- ------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,                  -- публичный ник
  first_name    text,                           -- имя (личное, на будущее)
  last_name     text,                           -- фамилия (личное, на будущее)
  avatar_url    text,                           -- ссылка на аватар (на будущее)
  is_creator    boolean not null default false, -- стал ли креатором (Этап 4, будущее)
  discord       text,                           -- подключённый Discord (будущее)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Уникальность ника — регистронезависимо: "Sou" и "sou" считаются одним.
-- Уникальный индекс по lower(display_name), а не просто UNIQUE на колонку,
-- иначе отличались бы только регистром.
create unique index profiles_display_name_lower_idx
  on public.profiles (lower(display_name));

-- Автообновление updated_at при любом UPDATE — та же общая функция, что
-- у projects/stats (см. initial_schema.sql).
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 2. Автосоздание профиля при регистрации
--
-- Когда Supabase создаёт строку в auth.users (регистрация), этот триггер
-- сразу заводит парную строку в profiles. Ник берём из метаданных
-- регистрации (options.data.display_name с формы); если его нет
-- (например, будущий вход через Google без ника) — падаем на часть email
-- до "@", чтобы не нарушить NOT NULL.
--
-- security definer: функция выполняется с правами владельца (обходит
-- RLS), иначе вставка в profiles от имени только что созданного
-- пользователя упёрлась бы в политики. search_path = '' + полные имена
-- схем — стандартная защита таких функций от подмены search_path.
--
-- Если ник уже занят — уникальный индекс отклонит вставку, триггер
-- поднимет ошибку, и вся транзакция регистрации откатится (аккаунт не
-- создастся). Это и есть серверная проверка «ник занят».
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ------------------------------------------------------------
-- 3. Доступ (RLS)
--
-- Включаем RLS и пока открываем РОВНО то, что нужно сейчас: пользователь
-- видит и правит ТОЛЬКО свою строку. Публичного чтения профилей нет
-- намеренно — оно понадобится позже, когда появятся креаторы и
-- маркетплейс (тогда публичные поля креатора отдадим через отдельную
-- политику/представление, а не открывая имя/фамилию всех подряд).
-- См. подход в docs/STRUCTURE.md.
--
-- INSERT-политики нет: строки создаёт только триггер выше (security
-- definer), руками из браузера профиль не заводится.
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "own profile read"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "own profile update"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
