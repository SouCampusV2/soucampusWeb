# Stripe — настройка аккаунта и аудит перед живыми платежами

Заведено 2026-09-25, когда владелец начал подключать живой Stripe. Здесь две
части: **решения по аккаунту** (записаны дословно, как их принял владелец —
поэтому по-английски) и **аудит кода** с находками и предложенными правками.

⚠️ **Ключей, секретов и id аккаунта в этом файле нет и быть не должно.** Имена
переменных окружения — можно, значения — никогда.

Пошаговый чек-лист включения (активация, способы оплаты, ключи в Vercel,
вебхук, контрольная покупка) — [`OWNER-TASKS.md`](../OWNER-TASKS.md), пункт 7.
Этот файл — справка «что решено и почему» и список того, что чинить.

---

## Часть 1. Решения по аккаунту (дословно)

### Business category
- Stripe category: Digital products → Other digital goods
- Reason: we sell downloadable Minecraft builds (schematics, maps, world
  files). "Games" was avoided as the business category because it implies
  selling a game or in-game currency and triggers stricter risk review.

### Business description (as submitted to Stripe)
"SouCampus is an online marketplace for premium Minecraft builds. Customers
buy and instantly download digital files (schematics, maps and world files)
to use in their own Minecraft servers and projects. All products are
digital; no physical goods are shipped."

Notes:
- Custom build commissions are NOT processed through Stripe; they are paid
  separately via PayPal. If commissions move to Stripe later, the business
  description must be updated in Stripe (Settings → Business details).
- If third-party creators start selling on the platform, add to the
  description: "Independent creators can list their builds on the platform,
  and SouCampus takes a commission on each sale." That change also requires
  Stripe Connect.

### Fees (standard EU/Estonia rates — verify at stripe.com/en-ee/pricing)
- EEA cards: 1.5% + €0.25
- UK cards: 2.5% + €0.25
- International cards: 3.25% + €0.25
- Currency conversion: +2%

Notes: most customers are outside the EU, so expect ~3.25% + €0.25, or
~5.25% + €0.25 when conversion applies. The fixed €0.25 matters a lot for
cheap items. Pricing in EUR, or adding a USD payout account, avoids the
conversion fee. Stripe Connect (if used later) has its own additional fees.

### Statement descriptors
- Statement descriptor: SOUCAMPUS.ONLINE
- Shortened descriptor: SOUCAMPUS
- Purpose: customers recognise the charge on their bank statement, which
  reduces disputes and chargebacks. Per-product descriptors appear as
  "SOUCAMPUS* <product>".

### Fraud protection (Stripe Radar)
- Paid Radar tiers are NOT enabled yet.
- Plan: enable Radar Standard (€0.05 per screened transaction) once regular
  sales start, after the first dispute/chargeback, or immediately if card
  testing is detected (many small failed payments in a row).
- Plus/Pro are not needed until there is enough fraud data to write custom
  rules.
- Free measures to keep in place: 3D Secure on risky payments (Stripe
  Checkout handles this), purchases only by logged-in users with verified
  email, and logging download evidence (who downloaded which build, when)
  to help win disputes.

### Tax (Stripe Tax)
- Product tax category: Video Games – downloaded – non subscription – with
  permanent rights (builds are one-time purchases of game content, kept
  forever). If a subscription product is added later, use
  "Video Games – downloaded – subscription – with conditional rights".
- Currently only free threshold monitoring is used; no tax registrations
  added yet, so no tax is being collected.
- Known thresholds to watch: Estonia VAT registration at €40,000 annual
  turnover; EU cross-border B2C digital sales over €10,000/year require
  charging the customer's country VAT (register via OSS); UK has NO
  threshold for non-UK sellers of digital goods; US states generally
  ~$100,000 in sales.
- Alternative to consider: a merchant of record (Paddle, Lemon Squeezy)
  handles all sales taxes worldwide for a higher fee.

