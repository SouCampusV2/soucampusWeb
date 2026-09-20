// Проверка адаптива: не вылезает ли что-нибудь за край экрана.
// 2026-09-20. Запуск: npm run check:responsive
//
// ------------------------------------------------------------
// Зачем скрипт, а не «посмотреть глазами»
// ------------------------------------------------------------
// 20 июля прошли адаптив руками, и он держался ровно до следующего
// экрана: кабинет, загрузка карты, витрина с фильтрами появились позже
// и в проход не попали. Проверка, которую делают раз в два месяца, не
// защищает ничего — тот же довод, по которому лимиты частоты стали
// `npm run check:limits`, а запреты базы `npm run check:guards`.
//
// ------------------------------------------------------------
// ⚠️ ЧТО ЭТОТ СКРИПТ НЕ ПРОВЕРЯЕТ, И ПОЧЕМУ ОБ ЭТОМ НАПИСАНО ЗДЕСЬ
// ------------------------------------------------------------
// РАЗМЕР ЗОН НАЖАТИЯ — НЕТ. Половина кнопок сайта растёт по
// `pointer-coarse:`, то есть по типу указателя, а не по ширине экрана
// (урок 26.08: на тач-экране hover не наступает никогда). Playwright
// умеет эмулировать тач-события, но НЕ медиа-признак `pointer: coarse`
// в Firefox — значит скрипт мерил бы размеры для мыши и ругался бы на
// кнопки, которые на телефоне давно крупные.
//
// Проверка, которая врёт в известную сторону, хуже отсутствующей:
// её ответы начинают пролистывать, а вместе с ними и настоящие. Поэтому
// зоны нажатия остаются ручной проверкой (TEMP.md), а здесь — только то,
// что меряется честно: геометрия.
//
// ⚠️ И ещё одно: скрипт не смотрит, КРАСИВО ли. Он ловит два класса
// поломок — «страница шире экрана» и «до кнопки не дотянуться».
// Страница может быть уродливой и зелёной одновременно.
//
// ------------------------------------------------------------
// Почему проверок ДВЕ, а не одна
// ------------------------------------------------------------
// Первая версия этого файла искала только горизонтальную прокрутку — и
// НЕ НАШЛА БЫ поломку, ради которой писалась. 14.09 на /portfolio
// правая стрелка карусели уезжала за край на 320px и пропадала: её
// срезал overflow-x-clip родителя. Страница при этом не прокручивалась
// ни на пиксель, то есть по первой проверке всё было зелено, а кнопки
// не было.
//
// Отсюда вторая проверка: КНОПКА ИЛИ ССЫЛКА, ОБРЕЗАННАЯ НЕПРОКРУЧИВАЕМЫМ
// предком. Разница принципиальная и в ней весь смысл:
//   overflow auto/scroll — до содержимого можно долистать, это карусель;
//   overflow hidden/clip — содержимое отрезано навсегда, дотянуться нечем.
// Первое нормально, второе — поломка.
//
// Третий случай — карусель, которую ТАЩАТ жестом (ClientReviews на
// Motion): она обрезает содержимое нарочно, а добраться до него можно.
// По вёрстке это неотличимо от настоящей потери, поэтому отличие
// объявляется атрибутом data-draggable в самой разметке. Догадываться
// тут нельзя: догадка ошибётся молча, а атрибут надо написать руками.
//
// ------------------------------------------------------------
// Что нужно для запуска
// ------------------------------------------------------------
// 1) Собранный сайт на localhost:3123:  npm run build && npx next start -p 3123
// 2) Playwright с браузером. В зависимости проекта он НЕ добавлен
//    намеренно — это 122 МБ браузера ради проверки, которую гоняют
//    вручную и не в CI (как check:views и check:guards). Ставится разово:
//        npm i -D playwright && npx playwright install firefox

const BASE = process.env.CHECK_URL ?? "http://localhost:3123";

// Ширины: 320 — маленький телефон и он же режим увеличенного шрифта;
// 375 — обычный; 768 — планшет; 1024 — узкий ноутбук.
const WIDTHS = [320, 375, 768, 1024];

// Публичные адреса. Личные (кабинет, админка) сюда не входят: им нужен
// вход, а заводить временного человека ради геометрии — отдельная цена.
// Они проверяются руками, список в TEMP.md.
const ROUTES = [
  "/",
  "/about",
  "/contact",
  "/portfolio",
  "/portfolio/ironholt-keep",
  "/marketplace",
  "/marketplace?collection=all",
  "/cart",
  "/support",
  "/wiki",
  "/wiki/installing-a-map",
  "/updates",
  "/privacy",
  "/terms",
  "/login",
  "/signup",
  "/forgot-password",
  "/@soucampus",
  "/this-page-does-not-exist",
];

let firefox;
try {
  ({ firefox } = await import("playwright"));
} catch {
  console.error(
    "\nPlaywright не установлен. Разово:\n" +
      "  npm i -D playwright && npx playwright install firefox\n" +
      "Почему его нет в зависимостях — в шапке этого файла.\n"
  );
  process.exit(1);
}

