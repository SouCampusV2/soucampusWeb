-- ============================================================
-- Черновики в портфолио — 2026-11-12.
--
-- ЗАЧЕМ. Владелец завёл 18 работ под Box SMP разом, а показывать их
-- хочет по одной, в тот же день, что и пост в Discord. Работе нужно
-- состояние «лежит в базе, но посетитель её не видит».
--
-- ПОЧЕМУ В БАЗЕ, А НЕ В КОДЕ. Таблицу projects сайт читает публичным
-- ключом, а этот ключ лежит в браузере у каждого посетителя. Политика
-- была `using (true)`: фильтр «только опубликованные» в коде сайта не
-- мешал бы прочитать черновики прямым запросом из консоли. Прячет
-- политика — тогда прочитать черновик нечем, кроме служебного ключа.
--
-- Галерея (project_images) закрывается той же формулой через родителя:
-- иначе кадры черновика читались бы отдельно от самой работы.
--
-- Старые работы: колонка приходит с default true — всё, что уже на
-- сайте, на сайте и остаётся. Черновиком строка становится только явно.
--
-- ⚠️ СРОК: ДО ДЕПЛОЯ. Новый код запрашивает is_published, а
-- getAllProjects на незнакомую колонку падает намеренно — задеплоишь
-- раньше, и портфолио не соберётся. Старый код о колонке не знает и
-- работает как раньше. Сначала preview, потом прод. Перезапускаемо.
-- ============================================================

alter table public.projects
  add column if not exists is_published boolean not null default true;

-- ------------------------------------------------------------
-- Политики чтения. Снимаем ВСЕ политики на чтение у обеих таблиц, а не
-- одну по имени: drop policy if exists "имя" молча ничего не делает,
-- если политику называли иначе (INVARIANTS.md, п. 9). Политик на запись
-- у этих таблиц нет и не появляется — пишет только служебный ключ.
-- ------------------------------------------------------------
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('projects', 'project_images')
      and cmd in ('SELECT', 'ALL')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy "public read published" on public.projects
  for select using (is_published);

-- Подзапрос к projects сам проходит через политику выше: аноним видит
-- в нём только опубликованные строки. Формула всё равно написана явно —
-- чтобы читалась без знания этой тонкости.
create policy "public read published" on public.project_images
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_images.project_id and p.is_published
    )
  );

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Проверка после прогона (только чтение, запустить отдельно):
--
--   -- Ожидается ровно две строки, обе SELECT, с is_published в формуле.
--   select tablename, policyname, cmd, qual from pg_policies
--     where schemaname = 'public' and tablename in ('projects', 'project_images');
--
--   -- Ожидается 0: до прогона сида черновиков их нет.
--   select count(*) from public.projects where not is_published;
-- ------------------------------------------------------------

insert into ops.applied_migrations (version)
values ('20261112140000_project_drafts')
on conflict (version) do nothing;
