// ============================================================
// ПРОВЕРКА ЗАПРЕТОВ: чего вошедший человек НЕ может записать.
//
// Запуск:  npm run check:guards            — preview-база (по умолчанию)
//          npm run check:guards -- --prod  — прод
//
// ЗАЧЕМ ЭТОТ ФАЙЛ СУЩЕСТВУЕТ. Двенадцать пунктов из TEMP.md не были
// пройдены НИ РАЗУ за три списка подряд: каждый требовал открыть консоль
// браузера, достать свой id и токен, скопировать apikey из вкладки
// Network и собрать запрос руками. Владелец каждый раз честно писал «не
// знаю как проверить», и это ответ не про него, а про формат проверки.
// Правило из docs/RULES.md: проверка, которую не делают, ничего не
// проверяет. Тот же путь уже прошли лимиты частоты (check:limits).
//
// ⚠️ ПОЧЕМУ НЕ В npm test И НЕ В CI. Здесь проверяется поведение ЖИВОЙ
// базы: политики RLS и триггеры. Чистых функций в этом файле нет вовсе, а
// мок ответил бы ровно то, что мы в него сами заложили, и подтвердил бы
// любую нашу ошибку. То же решение, что у check:views и check:limits.
//
// ⚠️ ДВА ПРАВИЛЬНЫХ ИСХОДА, И ОНИ ЗНАЧАТ РАЗНОЕ.
//   • ОШИБКА прав — запрет стоит политикой, записать нельзя вовсе.
//   • МОЛЧАЛИВЫЙ ОТКАТ — запрос прошёл, но триггер вернул старое
//     значение. Так сделано намеренно у полей profiles: иначе сохранение
//     всего профиля падало бы из-за поля, которого человек в форме не
//     видит.
// Опасен только третий исход: запрос прошёл И значение изменилось.
// Поэтому проверяется не «была ли ошибка», а ЧТО ЛЕЖИТ В БАЗЕ ПОСЛЕ.
//
// ⚠️ ЧТО СКРИПТ ПИШЕТ В БАЗУ. Заводит одного временного пользователя
// (почта вида guardcheck+<uuid>@example.invalid) и одну карту в состоянии
// pending на него. В конце удаляет обоих. Домен .invalid зарезервирован
// стандартом и не существует физически — письмо туда не уйдёт никуда даже
// при ошибке.
// ============================================================
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { loadEnv, pickTarget, projectRef } from "./db-target.mjs";

// Выбор базы и сторож «просили прод, а там preview» — в db-target.mjs,
// один на все скрипты проверки.
loadEnv();
const PROD = process.argv.includes("--prod");
const { url, anonKey, serviceKey, label } = pickTarget(PROD);

const asServer = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let passed = 0;
let failed = 0;
let skipped = 0;

function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ok    ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

function skip(name, why) {
  skipped++;
  console.log(`  skip  ${name}\n        ${why}`);
}

/**
 * Поле в profiles защищено, если ПОСЛЕ попытки записи в базе лежит
 * прежнее значение. Ошибка при этом допустима, но не обязательна — см.
 * «два правильных исхода» в шапке.
 */
async function fieldHolds(asUser, id, field, attempted, label, seed) {
  // ⚠️ У НОВОГО ЧЕЛОВЕКА ДЕФОЛТ КОЛОНКИ ЧАСТО РАВЕН ТОМУ, ЧТО МЫ
  // ПЫТАЕМСЯ ПРОТАЩИТЬ (пауза уже null, имя ещё не заявлено). Тогда
  // проверка не сработает НИКОГДА — то есть её всả равно что нет. Поэтому
  // служебным ключом заранее ставим заведомо ДРУГОЕ значение — ровно так,
  // как его ставит владелец или модерация, — и уже его пробуем снять.
  //⚠️ Подготовка ОБЯЗАНА откатываться. username_claimed мы ставим в true,
  // а следующая секция проверяет ровно ветку «имя ещё не заявлено»: не
  // вернём — и подготовка одной проверки поломает три другие.
  let original;
  if (seed !== undefined) {
    original = (await asServer.from("profiles").select(field).eq("id", id).single()).data?.[field];
    const prepared = await asServer.from("profiles").update({ [field]: seed }).eq("id", id);
    if (prepared.error) {
      skip(label, `не удалось подготовить значение: ${prepared.error.message}`);
      return;
    }
  }
  const restore = async () => {
    if (seed !== undefined) {
      await asServer.from("profiles").update({ [field]: original ?? null }).eq("id", id);
    }
  };

  const before = await asServer.from("profiles").select(field).eq("id", id).single();

  // ⚠️ СРАВНЕНИЕ «ДО/ПОСЛЕ» НИЧЕГО НЕ ДОКАЗЫВАЕТ, если в базе УЖЕ лежит
  // то, что мы пытаемся протащить: значение не изменится и при снятой
  // защите, и проверка напечатает ok на дыре. Такой исход — не
  // «прошло», а «не проверено», и говорить он обязан разное.
  if (JSON.stringify(before.data?.[field]) === JSON.stringify(attempted)) {
    skip(label, `в базе уже лежит ${JSON.stringify(attempted)} — проверка не различит защиту и её отсутствие`);
    await restore();
    return;
  }

  await asUser.from("profiles").update({ [field]: attempted }).eq("id", id);
  const after = await asServer.from("profiles").select(field).eq("id", id).single();

  const unchanged =
    JSON.stringify(before.data?.[field]) === JSON.stringify(after.data?.[field]);
  check(
    label,
    unchanged,
    unchanged ? "" : `было ${JSON.stringify(before.data?.[field])}, стало ${JSON.stringify(after.data?.[field])} — ДЫРА`
  );
  await restore();
}