### Open items
- Decide whether/when to enable Stripe Connect (Express vs Standard) for
  third-party sellers.
- Decide on EUR vs USD pricing and whether to add a USD payout account.
- Ask an Estonian accountant about VAT for my business form (UK and the
  €10,000 EU threshold in particular).

---

## Часть 2. Аудит кода — 25.09, только чтение

Код, политики базы и переменные окружения **не менялись**. Каждая находка —
с путём и предложенной правкой; правки делаются только после решения
владельца.

### Going live checklist

- [x] **Ключи — только из переменных окружения.** Код читает ровно две:
      `STRIPE_SECRET_KEY` (`src/lib/stripe.ts`) и `STRIPE_WEBHOOK_SECRET`
      (`src/app/api/stripe/webhook/route.ts`). Публичный ключ (`pk_…`) не
      нужен вовсе: оплата — редирект на Stripe Checkout, форм Stripe на
      нашей странице нет. `getStripe()` падает с ошибкой, если его позвать
      в браузере. **Что сделать:** в Vercel live-ключ и live-секрет вебхука
      — только в Production, в Preview остаются тестовые.
- [x] **Живой вебхук — отдельный,** его `whsec_…` другой, лежит в той же
      `STRIPE_WEBHOOK_SECRET`. Код слушает одно событие —
      `checkout.session.completed`.
- [x] **Id цен (`price_…`) не захардкожены.** Checkout строит строки через
      `price_data` из цены карты в нашей базе
      (`src/app/api/checkout/route.ts`, ~стр. 102). Переход test → live
      цены не ломает. Цены в `PricingSection.tsx` — текст тарифов, в Stripe
      не уходят.
- [x] **Секреты не утекают.** `.env*` в `.gitignore` (кроме
      `.env.example`); история git проверена поиском `sk_live`, `sk_test_`,
      `whsec_` и JWT-подобных строк — ноль совпадений. `NEXT_PUBLIC_*` в
      коде только две: адрес Supabase и анонимный ключ — оба публичные по
      замыслу.
- [x] **`automatic_tax` в Checkout не включён** (нигде в коде). Так и
      должно быть, пока в Stripe нет налоговых регистраций. Включается
      одной строкой в `checkout.sessions.create`, но **только после**
      регистраций.
- ⚠️ **Способы оплаты в коде не заданы** — Checkout берёт их из настроек
      Dashboard. Вебхук и страница успеха засчитывают заказ, только если
      сессия уже `paid` (`src/lib/orders.ts`). **Отложенные способы (SEPA
      Direct Debit и т. п.) в live не включать:** человек заплатит, заказ
      не запишется — событие `checkout.session.async_payment_succeeded`
      код не слушает. Подробно — `OWNER-TASKS.md`, пункт 7, шаг 2.

### Payments security

- [x] **Подпись вебхука проверяется на каждом запросе**
      (`constructEvent`, при несовпадении — 400 без подробностей).
- [x] **Доступ к карте — только по подтверждённой оплате.** Заказ пишется
      из вебхука, а страница успеха (`marketplace/success/page.tsx`) не
      верит редиректу: она сама спрашивает сессию у Stripe по API и пишет
      заказ, только если `payment_status = paid`. Повтор одной сессии не
      создаёт второй заказ (уникальный `stripe_session_id`).
- [x] **Файлы карт — по подписанным ссылкам на час**
      (`DOWNLOAD_URL_TTL_SECONDS` в `src/lib/orders.ts`), бакет закрытый,
      ссылки выдаются только по своим заказам (по `user_id` или по почте
      гостевого заказа).
- [x] **Данных карт у нас нет и не было:** ввод карты — на домене Stripe.
- 🔴 **Доказательств скачивания нет.** В решениях выше это записано как
      мера, которая «должна быть на месте», но скачивания не журналируются
      нигде: ссылка выдаётся, факт не записывается. **Правка:** таблица
      `download_events` (кто, какая карта, когда, хэш IP) под RLS, запись в
      момент выдачи ссылки на сервере. Нужна к первому спору о списании.

