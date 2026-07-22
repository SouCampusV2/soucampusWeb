# Структура данных и архитектура портфолио

Дизайн-документ по будущей схеме Supabase и по вопросу "нужны ли разные варианты отображения карточки/страницы проекта". `CLAUDE.md` — план и статус проекта, здесь — только предметная проработка структуры данных, чтобы не раздувать план. Спроектировано 2026-07-20 (запрошено на модели Fable через `Agent(model: "fable")`) на основе кода, актуального на тот момент (`src/lib/projects.ts`, `PortfolioHero.tsx`, `portfolio/page.tsx`, `[slug]/page.tsx`). **Статус (2026-07-22): реализовано** — таблицы созданы (`supabase/migrations/`), сайт живёт на БД через `getAllProjects`/`getProject` и аналоги. Актуальная схема — в миграциях; этот файл остаётся как обоснование решений. Единственное расхождение с текстом ниже: у `stats` колонки `color`/`bar` заменены на смысловой `accent` (миграция `20260720190000_stats_accent.sql`) — см. пометку в §3.

## 1. Таблица `projects` — финальная схема

Черновик, который раньше лежал в `CLAUDE.md`, уточнён в нескольких местах.

### Что изменено относительно самого первого черновика и почему

1. **`tag` — `text`, не Postgres `enum`.** Сейчас 5 значений (`Order`, `Personal project`, `Trial work`, `Team project`, `RPG map`), но это ярлык для человека, не структурная категория. `enum` требует `ALTER TYPE ... ADD VALUE` при каждом новом слове — миграция схемы ради переименования ярлыка, то самое избыточное усложнение. Если позже понадобится фильтровать по тегам программно — решается `CHECK`-ограничением или отдельной справочной таблицей, не раньше реальной потребности.
2. **`price_label` — обязательное поле всегда, не только фоллбэк при `price_amount IS NULL`.** UI печатает готовую строку "€150" один в один — держать готовую display-версию проще, чем форматировать число в валюту на фронтенде каждый раз.
3. **Добавлен `sort_order` (integer, nullable).** SQL-таблица не хранит "естественный порядок массива" — без явной колонки нечем будет управлять порядком карточек/карусели из будущей админки.
4. **Добавлен `is_featured` (boolean, default `false`)** вместо неявного "первые 5 по порядку = карусель". Иначе изменение порядка сетки случайно меняет состав карусели — это два разных решения, которые не должны зависеть друг от друга.
5. **`size_label`/`deadline_label` — обязательные текстовые поля**, `size_x`/`size_z`/`deadline_days` — числовые и nullable, на будущее (сортировка/фильтр "покажи самые крупные постройки"), но не единственный источник отображаемой строки — тот же принцип, что и с ценой.
6. **`id` (uuid) отдельно от `slug` (text, unique)** — `id` стабилен даже если slug однажды переименуют в админке, `slug` — то, что видно в URL и что уже сегодня использует `getProject(slug)`.

### SQL

```sql
create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,           -- URL-адрес: /portfolio/[slug]
  title         text not null,
  tag           text not null,                  -- ярлык-строка, не enum (см. п.1)
  summary       text not null,                  -- короткий текст для карточки/карусели
  description   text not null,                  -- длинный текст для детальной страницы

  image_url     text not null,                  -- главное фото (Supabase Storage URL)

  price_amount    numeric,                      -- null для "trial"/"personal project"/"team project"
  price_currency  text default 'EUR',
  price_label     text not null,                -- всегда есть: "€150", "trial", "team project"

  size_label    text not null,                  -- всегда есть: "250×250"
  size_x        numeric,                        -- в блоках, nullable — для будущей сортировки/фильтра
  size_z        numeric,

  deadline_label  text not null,                -- всегда есть: "1 week"
  deadline_days   numeric,                      -- nullable — для будущей сортировки/фильтра

  is_featured   boolean not null default false, -- попадает ли в hero-карусель
  sort_order    integer,                        -- порядок внутри своей группы (карусель/сетка)

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index projects_slug_idx on public.projects (slug);
```

### `project_images` (галерея)