async function main() {
  console.log(`\nПроверяю ${label}: ${projectRef(url)}\n`);

  // ---------------------------------------------------------
  // Временный человек. Пароль случайный и нигде не сохраняется.
  // ---------------------------------------------------------
  const suffix = randomUUID().slice(0, 8);
  const email = `guardcheck+${suffix}@example.invalid`;
  const password = `Gc-${randomUUID()}`;

  const created = await asServer.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) {
    console.error("Не удалось завести временного пользователя:", created.error.message);
    process.exit(1);
  }
  const userId = created.data.user.id;

  const asUser = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signedIn = await asUser.auth.signInWithPassword({ email, password });
  if (signedIn.error) {
    console.error("Не удалось войти временным пользователем:", signedIn.error.message);
    await asServer.auth.admin.deleteUser(userId);
    process.exit(1);
  }

  let productId = null;

  try {
    // -------------------------------------------------------
    // 1. Поля profiles, которые что-то РАЗРЕШАЮТ или УДОСТОВЕРЯЮТ.
    //
    // Правило, выведенное 21.08 ценой двух открытых дыр: политика «правь
    // свою строку» НЕ различает колонки, поэтому каждое такое поле
    // получает собственный триггер в той же миграции, что и колонку.
    // Здесь проверяется, что ни один из этих триггеров не пропал.
    // -------------------------------------------------------
    console.log("Поля profiles, которые дают права");

    await fieldHolds(asUser, userId, "is_verified", true, "галочку себе не поставить");
    await fieldHolds(asUser, userId, "is_admin", true, "админом себя не сделать");
    await fieldHolds(asUser, userId, "is_creator", true, "креатором себя не сделать");
    await fieldHolds(asUser, userId, "is_founder", true, "основателем себя не назвать");
    // Паузу сначала СТАВИМ (так еả ставит тяжảлый отказ в модерации),
    // потом пробуем снять еả собой — именно эта дыра была найдена 21.08.
    await fieldHolds(
      asUser,
      userId,
      "submissions_blocked_until",
      null,
      "паузу после отказа себе не снять",
      new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    );
    // ⚠️ username_claimed ПРОВЕРЯЕТСЯ НИЖЕ, ПОСЛЕ СЕКЦИИ С ИМЕНЕМ, и это не
    // прихоть порядка. Подготовить его служебным ключом нельзя: в
    // guard_username_change первой строкой, ДО всяких ветвлений и
    // без оглядки на роль, стоит `new.username_claimed := old.username_claimed`
    // — флаг не принадлежит никому и меняется только КАК СЛЕДСТВИЕ
    // смены имени. Поэтому ждảм, пока он станет true сам.

    // -------------------------------------------------------
    // 2. Имя: резерв и пауза.
    // -------------------------------------------------------
    console.log("\nИмя");

    const reserved = await asUser
      .from("profiles")
      .update({ username: "admin" })
      .eq("id", userId);
    check(
      "зарезервированное имя (admin) не занять",
      reserved.error !== null,
      reserved.error === null ? "запрос прошёл без ошибки" : ""
    );

    // ⚠️ БЕСПЛАТНЫХ СМЕН ДВЕ, И ЭТО НЕ ОШИБКА. Разобрано при написании
    // скрипта — сперва он считал их за одну и «нашёл дыру», которой нет.
    //
    //   1) У нового профиля username_claimed = false: имя ему назначил
    //      handle_new_user, а не человек. Первая смена — это ПЕРВОЕ
    //      называние себя, она проходит по ветке `not claimed`, ставит
    //      флаг и выходит, НЕ трогая username_changed_at.
    //   2) Значит следующая смена видит username_changed_at = null,
    //      проходит и ставит отметку времени. Это та самая «единственная
    //      бесплатная смена про запас», о которой говорит комментарий в
    //      миграции 20260825120000.
    //   3) И только третья упирается в паузу.
    const firstName = `guard${suffix}`;
    const claim = await asUser
      .from("profiles")
      .update({ username: firstName })
      .eq("id", userId);
    check(
      "первое называние себя проходит (имя ещё не заявлено)",
      claim.error === null,
      claim.error?.message ?? ""
    );

    const freeChange = await asUser
      .from("profiles")
      .update({ username: `${firstName}b` })
      .eq("id", userId);
    check(
      "смена после этого проходит (та самая бесплатная про запас)",
      freeChange.error === null,
      freeChange.error?.message ?? ""
    );

    const blocked = await asUser
      .from("profiles")
      .update({ username: `${firstName}c` })
      .eq("id", userId);
    const saysDate = /\d{4}-\d{2}-\d{2}/.test(blocked.error?.message ?? "");
    check(
      "следующая отказывает, и в отказе есть дата",
      blocked.error !== null && saysDate,
      blocked.error === null
        ? "смена прошла — пауза guard_username_change не работает"
        : `в тексте нет даты: ${blocked.error.message}`
    );

    // Смена ТОЛЬКО регистра паузы не стоит: слот при ней не
    // освобождается, значит и наказывать не за что (решение 21.08).
    // ⚠️ Регистр меняем у ТЕКУЩЕГО имени, а не у первого: после двух смен
    // в базе лежит `${firstName}b`, и подставив сюда firstName, мы
    // проверили бы совсем другое — смену имени, а не регистра.
    const caseOnly = await asUser
      .from("profiles")
      .update({ username: `${firstName}b`.toUpperCase() })
      .eq("id", userId);
    check(
      "смена только регистра проходит даже во время паузы",
      caseOnly.error === null,
      caseOnly.error?.message ?? ""
    );

    // Теперь имя заявлено (username_claimed стал true по ходу смен выше),
    // и попытка вернуть флаг в false наконец что-то значит: удайся она,
    // человек получил бы бесконечные бесплатные смены имени в обход паузы.
    await fieldHolds(
      asUser,
      userId,
      "username_claimed",
      false,
      "бесплатную смену имени себе не вернуть"
    );

    // -------------------------------------------------------
    // 3. Карта: состояние решает база, а не тот, кто её заводит.
    //
    // ⚠️ ВСТАВЛЯЕТ КАРТУ ЧЕЛОВЕК, А НЕ СЛУЖЕБНЫЙ КЛЮЧ, и это принципиально.
    // Сперва скрипт заводил её служебным ключом — и «нашёл дыру»: карта
    // осталась live. Дыры нет: guard_product_insert СОЗНАТЕЛЬНО пропускает
    // всё, что не `authenticated` (миграция 20260815160000, строка 40) —
    // серверу нужно уметь засеять каталог в любом состоянии. Проверять
    // надо путь человека, иначе тест меряет не то, что защищает.
    // -------------------------------------------------------
    console.log("\nКарта");

    // Сначала — что БЕЗ статуса креатора карту завести нельзя. Строго до
    // выдачи статуса ниже, иначе проверка потеряет смысл.
    const withoutStatus = await asUser.from("products").insert({
      slug: `guard-nocreator-${suffix}`,
      title: "should not exist",
      summary: "x",
      description: "x",
      image_url: "/logoSouCampus.png",
      price_cents: 100,
      price_label: "€1",
      price_currency: "eur",
      category: "building",
      creator_id: userId,
    });
    check(
      "не-креатор не заводит карту",
      withoutStatus.error !== null,
      withoutStatus.error === null ? "карта создалась — политика вставки не держит" : ""
    );

    // Статус выдаём служебным ключом — ровно так его выдаёт владелец.
    const granted = await asServer
      .from("profiles")
      .update({ is_creator: true })
      .eq("id", userId);
    if (granted.error) {
      skip("проверки состояния карты", `не удалось выдать статус креатора: ${granted.error.message}`);
    } else {
      const slug = `guard-check-${suffix}`;
      const inserted = await asUser
        .from("products")
        .insert({
          slug,
          title: `Guard check ${suffix}`,
          summary: "temporary row created by npm run check:guards",
          description: "temporary",
          image_url: "/logoSouCampus.png",
          price_cents: 1000,
          price_label: "€10",
          price_currency: "eur",
          category: "building",
          creator_id: userId,
          // Просим сразу на витрину — база обязана поправить на pending.
          state: "live",
          // ⚠️ СОСТОЯНИЕ — НЕ ЕДИНСТВЕННОЕ, ЧТО ТРИГГЕР НАЗНАЧАЕТ САМ.
          // Он затирает весь вердикт модерации целиком, и проверять надо
          // тоже целиком: карта в очереди, но с чужим «was_approved = true» —
          // это уже не та карта, которую модерация собиралась смотреть.
          rejection_reason: "guard check: should be wiped",
          was_approved: true,
        })
        .select("id, state, rejection_reason, was_approved")
        .single();

      if (inserted.error) {
        skip("проверки состояния карты", `креатор не смог завести карту: ${inserted.error.message}`);
      } else {
        productId = inserted.data.id;

        check(
          "карта человека всегда начинается с pending, что бы он ни просил",
          inserted.data.state === "pending",
          `в базе состояние ${inserted.data.state} — guard_product_insert не сработал`
        );

        check(
          "вердикт модерации своей рукой не вписать",
          inserted.data.rejection_reason === null && inserted.data.was_approved === false,
          `rejection_reason ${JSON.stringify(inserted.data.rejection_reason)}, was_approved ${JSON.stringify(inserted.data.was_approved)} — присланное не затёрто`
        );

        const holds = async (field, attempted, label, seed) => {
          // Тот же приảм, что в fieldHolds: если дефолт совпадает с тем, что
          // протаскиваем, сначала ставим служебным ключом другое значение.
          if (seed !== undefined) {
            const prepared = await asServer
              .from("products")
              .update({ [field]: seed })
              .eq("id", productId);
            if (prepared.error) {
              skip(label, `не удалось подготовить значение: ${prepared.error.message}`);
              return;
            }
          }

          const before = await asServer.from("products").select(field).eq("id", productId).single();

          // То же правило, что в fieldHolds выше, и здесь оно уже стреляло:
          // пока карта вставала сразу live, проверка holds("state","live")
          // сравнивала live с live и бодро печатала ok поверх дыры.
          if (JSON.stringify(before.data?.[field]) === JSON.stringify(attempted)) {
            skip(label, `в базе уже лежит ${JSON.stringify(attempted)} — проверка не различит защиту и её отсутствие`);
            return;
          }

          await asUser.from("products").update({ [field]: attempted }).eq("id", productId);
          const after = await asServer.from("products").select(field).eq("id", productId).single();
          const unchanged =
            JSON.stringify(before.data?.[field]) === JSON.stringify(after.data?.[field]);
          check(
            label,
            unchanged,
            unchanged
              ? ""
              : `было ${JSON.stringify(before.data?.[field])}, стало ${JSON.stringify(after.data?.[field])} — ДЫРА`
          );
        };

        await holds("state", "live", "автор не выводит свою карту на витрину сам");
        // Сначала гасим автора (так делает отзыв статуса), потом пробуем
        // вернуть карты на витрину его же руками — дыра, закрытая 16.08.
        await holds(
          "creator_active",
          true,
          "лишённый статуса не возвращает карты на витрину",
          false
        );
        await holds("published_at", "2019-01-01T00:00:00Z", "дату премьеры задним числом не поставить");
      }
    }

    // -------------------------------------------------------
    // 4. Чего нельзя вставить.
    // -------------------------------------------------------
    console.log("\nВставки, которых быть не должно");

    // Приём авторов заморожен 20.08 СНЯТОЙ ПОЛИТИКОЙ, а не спрятанной
    // формой. Это и проверяем: спрятать кнопку может кто угодно, а
    // защищает только база.
    const application = await asUser
      .from("creator_applications")
      .insert({ user_id: userId, portfolio_url: "https://example.invalid" });
    check(
      "заявку в креаторы не подать (креаторство заморожено)",
      application.error !== null,
      application.error === null ? "заявка создалась — политика вставки вернулась" : ""
    );

    if (productId) {
      const comment = await asUser.from("product_comments").insert({
        product_id: productId,
        user_id: userId,
        body: "should not exist",
      });
      check(
        "не купивший не пишет комментарий",
        comment.error !== null,
        comment.error === null ? "комментарий создался — has_purchased() обойдён" : ""
      );

      const otherId = randomUUID();
      const reaction = await asUser
        .from("product_reactions")
        .insert({ product_id: productId, user_id: otherId });
      check(
        "реакцию за другого человека не поставить",
        reaction.error !== null,
        reaction.error === null ? "реакция создалась с чужим user_id" : ""
      );
    } else {
      skip("комментарий и реакция", "нет временной карты, к которой их привязать");
    }
  } finally {
    // -------------------------------------------------------
    // Уборка. В finally, чтобы временный человек и карта не остались в
    // базе даже если проверка упала посередине.
    // -------------------------------------------------------
    if (productId) {
      await asServer.from("product_comments").delete().eq("product_id", productId);
      await asServer.from("product_reactions").delete().eq("product_id", productId);
      await asServer.from("products").delete().eq("id", productId);
    }
    await asServer.auth.admin.deleteUser(userId);
  }

  console.log(
    `\nИтог: ${passed} ok, ${failed} fail${skipped ? `, ${skipped} skip` : ""}\n`
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
