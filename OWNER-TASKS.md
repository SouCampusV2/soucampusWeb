# Задачи владельца — то, что кодом не закрывается

Здесь — переписка, настройки чужих панелей, миграции, VPS и решения, которые
принимает человек. Что проверяют **глазами на сайте** — в `TEMP.md`.

**Как отмечать:** `- [x]` сделано, комментарий прямо в строке. Сделанное
переносится в «Закрытые» одной строкой с датой.

Сокращён 28.11: в «Ждут действия» висели живые платежи, сканер и аудит,
закрытые 24.11. Полный прежний текст со всеми шагами (Stripe по шагам,
таблица миграций аудита, сканер) — [`docs/archive/OWNER-TASKS-2026-09-to-11.md`](docs/archive/OWNER-TASKS-2026-09-to-11.md).

**«не подтверждено»** — я не знаю, сделано ли. Сделано — скажи, перенесу.

---

## 🔴 Ждут действия

### 1. Две миграции от 24.11 ⬅ блокирует заявки в креаторы

- [ ] `supabase/migrations/20261124130000_fix_application_notify.sql` — на
      обеих базах, порядок любой. Без неё **каждая** заявка в креаторы
      откатывается («Could not send the application»). Проверка: обычным
      аккаунтом подать заявку на `/resources`.
- [ ] `supabase/migrations/20261124120000_product_buy_url.sql` — сначала
      preview, потом прод. Код «Buy on BuiltByBit» на прод только после неё:
      без колонки запись ссылки падает.
- [ ] Сказать мне — выкачу на прод. Проверка: в правке карты поле
      «BuiltByBit page», ссылка `https://builtbybit.com/...` → на странице
      карты кнопка «Buy on BuiltByBit», оплата на сайте отказывает.

### 2. Хвосты аудита на сайте

- [ ] Привязать приложение-аутентификатор **на проде** (`/admin/security`):
      базы разные, привязка с preview не переезжает.
- [ ] Vercel: `VIEW_HASH_SALT` — разные значения для Production и Preview
      (находка X-02). Не подтверждено.
- [ ] `node scripts/sweep-pending.mjs --prod` — остались ли в публичных
      бакетах прода старые непроверенные загрузки; потом то же с `--delete`.
      Не подтверждено.

### 3. Бот на VPS ⬅ правки аудита живут только в ветке `dev` репозитория `botds`

- [ ] На VPS в `/home/deploy/bocampus/.env`: `GUILD_ID` (или
      `SITE_BRIDGE_GUILDS`) — иначе мост на сайт открыт любому серверу, куда
      добавят бота.
- [ ] Там же `SITE_BRIDGE_URL=https://soucampus.online/api/discord/bridge` и
      `SITE_BRIDGE_SECRET=<секрет, тот же, что DISCORD_BRIDGE_SECRET в Vercel>`.
      Накопленное в очереди бота уйдёт само.
- [ ] Developer Portal → Bot → **Public Bot** — выключить.
- [ ] `/setup view`: в ролях менеджера — Commission Team, модератора отдельного
      заказа там быть не должно (менеджер видит все заказы).
- [ ] Мёрж `dev` → `master` бота и `docker compose up -d` на VPS.
- [ ] Решить: **сколько хранятся записи заказов в базе бота** (B-03). Пока на
      `/privacy#discord` — без числа. Решишь — впишу. Туда же бэкап базы
      бота вне VPS.

### 4. Discord: настройка и публикации

- [ ] `/setup announcements_channel #канал` → ссылка → Vercel (Preview и
      Production) `DISCORD_ANNOUNCE_WEBHOOK_URL` → Redeploy. Проверка: одно
      объявление «Discord only» — эмбед с оранжевой плашкой.
- [ ] `/setup showcase_reactions emojis:…` — реакции под постами витрины.
- [ ] `/setup links terms:https://soucampus.online/terms/discord
      privacy:https://soucampus.online/privacy#discord`, потом `/setup panel`.
- [ ] Проверка витрины: `/admin/products` → Post to Discord → Publish →
      плашка нужного цвета → Update → Remove.
- [ ] Отзыв на бесплатную карту аккаунтом, который её не скачивал → отзыв под
      картой.
- [ ] Тексты: анонс «What's new, what's next»
      (`botds/docs/announcements/2026-10-27-whats-new.md`, через Discohook);
      закреплённый пост #portfolio — 5% и строка про 15% за друзей
      (`botds/scripts/edit-channel-posts.sh`); сообщение заказчикам про
      заказы через Discord; пост Redspire — канал `<#1232357370630508675>`.

### 5. НДС на цифровые товары — к бухгалтеру

- [ ] Нужен ли НДС физлицу в Эстонии при продаже карт покупателям из ЕС, с
      какой суммы, влияет ли на цену (`docs/BUSINESS.md` § 10.3). Платежи
      уже живые, поэтому вопрос не «до», а «как можно скорее». Не
      подтверждено.