### Legal pages & policies

- 🔴 **Отказа от права на отзыв (14 дней) при оплате нет.** Ни в корзине
      (`src/app/(site)/cart/page.tsx`), ни в Checkout нет ни галочки, ни
      текста. Без явного согласия на немедленную выдачу и подтверждения
      потери права на отзыв покупатель из ЕС сохраняет 14 дней на возврат
      даже после скачивания. **Правка (платёжный код — после решения):**
      в `checkout.sessions.create` — `consent_collection: { terms_of_service:
      "required" }` и `custom_text.terms_of_service_acceptance` с текстом
      отказа; адрес Terms указать в Stripe → Settings → Public details. Плюс
      та же формулировка в `/terms`.
- 🔴 **Политики возврата нет вовсе,** `/terms` — наполовину заглушка под
      `noindex` (`src/app/(site)/terms/page.tsx`: `robots: { index: false }`).
      Stripe ждёт публичные условия и политику возврата. **Правка:**
      дописать `/terms` (лицензия уже есть — wiki «Using a map you bought»;
      нужен раздел Refunds со словами владельца) и снять `noindex`.
- 🟡 **Данные продавца неполные.** Имя оператора есть только на
      `/privacy` («Yevhenii Stavytskyi, an individual based in Estonia»);
      почта — там же и в вики. Для продавца в ЕС нужны имя, **географический
      адрес** и почта в легкодоступном месте. Адреса нет нигде. **Правка:**
      блок «Seller» на `/terms` + почта в футере.
- 🟡 **Ссылок на условия у кнопки оплаты нет.** В футере есть Terms и
      Privacy, в корзине — нет. Закрывается той же правкой с
      `consent_collection` (Stripe сам покажет ссылку) и строкой под кнопкой
      Checkout.
- [x] **Политика конфиденциальности есть** (`/privacy`, индексируется):
      кто оператор, что собираем, обработчики, сроки, права, как просить
      удаление.
- 🟡 **Cookie-баннера нет — сознательно, но довод стоит проверить.** Что
      ставит сайт:
      - cookie сессии Supabase — необходимые (вход);
      - `scv_visitor` — подписанный id посетителя для подсчёта уникальных
        просмотров, httpOnly, первая сторона
        (`src/app/api/view/route.ts`);
      - cookie «имя выбрано» — удобство, прав не даёт (`src/proxy.ts`);
      - `localStorage`: тема, корзина — функциональные;
      - Vercel Analytics — без cookie; других сторонних скриптов нет,
        шрифты свои (`next/font`).

      `/privacy` объясняет отсутствие баннера исключением для измерения
      собственной аудитории. Это исключение признают не все регуляторы
      одинаково — **вопрос к тому же бухгалтеру/юристу**, что и НДС. Если
      нет — либо баннер, либо считать просмотры без cookie.

### Data minimisation (GDPR)

| Где | Что | Нужно? |
|---|---|---|
| Supabase Auth | почта, хэш пароля, метаданные входа Google | да — вход |
| `profiles` | username, имя и фамилия, bio, аватар, цвет ника, флаги прав | да; имя/фамилия/bio — по желанию человека |
| `orders` | почта покупателя, `user_id`, сумма, валюта, id сессии Stripe | да — доступ к покупкам и бухгалтерия |
| `order_items` | карта, название-снимок, цена | да |
| `page_views` | id посетителя из cookie, **хэш** IP (сам IP не хранится), страница, день | да, пока есть счётчик; можно чистить старше N месяцев |
| `ops.rate_events` | кто и когда делал действие (для лимитов) | да; хранить коротко — окно лимита максимум час |
| `product_comments`, `product_reactions`, `product_ratings` | текст, оценки, `user_id` | да |
| `notifications` | текст и ссылка, `user_id` | да |
| `creator_applications` | ссылки на портфолио, Discord | да, пока идёт заявка; креаторство заморожено |
| `moderation_log` | действия админа | да |

