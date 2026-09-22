# Скиллы проекта и привезённые извне

## Что здесь лежит

**Свои три** — написаны под этот проект и живут в `dev`/`master`:

| Скилл | Зачем |
|---|---|
| `design-check` | сверить правку вёрстки с `docs/DESIGN.md` |
| `structure-check` | сверить архитектуру с `CLAUDE.md` |
| `wrap-day` | конец сессии: CHANGELOG, статус, коммит |

**Остальные 25 привезены 2026-09-21 двумя заходами (15 + 10)** и существуют
ТОЛЬКО в ветке `design-lab`. Первая партия (22 скилла из
`freshtechbro/claudedesignskills` и `Owl-Listener/designer-skills`)
заменена тем же днём: результат не понравился владельцу. Она осталась в
истории git (коммит `06b7966`).

## Откуда и по какой лицензии

Отбор — по популярности (звёзды GitHub на 21.09.2026 и рейтинги
Composio, DesignRevision, Skillselion), только то, что про дизайн.

| Источник | ★ | Лицензия | Что взято |
|---|---|---|---|
| [anthropics/skills](https://github.com/anthropics/skills) | 177k | Apache-2.0 (LICENSE.txt в каждой папке) | `frontend-design`, `theme-factory`, `algorithmic-art`, `canvas-design` |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 130k | MIT (`LICENSE-ui-ux-pro-max`) | `ui-ux-pro-max` |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | 89k | MIT (`LICENSE-taste-skill`) | `taste-skill`, `gpt-tasteskill`, `soft-skill`, `minimalist-skill`, `brutalist-skill`, `redesign-skill` |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 70k | Apache-2.0 (`LICENSE-impeccable`) | `impeccable` |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | 31k | см. репозиторий | `web-design-guidelines`, `react-view-transitions`, `react-best-practices` |

### Добор, +10 (тот же день)

Второй заход — по сборникам, которых в первом не было. Акцент на
движении и полировке, раз лаборатория лендингов их и проверяет.

| Источник | ★ | Лицензия | Что взято |
|---|---|---|---|
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | 40k | MIT (`LICENSE-emilkowalski`) | `emil-design-eng`, `apple-design`, `animation-vocabulary`, `find-animation-opportunities`, `mobile-native` |
| [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | 15.5k | MIT (`LICENSE-gsap`) | `gsap-scrolltrigger`, `gsap-react` (официальные, от авторов GSAP) |
| [ibelick/ui-skills](https://github.com/ibelick/ui-skills) | 8.8k | MIT (`LICENSE-ui-skills`) | `baseline-ui`, `fixing-motion-performance` |
| [kylezantos/design-motion-principles](https://github.com/kylezantos/design-motion-principles) | 1.1k | MIT (`LICENSE-design-motion-principles`) | `design-motion-principles` |

⚠️ **Отклонены при отборе:** `CloudAI-X/threejs-skills` (★3.4k) — у
репозитория НЕТ лицензии, а без неё копировать чужой текст нельзя;
`google-labs-code/stitch-skills` — завязаны на сервис Google Stitch, а
их `taste-design` — копия `taste-skill`, который уже стоит;
`addyosmani/web-quality-skills` — про аудит Lighthouse, не про дизайн.
Все десять проверены так же: ни скриптов, ни команд; внешние ссылки —
только документация и Google Fonts в двух HTML-шаблонах
`design-motion-principles`.

⚠️ **`gsap-*` предполагают библиотеку GSAP**, которой в проекте нет.
Ставить её — решение о весе страницы (см. ниже), скилл его не отменяет.

### ⚠️ Что вырезано при установке и почему

- **`impeccable` — без папки `scripts/`.** Его лаунчер при первом запуске
  СКАЧИВАЕТ и запускает бинарник, плюс 13 500 строк JS для браузера.
  Такое не ставится в проект без отдельного решения. Остались `SKILL.md`
  и справочники `reference/`; SKILL.md при этом по-прежнему просит
  запустить скрипт — это ожидаемо, скилл сам описывает запасной путь
  («Launcher unavailable»).
- **`canvas-design` — без `canvas-fonts/`** (5.6 МБ шрифтов для
  PNG-постеров, к сайту отношения не имеют).
- **`ui-ux-pro-max` — без `scripts/tests/`.** Сами скрипты — локальный
  поиск по CSV на Python; сети касается только `validate_data.py`
  (сверка названий с Google Fonts) и только если его запустить.
- **`web-design-guidelines` при использовании ходит в сеть** за свежими
  правилами на `raw.githubusercontent.com/vercel-labs/...` — так он
  устроен, это не спрятано.

Остальное скопировано как есть, без правок.

## ⚠️ Что помнить, пользуясь ими

**Скилл — это инструкции, которым я следую.** Чужой скилл ближе к чужой
зависимости, чем к справочнику: он попадает в контекст и влияет на
решения. Поэтому перед установкой каждый был прочитан, а весь набор
проверен на то, что внутри нет ни команд, ни обращений в сеть, ни
попыток тронуть конфиги и секреты. Единственные два совпадения по
ключевым словам оказались `process.env.NODE_ENV` в примерах кода.

**Это по-прежнему не гарантия.** Обновлять их автоматически нельзя:
новая версия скилла — это новый текст, который надо читать заново.

**Правила проекта ВЫШЕ привезённых скиллов.** Там, где они спорят,
побеждает `docs/DESIGN.md` и решения владельца. Конкретно этот набор
будет спорить, и заранее известно где:

- Скиллы наперебой предлагают **новые библиотеки** (особенно
  `gpt-tasteskill` — GSAP обязателен). В проекте обратное движение: с 29.07
  Motion снимают со страниц ради веса, а 07.09 витрину вытаскивали с 65
  до 80+ баллов. **Новая анимационная библиотека — это решение о
  производительности, а не о вкусе**, и принимает его владелец.
- `react-view-transitions` — про переходы между страницами. У нас
  **свой** `PageTransition` с волной, и он заказан владельцем.
- `taste-skill`, `soft-skill`, `theme-factory` захотят перестроить
  палитру и шрифты. У проекта они уже есть в `docs/DESIGN.md`, вместе с
  причинами. Скиллы полезны как **вопросы к нашей системе**, а не как
  замена ей.
- ⛔ **Дизайн карточек товара не трогать** — три варианта отвергнуты
  владельцем 28.08 (`docs/DESIGN.md` → «Вёрстка»).

## Зачем ветка, а не `dev`

`design-lab` — лаборатория, её не закрывают и не мёржат «по дороге»
(решение владельца 2026-09-21, ранее записано в `docs/IDEAS.md` как
«прогнать дизайн отдельной веткой»). Здесь можно пробовать анимации,
появления и раскладки, ничего не ломая на проде. В `dev` уезжает
**только то, что владелец посмотрел и одобрил**, — отдельным решением и
отдельным коммитом.