Отдельная таблица вместо JSON-массива — переменное число строк со своим порядком, а не одно скалярное значение. `on delete cascade` — как автоматическое освобождение дочерних объектов при удалении родителя (composition: проект *владеет* своими фото).

```sql
create table public.project_images (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  url         text not null,
  position    integer not null default 0,   -- порядок в галерее
  created_at  timestamptz not null default now()
);

create index project_images_project_id_idx on public.project_images (project_id, position);
```

## 2. Разные layout'ы карточки/детальной страницы — решение

**Не вводить `layout`/`template`-колонку сейчас.** Все 16 текущих проектов рендерятся сегодня одинаково — нет ни одного, который *хочет* другой layout. Колонка-переключатель с одним фактическим значением на все строки — классический признак преждевременной абстракции.

Цена ошибки в другую сторону низкая: добавить `layout text default 'default'` потом — одна `ALTER TABLE ADD COLUMN` с дефолтом, без бэкфилла существующих строк.

Настоящая гибкость, которая реально нужна уже сегодня — не "разные шаблоны страницы", а "не у всех проектов есть все поля" (например `price: "trial"` вместо суммы). Это уже частично реализовано: `{project.gallery && project.gallery.length > 0 && (...)}` в `[slug]/page.tsx` рендерит блок галереи только если она есть. Держаться этого паттерна — **один layout, часть блоков опциональна по данным** — вместо `if (layout === 'x') return <LayoutX />` для каждого нового поля.

Когда реально накопится 2-3 проекта с принципиально другой структурой страницы (не просто отсутствие одного поля, а другой порядок/другие блоки) — тогда добавляется `layout`-колонка, а в компоненте — обычная ветка по значению (`switch (project.layout) { case 'video': ...; default: ... }`), концептуально то же самое, что полиморфизм через ветвление по типу вместо отдельных классов — на масштабе одной страницы это нормально и не требует системы шаблонов.

## 3. `reviews` и `stats` — схема (кратко)

Обе уже "table-shaped" в коде (`src/lib/reviews.ts`, `Stats.tsx`) — перенос формы 1-в-1, без изменения домена.

```sql
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,   -- URL: /reviews/[slug]
  name        text not null,
  role        text not null,
  flag        text not null,          -- эмодзи-флаг, как сейчас; позже можно заменить на country_code
  review_text text not null,          -- "text" — зарезервированное по смыслу имя, лучше не путать
  accent      text not null default 'orange' check (accent in ('orange', 'lime')),
  sort_order  integer,
  created_at  timestamptz not null default now()
);

create table public.stats (
  id          text primary key,        -- "orders"/"reach"/"clients" — тот же id, что и сейчас в массиве
  label       text not null,
  value       numeric not null,
  suffix      text not null default '',
  -- ⚠️ Устарело: в реализованной схеме color/bar заменены на одну колонку
  -- accent text check (accent in ('orange','lime','blue')) — конкретные
  -- tailwind-классы вернулись в Stats.tsx, потому что это вопрос дизайна,
  -- а не данных. См. миграцию 20260720190000_stats_accent.sql.
  color       text not null,           -- tailwind-класс, как сейчас ("text-orange-400")
  bar         text not null,           -- tailwind-класс ("bg-orange-400")
  updated_at  timestamptz not null default now()
);
```

`accent` — тот же случай, что и `tag` в `projects`: `text` + `CHECK` вместо `enum`, потому что значений мало и стабильно, а `CHECK` дешевле менять. `stats.id` — сознательно текстовый первичный ключ, не uuid: это константный список из трёх строк, редактируемых вручную, а не создаваемых программно — играет роль "ключа настройки", как строковый ключ в конфиге.

## 4. Миграция: локальный массив → Supabase

Ключевая идея — держаться уже существующей границы: **`getProject(slug)` уже единственная точка, через которую компоненты трогают данные проекта.** Как интерфейс в ООП — вызывающий код общается с контрактом ("дай мне проект по slug"), а не с конкретной реализацией. Миграция — замена *реализации* функции, а не переписывание всех мест, где она вызывается.

Сегодня:

```ts
export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}
```

После:

```ts
export async function getProject(slug: string) {
  const { data } = await supabase
    .from("projects")
    .select("*, project_images(*)")
    .eq("slug", slug)
    .single();
  return data;
}
```