// Сервер должен уже работать: поднимать его отсюда значило бы прятать
// собственные ошибки сборки внутрь проверки адаптива.
try {
  const probe = await fetch(BASE + "/marketplace");
  if (!probe.ok) throw new Error(`ответ ${probe.status}`);
} catch (err) {
  console.error(
    `\nНе отвечает ${BASE} (${err.message}).\n` +
      "Сначала:  npm run build && npx next start -p 3123\n"
  );
  process.exit(1);
}

let failed = 0;
let checked = 0;

const browser = await firefox.launch();

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  console.log(`\n=== ${width}px ===`);

  for (const route of ROUTES) {
    checked++;
    try {
      await page.goto(BASE + route, { waitUntil: "load", timeout: 30000 });
      // Небольшая пауза: часть блоков доезжает после гидратации
      // (карусели, фильтры), и мерить до этого — мерить скелет.
      await page.waitForTimeout(350);

      const result = await page.evaluate((viewportWidth) => {
        const doc = document.scrollingElement;
        const offenders = [];

        for (const el of document.querySelectorAll("body *")) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if (rect.right <= viewportWidth + 1) continue;

          // Внутри прокручиваемой или обрезающей коробки выходить за
          // край — нормально: так устроены карусели, ряды подборок и
          // декоративные кольца. Ищем предка до самого верха, а не
          // только родителя: между элементом и коробкой обычно ещё
          // пара обёрток.
          let parent = el.parentElement;
          let contained = false;
          while (parent) {
            if (getComputedStyle(parent).overflowX !== "visible") {
              contained = true;
              break;
            }
            parent = parent.parentElement;
          }
          if (contained) continue;

          offenders.push({
            tag: el.tagName.toLowerCase(),
            width: Math.round(rect.width),
            right: Math.round(rect.right),
            cls: (el.className?.toString?.() ?? "").slice(0, 70),
          });
        }

        // Вторая проверка: интерактивное, отрезанное насовсем.
        const unreachable = [];
        for (const el of document.querySelectorAll("a, button, summary, [role=button]")) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          let parent = el.parentElement;
          while (parent) {
            const style = getComputedStyle(parent);
            const ox = style.overflowX;
            if (ox === "auto" || ox === "scroll") break; // долистать можно
            // Карусель, которую тащат жестом, обрезает содержимое
            // нарочно, и по вёрстке это неотличимо от настоящей потери.
            // Отличие объявляет разметка (data-draggable), а не догадка
            // скрипта: догадка однажды ошибётся молча, объявление
            // придётся написать руками и осознанно.
            if (parent.hasAttribute("data-draggable")) break;
            if (ox === "hidden" || ox === "clip") {
              const box = parent.getBoundingClientRect();
              // Отрезано больше половины ширины — значит нажать уже не во
              // что. Половина, а не любой пиксель: край кнопки часто
              // заходит под скруглённую рамку, и придираться к этому
              // значило бы получить проверку, которую перестанут читать.
              const visible = Math.min(rect.right, box.right) - Math.max(rect.left, box.left);
              if (visible < rect.width / 2) {
                unreachable.push({
                  label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30),
                  tag: el.tagName.toLowerCase(),
                  right: Math.round(rect.right),
                  cutAt: Math.round(box.right),
                });
              }
              break;
            }
            parent = parent.parentElement;
          }
        }

        return {
          scrolls: doc.scrollWidth > doc.clientWidth + 1,
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          offenders: offenders.slice(0, 4),
          unreachable: unreachable.slice(0, 4),
        };
      }, width);

      if (result.scrolls || result.offenders.length > 0 || result.unreachable.length > 0) {
        failed++;
        console.log(`  FAIL  ${route}`);
        if (result.scrolls) {
          console.log(
            `        страница прокручивается вбок: ${result.scrollWidth} при экране ${result.clientWidth}`
          );
        }
        for (const o of result.offenders) {
          console.log(`        ${o.tag} шириной ${o.width}, правый край ${o.right}  ${o.cls}`);
        }
        for (const u of result.unreachable) {
          console.log(
            `        до ${u.tag} «${u.label}» не дотянуться: правый край ${u.right}, обрезано на ${u.cutAt}`
          );
        }
      } else {
        console.log(`  ok    ${route}`);
      }
    } catch (err) {
      failed++;
      console.log(`  FAIL  ${route}\n        не открылось: ${err.message.split("\n")[0]}`);
    }
  }

  // Закрытие вкладки иногда падает протокольной ошибкой самого
  // Firefox. Ронять из-за этого проверку нельзя: измерения уже сделаны,
  // и потерять их на уборке — худший способ получить красный прогон.
  await page.close().catch(() => {});
}

await browser.close().catch(() => {});

console.log(`\nИтог: ${checked - failed} ok, ${failed} fail\n`);
process.exit(failed > 0 ? 1 : 0);