### 6. Телеграм-отчёт не доходит — двух секретов нет

- [ ] ⚠️ **Перевыпустить токен бота** у @BotFather: старый лежал открытым
      текстом в промпте routine и в переписке.
- [ ] GitHub → Settings → Secrets and variables → Actions:
      `TELEGRAM_BOT_TOKEN` (новый) и `TELEGRAM_CHAT_ID` = `1092351768`.
- [ ] Проверить: Actions → «Send weekly report to Telegram» → Run workflow.
- [ ] Выключить диагностическую routine «Telegram heartbeat» на
      https://claude.ai/code/routines (еженедельную **не трогать**).

### 7. Hostinger — два вопроса в поддержку

Письма сайта идут через их SMTP; подтверждение и сброс пароля — единственный
путь человека в аккаунт.

- [ ] Что происходит после суточной тысячи писем — **ошибка SMTP или тихая
      пропажа**?
- [ ] SMTP из приложения считается **отдельно** от веб-почты или лимит общий?

### 8. Supabase → Authentication → URL Configuration, обе базы

Supabase при несовпадении адреса **молча** подставляет Site URL.

- [ ] Маска `/auth/callback**` со звёздочками.
- [ ] `http://localhost:3000/auth/callback` и `http://localhost:3001/auth/callback`.
- [ ] В preview-проекте:
      `https://soucampus-builds-git-dev-sou-campus.vercel.app/auth/callback**`.

### 9. Vercel: место под деплои (75% от 10 ГБ, письмо 06.09)

Это накопленные деплои, не трафик: каждый пуш в `dev` хранит сборку с
`public/` целиком.

- [ ] Сейчас: Vercel → Deployments → удалить старые preview.
- [ ] По-настоящему — задача на код: увести `public/portfolio` в Supabase
      Storage. Скажи, когда браться.

### 10. Настоящие прод-ключи в `.env.local`

Сейчас обе пары ведут в preview, поэтому `check:guards --prod` и
`check:limits --prod` прод не проверяют (скрипт отказывается, а не врёт).

- [ ] Без суффикса — прод `pogwmoyrpaxxwkwhzjcv`, с `_PREVIEW` — preview
      `gmspmvnrzavxcbiqlhob`. ⚠️ Тогда и `npm run dev` пойдёт в прод — держать
      прод-пару только на время прогона.

### 11. Пересчитать заказы и заказчиков

На главной 246+ вписано руками. Идея — `docs/IDEAS.md` → «Цифры о студии».

- [ ] Собрать историю Discord, выписки PayPal, свои записи → скинуть Claude:
      посчитает проекты и отдельно заказчиков.
- [ ] Новое число — в `stats` (строка `orders`).

### 12. Сканер: свой системный пользователь (не срочно)

- [ ] У сканера нет отдельного пользователя на VPS (у `deploy` нет sudo).
      Контейнер и так без прав, `.env` закрыт; при случае — завести.

---

## 🟢 Закрытые

Подробности до 28.11 — в архивном снимке.

- **24.11 — живые платежи Stripe.** `rk_live_`, вебхук на три события
  (`checkout.session.completed`, `charge.refunded`, `charge.dispute.created`),
  2FA в Stripe, Branding, чеки; контрольная покупка €3 и возврат; Hollow Wharf
  продаётся; пост в What's new вышел.
- **24.11 — демо-карты без файлов и `TestProd`** сняты на обеих базах.
- **24.11 — письмо о покупке:** `SMTP_*` в Vercel на Production и Preview.
- **24.11 — отзывы Jorge и Zhyrr, тире в отзывах:** оба SQL на обеих базах.
- **24.11 — аудит на прод:** preview пройден, все 9 миграций на обеих базах,
  мёрж `49c93cd`.
- **24.11 — сканер подключён:** `SCANNER_URL`/`SCANNER_SECRET` в Vercel,
  файрвол, перезагрузка VPS. `map-scan.ts` оставлен вторым замком.
- **24.11 — загрузка картинок через `sharp` на Vercel** работает (карты и
  аватары на проде).
- **27.10 — миграция `20261027140000_discord_post_channel`** на обеих базах;
  вебхуки витрины в Vercel (подтверждено 24.11).
- **26.10 — мост с ботом на проде** (`9756c73`); миграции профиля и отзывов
  с текстом на обеих базах.
- **04.10 — `download_events`** на обеих базах, мёрж `0ab02ac`.
- **06.09 — `map_types_multi` и `username_cooldown_14_days`** на обеих базах.
- **25.08 — лимиты Supabase Auth** ниже тысячи Hostinger (сверено по проду
  27.09); Google Cloud Console настроен.
- **22.08 — `is_creator` снят с `soucampustest`** на проде.