Название функции и файл не меняются — меняется только то, что внутри.

### Что реально нужно тронуть

Главное отличие: `.find()` в массиве — синхронная операция (мгновенная, в памяти), запрос к Supabase — асинхронная (сеть, БД). Любое место, которое сегодня зовёт `getProject`/`projects` синхронно, должно стать `async`/дождаться `await`.

- **`src/app/(site)/portfolio/[slug]/page.tsx`** — уже частично готов: `ProjectPage` уже `async`. Добавить `await` перед `getProject(slug)`. `generateStaticParams()` — сегодня синхронная, нужно сделать `async` и заменить на запрос списка всех `slug` (Next.js поддерживает `async generateStaticParams` нативно). `generateMetadata` уже `async` — там просто не хватает `await` перед вызовом.
- **`src/app/(site)/portfolio/page.tsx`** — сегодня не `async`, читает `projects` напрямую. Нужно сделать `async function PortfolioPage()` и получать список через новую функцию `getAllProjects()` с `await`. Компонент серверный (без `"use client"`) — асинхронные Server Components в App Router поддерживаются "из коробки".
- **`src/components/PortfolioHero.tsx`** — клиентский компонент (`"use client"`), принимает готовый `projects: Project[]` через пропс — трогать не нужно. Данные приходят уже загруженными сверху, из `portfolio/page.tsx`. Граница "серверная страница один раз получает данные, дочерние клиентские компоненты просто их рисуют" уже правильная — асинхронность БД не просачивается туда, где в ней нет нужды.
- **`src/lib/projects.ts`** — здесь появится `getAllProjects()`, чтобы прямой импорт сырого массива не был размазан по нескольким местам (`portfolio/page.tsx`, `[slug]/page.tsx`'s `generateStaticParams`, `RecentProjects.tsx`) — все обращения идут через `getProject(slug)` и `getAllProjects()`.
- **`src/lib/reviews.ts`** и `src/app/(site)/reviews/[slug]/page.tsx` — тот же паттерн, что и у портфолио: `getReview(slug)` уже единственная точка доступа, миграция аналогична.

### Порядок действий при реальной миграции

1. Создать таблицы в Supabase по схеме из раздела 1/3.
2. Разово перенести существующие строки (INSERT-скрипт или вручную через Table Editor — их немного).
3. Переписать `getProject`/добавить `getAllProjects` в `projects.ts` (аналогично для `reviews.ts`) — заменить `.find()`/прямой доступ к массиву на Supabase-запросы.
4. Пройтись по местам выше, сделать их `async`, добавить `await`.
5. `Project`/`Review` тип — привести в соответствие с формой строки из БД (`image` → `image_url`, `gallery?: string[]` → `project_images: {url, position}[]`) — один разовый рефакторинг типа, не постепенный.

## 5. RLS — что важно сейчас, что нет

Коротко, потому что сегодня нет админки и нет пользовательской авторизации — все данные публичные и только для чтения.

- **Нужно сделать при создании таблиц:** включить RLS на всех таблицах и сразу дать политику публичного чтения:
  ```sql
  alter table public.projects enable row level security;
  create policy "public read" on public.projects for select using (true);
  ```
  (аналогично для `project_images`, `reviews`, `stats`). Причина делать это сразу: Supabase по умолчанию блокирует anon-доступ, если RLS включён без политик — сайт с самого начала мог бы просто не получать данные. Не включать RLS вообще — тоже плохая отправная точка, таблица по умолчанию открыта без ограничений.
- **Не нужно делать сейчас:** политики на `insert`/`update`/`delete` — есть смысл писать только когда появится реальный субъект действия (админ через Supabase Auth в Этапе 3, покупатель в Этапе 4). Писать write-политики под несуществующего пользователя — гадать вслепую, почти наверняка придётся переписывать.
- **На будущее (Этап 3):** write-доступ разумнее давать через service-role ключ на серверной стороне (Server Actions/API routes), защищённый проверкой сессии Supabase Auth на уровне приложения — RLS становится вторым рубежом защиты, не единственным. Стандартный паттерн для Supabase-проектов с собственной админкой, решать подробнее при подходе к Этапу 3.