- 🟡 **Сроков хранения в коде нет:** `page_views` и `ops.rate_events`
      растут бесконечно. **Правка:** уборка по расписанию (у `rate_events`
      всё старше суток бесполезно). Срок для заказов — вопрос бухгалтеру.
- [x] **Логи не пишут почту, токены, пароли и тела запросов.** В
      `console.error` уходят тексты ошибок базы; в одном месте — id сессии
      Stripe (`marketplace/success/page.tsx`), это не персональные данные.
- 🟡 **Удалить аккаунт самому нельзя** — ни кнопки, ни обработчика. `/privacy`
      обещает удаление по письму; это законно, если ответ приходит в срок
      (месяц), но процедуры нет нигде. **Правка:** описать процедуру (что
      удаляется, что остаётся для бухгалтерии) и позже — кнопку в
      `/settings` через свой обработчик.

### Authentication & access

- 🔴 **Лимиты входа, регистрации и сброса пароля — настройки Supabase,
      не код.** Висит у владельца (`CLAUDE.md` → «Ограничения частоты — вход,
      пароль»). Dashboard → Authentication → Rate Limits.
- 🟡 **Подтверждение почты и правила пароля** — тоже в Dashboard
      (Authentication → Providers → Email). Из кода не проверить; сверить
      руками. От этого зависит «покупки только с подтверждённой почтой» из
      решений выше: код требует входа, но подтверждение почты задаёт Supabase.
- 🟡 **MFA нет нигде,** в том числе у админа. План и оговорка про резервные
      коды — `CLAUDE.md`, «2FA — только TOTP».
- [x] **RLS включена на всех 19 таблицах** (`public` и `ops`), проверено по
      миграциям; отказы «этого записать нельзя» проверяет `npm run
      check:guards` (48 проверок). Из браузера в базу с 21.09 не пишет
      ничего, кроме шести колонок профиля.
- [x] **Служебный ключ — только на сервере.** `supabase-admin.ts`
      импортируют только серверные модули (один клиентский файл упоминает
      его в комментарии). В бандл не попадает.
- [x] **Server actions:** их две. `markNameClaimed` ставит cookie
      удобства, прав не даёт (разбор в `CLAUDE.md`, 25.08).
      `revalidateProfile` ничего не проверяет — худшее, что можно, это
      сбросить кэш чужого профиля. 🟢 Низкий риск, записан.

### General

- 🔴 **`npm audit`: 1 критическая, 4 высоких, 29 средних** (только
      продакшен-зависимости). Все исправляются **без смены мажорной
      версии**:
      - **`next` 16.2.10 → 16.3.6 — критическая:** обход Proxy в App Router
        с Turbopack. У нас `src/proxy.ts` стережёт `/admin`; права проверяют
        ещё layout админки и каждый `/api/admin/*`, поэтому админку это не
        открывает, но обновить — первым делом. Заодно закрывает `postcss`
        и `sharp`.
      - `@tiptap/*` (редактор описаний карт) — высокая, `__proto__` в
        `mergeAttributes`; `sanitize-html` — средняя, XSS через SVG. Наш
        санитайзер SVG не пропускает, но обновление дешёвое.
      - `nanoid`, `baseline-browser-mapping` — транзитивные.

      **Правка:** `npm i next@16.3.6` + `npm audit fix` (без `--force`),
      тесты, сборка, preview.
- 🟡 **Заголовки безопасности:** на проде есть только
      `Strict-Transport-Security`. Нет `X-Content-Type-Options`,
      `Referrer-Policy`, `X-Frame-Options`/`frame-ancestors`,
      `Permissions-Policy`, `Content-Security-Policy`. **Правка:**
      `headers()` в `next.config.ts` — первые четыре сразу, CSP сначала в
      режиме `Report-Only` (у сайта инлайн-скрипт темы и картинки из
      Storage).
