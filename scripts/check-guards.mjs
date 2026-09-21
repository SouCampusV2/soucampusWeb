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
//     значение (или политика не нашла ни одной строки, которую можно
//     править). Так сделано намеренно у полей profiles: иначе сохранение
//     всего профиля падало бы из-за поля, которого человек в форме не
//     видит.
// Опасен только третий исход: запрос прошёл И значение изменилось.
// Поэтому проверяется не «была ли ошибка», а ЧТО ЛЕЖИТ В БАЗЕ ПОСЛЕ.
//
// ⚠️ ЧТО СКРИПТ ПИШЕТ В БАЗУ. Заводит одного временного пользователя
// (почта вида guardcheck+<uuid>@example.invalid) и одну карту в состоянии
// pending на него — служебным ключом, как это делает сам сайт. Карта на
// витрину не попадает. В конце удаляет обоих и всё, что успело к ним
// прилипнуть. Домен .invalid зарезервирован стандартом и не существует
// физически — письмо туда не уйдёт никуда даже при ошибке.
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

// Имя бакета с файлами карт. Дублирует PRODUCT_FILES_BUCKET из
// src/lib/orders.ts: скрипт — обычный .mjs и TypeScript не импортирует.
const PRODUCT_FILES_BUCKET = "product-files";

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
  // проверка не сработает НИКОГДА — то есть её всё равно что нет. Поэтому
  // служебным ключом заранее ставим заведомо ДРУГОЕ значение — ровно так,
  // как его ставит владелец или модерация, — и уже его пробуем снять.
  // ⚠️ Подготовка ОБЯЗАНА откатываться. username_claimed мы ставим в true,
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

  // ⚠️ ОШИБКА ЧТЕНИЯ — ЭТО НЕ «ЗНАЧЕНИЕ НЕ ИЗМЕНИЛОСЬ». Найдено 15.09:
  // на preview не оказалось колонки is_founder, «до» и «после» пришли
  // оба undefined, сравнились как равные — и скрипт напечатал ok про
  // защиту поля, которого в базе нет. Колонка, которую нельзя прочитать,
  // не проверена, и сказать об этом надо громко.
  if (before.error) {
    check(label, false, `колонку ${field} не прочитать служебным ключом: ${before.error.message}`);
    await restore();
    return;
  }

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

  // Второй временный человек — нужен ровно для одной проверки: «чужой
  // user_id». Выдуманный id туда не годится, он упирается во внешний
  // ключ на auth.users и даёт отказ, ничего не доказывающий.
  let otherUserId = null;
  const otherCreated = await asServer.auth.admin.createUser({
    email: `guardcheck+other-${suffix}@example.invalid`,
    password: `Gc-${randomUUID()}`,
    email_confirm: true,
  });
  if (otherCreated.error) {
    console.error(
      "Второй временный человек не завёлся:",
      otherCreated.error.message
    );
  } else {
    otherUserId = otherCreated.data.user.id;
  }

  const asUser = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signedIn = await asUser.auth.signInWithPassword({ email, password });
  if (signedIn.error) {
    console.error("Не удалось войти временным пользователем:", signedIn.error.message);
    await asServer.auth.admin.deleteUser(userId);
    if (otherUserId) await asServer.auth.admin.deleteUser(otherUserId);
    process.exit(1);
  }

  // Всё, что скрипт может оставить после себя, — сюда, а уборка в
  // finally пройдётся по списку, даже если проверка упала посередине.
  const productIds = [];
  const storedFiles = [];
  const storedImages = [];
  const storedAvatars = [];

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
    // Паузу сначала СТАВИМ (так её ставит тяжёлый отказ в модерации),
    // потом пробуем снять её собой — именно эта дыра была найдена 21.08.
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
    // смены имени. Поэтому ждём, пока он станет true сам.

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
    // 2а. Колонки, которые браузеру не принадлежат (20260915120000).
    //
    // До 15.09 политика «own profile update» пускала в ЛЮБУЮ колонку своей
    // строки, и защищено было только то, у чего есть свой триггер. Эти
    // проверки — про остальное: про колонки, которые не стерёг никто, и
    // про сам механизм «ничего нельзя, кроме разрешённого».
    // -------------------------------------------------------
    console.log("\nКолонки профиля, которые браузеру не принадлежат");

    // Пауза на имя стоит (две смены выше поставили отметку). Обнулив её,
    // человек сменил бы имя снова сразу: триггер возвращает дату только
    // при смене САМОГО имени. Дыра, найденная 15.09.
    await fieldHolds(
      asUser,
      userId,
      "username_changed_at",
      null,
      "паузу на смену имени себе не обнулить"
    );
    await fieldHolds(
      asUser,
      userId,
      "creator_revoked_reason",
      "rewritten by the person it was about",
      "причину отзыва статуса себе не переписать",
      "Revoked by npm run check:guards"
    );

    // ⚠️ Доказательство самого механизма, а не отдельного поля. Раньше
    // запись is_admin проходила и тихо откатывалась триггером; с правами
    // на колонки база отвечает ОТКАЗОМ ПРАВ (42501) ещё до триггеров.
    // Тихий откат здесь — не «ok»: он значит, что колонку снова выдали и
    // держит её только триггер.
    const privilege = await asUser.from("profiles").update({ is_admin: true }).eq("id", userId);
    check(
      "в колонку-право база не пускает вовсе (отказ прав, а не тихий откат)",
      privilege.error?.code === "42501",
      privilege.error
        ? `ошибка, но не отказ прав: ${privilege.error.code} ${privilege.error.message}`
        : "запрос прошёл — право на UPDATE всей строки снова выдано"
    );

    // Аватар: чужой сервер собирал бы IP каждого, кто открыл профиль или
    // комментарий человека.
    await fieldHolds(
      asUser,
      userId,
      "avatar_url",
      "https://tracker.example.invalid/pixel.png",
      "чужой адрес в аватар не поставить"
    );
    await fieldHolds(
      asUser,
      userId,
      "avatar_url",
      "/logoSouCampus.png",
      "лого сайта в аватар без галочки не поставить"
    );

    // ⚠️ И обратная сторона: запрет не должен сломать саму форму. Адрес
    // собран так же, как его собирает ProfileEditForm (getPublicUrl +
    // ?v=), и обязан проходить.
    const ownAvatar = `${url}/storage/v1/object/public/avatars/${userId}/avatar?v=1`;
    const saved = await asUser.from("profiles").update({ avatar_url: ownAvatar }).eq("id", userId);
    const stored = await asServer.from("profiles").select("avatar_url").eq("id", userId).single();
    check(
      "свой аватар из нашего бакета сохраняется (форма не сломана)",
      saved.error === null && stored.data?.avatar_url === ownAvatar,
      saved.error ? saved.error.message : `в базе ${JSON.stringify(stored.data?.avatar_url)}`
    );
    await asServer.from("profiles").update({ avatar_url: null }).eq("id", userId);

    // -------------------------------------------------------
    // 3. Карта: из браузера её не пишет никто (шлюз записи, пути 1–4).
    //
    // До 15.09 здесь проверялось, что триггер guard_product_insert
    // переписывает карту человека в pending. С прогоном
    // 20260911120000_map_file_gateway и 20260913120000_map_write_gateway
    // вопрос сменился: политики записи сняты, карта, её файл и галерея
    // пишутся только обработчиками /api/creator/* под служебным ключом.
    // Первый рубеж теперь — ОТКАЗ базы на любую такую запись из браузера,
    // в том числе от креатора. Его и проверяем, по одному на каждый путь.
    //
    // ⚠️ Сам триггер guard_product_insert отсюда больше не проверить, и
    // это не потерянная проверка, а её цена: он срабатывает только на
    // вставку от роли authenticated, а такой вставки теперь не пропускает
    // политика. Он остался вторым рубежом; вернут политику — первой
    // упадёт проверка «креатор тоже не заводит карту» ниже.
    // -------------------------------------------------------
    console.log("\nКарта — шлюз записи");

    const mapRow = (slug) => ({
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
    });

    // Без статуса креатора — строго ДО выдачи статуса ниже, иначе
    // проверка потеряет смысл.
    const withoutStatus = await asUser
      .from("products")
      .insert(mapRow(`guard-nocreator-${suffix}`))
      .select("id")
      .maybeSingle();
    if (withoutStatus.data?.id) productIds.push(withoutStatus.data.id);
    check(
      "не-креатор не заводит карту из браузера",
      withoutStatus.error !== null,
      withoutStatus.error === null ? "карта создалась — политика вставки не держит" : ""
    );

    // Статус выдаём служебным ключом — ровно так его выдаёт владелец.
    const granted = await asServer
      .from("profiles")
      .update({ is_creator: true })
      .eq("id", userId);
    if (granted.error) {
      skip("креатор и карта", `не удалось выдать статус креатора: ${granted.error.message}`);
    } else {
      // Путь №2. До шлюза эта вставка ПРОХОДИЛА (и триггер переписывал
      // state в pending); после — обязана упасть на политике.
      const asCreator = await asUser
        .from("products")
        .insert({ ...mapRow(`guard-creator-${suffix}`), state: "live" })
        .select("id")
        .maybeSingle();
      if (asCreator.data?.id) productIds.push(asCreator.data.id);
      check(
        "креатор тоже не заводит карту из браузера (только через /api/creator/map)",
        asCreator.error !== null,
        asCreator.error === null
          ? "карта создалась мимо шлюза — политика вставки вернулась или 20260913120000 не прогнана"
          : ""
      );

      // Путь №1: файл карты в бакет напрямую.
      const filePath = `${userId}/guard-${suffix}.zip`;
      const upload = await asUser.storage
        .from(PRODUCT_FILES_BUCKET)
        .upload(filePath, new Blob(["guard check"]), { contentType: "application/zip" });
      if (!upload.error) storedFiles.push(filePath);
      check(
        "файл карты в бакет из браузера не загрузить (только через /api/creator/upload)",
        upload.error !== null,
        upload.error === null
          ? "файл лёг мимо шлюза — политика бакета вернулась или 20260911120000 не прогнана"
          : ""
      );
    }

    // Временная карта для остальных проверок — СЛУЖЕБНЫМ КЛЮЧОМ, как её
    // заводит сам сайт. Встаёт pending и на витрину не попадает: на проде
    // это важно — витрина кэшируется на минуту, и временная live-карта
    // могла бы успеть в чужой кэш.
    // ⚠️ До 15.09 карту заводил человек, и после шлюза скрипт упирался в
    // отказ и пропускал всё, что от карты зависело (два skip 15.09).
    let productId = null;
    const seeded = await asServer
      .from("products")
      .insert({ ...mapRow(`guard-check-${suffix}`), state: "pending" })
      .select("id")
      .single();
    if (seeded.error) {
      skip("правка карты и галерея", `не удалось завести временную карту: ${seeded.error.message}`);
    } else {
      productId = seeded.data.id;
      productIds.push(productId);

      const holds = async (field, attempted, label, seed) => {
        // Тот же приём, что в fieldHolds: если дефолт совпадает с тем, что
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

      // Путь №3. Ни одно поле своей карты из браузера не переписать —
      // начиная с самого безобидного: если проходит заголовок, значит
      // политика правки жива, и все рассуждения про поля состояния ниже
      // держатся только на триггере.
      await holds("title", "rewritten from the browser", "свою карту из браузера не переписать (только через /api/creator/map)");
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

      // Путь №4: галерея — ни строкой, ни функцией.
      const image = await asUser
        .from("product_images")
        .insert({ product_id: productId, url: "/logoSouCampus.png", position: 0 });
      check(
        "картинку в галерею из браузера не добавить",
        image.error !== null,
        image.error === null ? "строка галереи создалась — политика product_images вернулась" : ""
      );

      const rpc = await asUser.rpc("replace_product_images", {
        p_product_id: productId,
        p_urls: ["/logoSouCampus.png"],
      });
      check(
        "функцию галереи из браузера не вызвать",
        rpc.error !== null,
        rpc.error === null ? "replace_product_images выполнилась — execute у authenticated не отозван" : ""
      );
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
      // ⚠️ Карта здесь в pending, а не live. Отказ на комментарий может
      // прийти и оттого, что карту не видно, а не только оттого, что её не
      // покупали, — различить эти два отказа отсюда нельзя. Сделать карту
      // live ради чистоты проверки нельзя тем более: см. выше про кэш
      // витрины на проде. Проверяется главное: мимо has_purchased() строка
      // не встаёт.
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
      // ⚠️ Проверка выше СЛАБАЯ, и это надо знать: с 21.09 отказ придёт и
      // потому, что политики вставки больше нет вовсе. То есть она
      // перестала различать «не купил» и «дверь закрыта для всех».
      // Сильная версия — ниже, в разделе 5: там тот же человек с
      // ОПЛАЧЕННЫМ заказом, и отказ доказывает именно шлюз.

      // ⚠️ ТРЕТЬЯ «ВСЕГДА ЗЕЛЁНАЯ» ПРОВЕРКА, найденная 21.09.
      // Здесь стоял `randomUUID()` в качестве чужого человека — и отказ
      // приходил от ВНЕШНЕГО КЛЮЧА (user_id ссылается на auth.users), а
      // не от защиты. То есть проверка была бы зелёной даже с RLS,
      // выключенной начисто. Теперь чужой человек — настоящий, второй
      // временный аккаунт: отказ доказывает защиту, а не схему.
      if (otherUserId) {
        const reaction = await asUser
          .from("product_reactions")
          .insert({ product_id: productId, user_id: otherUserId });
        check(
          "реакцию за другого человека не поставить",
          reaction.error !== null,
          reaction.error === null ? "реакция создалась с чужим user_id" : ""
        );
      } else {
        skip(
          "реакцию за другого человека не поставить",
          "не удалось завести второго временного человека — с выдуманным id отказ пришёл бы от внешнего ключа и ничего бы не доказал"
        );
      }
    } else {
      skip("комментарий и реакция", "нет временной карты, к которой их привязать");
    }

    // -------------------------------------------------------
    // 5. Последние шесть путей записи — шлюз 21.09.
    //
    // Пути №5, №9–13: картинки, аватар, оценка, реакция, свои
    // уведомления. Доказательство — снятые политики
    // (20260921130000_social_gateway_policies).
    //
    // ⚠️ У уведомлений отказ выглядит ИНАЧЕ, чем у остальных. Запрос
    // update/delete без подходящей политики ошибки НЕ даёт: он просто
    // не находит ни одной строки и отвечает успехом. Поэтому там
    // проверяется не ошибка, а строка в базе — прочитанная служебным
    // ключом. Это тот же урок, что «сравнение до/после ничего не
    // доказывает» от 08.09, в другом обличье: здесь доказывает
    // только состояние.
    // -------------------------------------------------------
    console.log("\nШлюз 21.09: картинки, отклики, уведомления");

    const imagePath = `${userId}/guard-${suffix}.png`;
    const imageUpload = await asUser.storage
      .from("product-images")
      .upload(imagePath, new Blob(["not a real png"]), { contentType: "image/png" });
    if (!imageUpload.error) storedImages.push(imagePath);
    check(
      "картинку карты в бакет из браузера не загрузить (только через /api/creator/image)",
      imageUpload.error !== null,
      imageUpload.error === null
        ? "картинка легла мимо шлюза — политика product-images вернулась или 20260921130000 не прогнана"
        : ""
    );

    const avatarPath = `${userId}/avatar`;
    const avatarUpload = await asUser.storage
      .from("avatars")
      .upload(avatarPath, new Blob(["not a real png"]), {
        contentType: "image/png",
        upsert: true,
      });
    if (!avatarUpload.error) storedAvatars.push(avatarPath);
    check(
      "аватар в бакет из браузера не загрузить (только через /api/creator/image)",
      avatarUpload.error !== null,
      avatarUpload.error === null
        ? "аватар лёг мимо шлюза — политика avatars вернулась или 20260921130000 не прогнана"
        : ""
    );

    if (productId) {
      const rating = await asUser
        .from("product_ratings")
        .insert({ product_id: productId, user_id: userId, stars: 5 });
      check(
        "оценку из браузера не поставить (только через /api/feedback)",
        rating.error !== null,
        rating.error === null
          ? "оценка встала мимо шлюза — политика product_ratings вернулась"
          : ""
      );

      // ⚠️ Раньше эта проверка прошла бы: реакция СЕБЕ была разрешена
      // политикой, и отказ ловился только на чужом user_id (см. выше).
      // Теперь запрещено и своё — писать реакции может лишь шлюз.
      const ownReaction = await asUser
        .from("product_reactions")
        .insert({ product_id: productId, user_id: userId });
      check(
        "реакцию себе из браузера не поставить (только через /api/feedback)",
        ownReaction.error !== null,
        ownReaction.error === null
          ? "реакция встала мимо шлюза — политика product_reactions вернулась"
          : ""
      );
    } else {
      skip("оценка и своя реакция", "нет временной карты, к которой их привязать");
    }

    // Уведомление для проверки заводим служебным ключом — как это делает
    // сам сайт.
    const seededNote = await asServer
      .from("notifications")
      .insert({
        user_id: userId,
        kind: "announcement",
        title: `guard check ${suffix}`,
        body: "temporary row, deleted by the script",
      })
      .select("id")
      .single();

    if (seededNote.error) {
      skip("свои уведомления", `не удалось завести строку: ${seededNote.error.message}`);
    } else {
      const noteId = seededNote.data.id;
      await asUser
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", noteId);
      const afterRead = await asServer
        .from("notifications")
        .select("read_at")
        .eq("id", noteId)
        .maybeSingle();
      check(
        "своё уведомление из браузера не отметить прочитанным (только через /api/notifications)",
        afterRead.data?.read_at == null,
        afterRead.data?.read_at != null
          ? "read_at записался — политика mark own notifications read вернулась"
          : ""
      );

      await asUser.from("notifications").delete().eq("id", noteId);
      const afterDelete = await asServer
        .from("notifications")
        .select("id")
        .eq("id", noteId)
        .maybeSingle();
      check(
        "своё уведомление из браузера не удалить (только через /api/notifications)",
        afterDelete.data != null,
        afterDelete.data == null
          ? "строка исчезла — политика delete own notifications вернулась"
          : ""
      );
      await asServer.from("notifications").delete().eq("id", noteId);
    }

    // ⚠️ Дальше — САМАЯ СИЛЬНАЯ ПРОВЕРКА РАЗДЕЛА, и появилась она
    // потому, что две предыдущие оказались слабыми. «Не купивший не
    // пишет комментарий» и «оценку не поставить» до 21.09 отвечали
    // отказом по ДВУМ причинам сразу: и покупки нет, и политики нет.
    // Такой отказ не различает защиту и её отсутствие — ровно та
    // болезнь, которую лечили 08.09 (holds("state","live") сравнивала
    // live с live).
    //
    // Поэтому здесь временному человеку заводится настоящий ОПЛАЧЕННЫЙ
    // заказ на временную карту: has_purchased_for() теперь отвечает
    // «да», и отказ на прямую вставку доказывает шлюз, а не отсутствие
    // покупки.
    let orderId = null;
    if (productId) {
      const order = await asServer
        .from("orders")
        .insert({
          stripe_session_id: `cs_guard_${suffix}`,
          customer_email: email,
          user_id: userId,
          status: "paid",
          total_cents: 100,
        })
        .select("id")
        .single();

      if (order.error) {
        skip(
          "покупатель пишет только через шлюз",
          `не удалось завести заказ: ${order.error.message}`
        );
      } else {
        orderId = order.data.id;
        const item = await asServer.from("order_items").insert({
          order_id: orderId,
          product_id: productId,
          title: "guard check",
          price_cents: 100,
        });

        if (item.error) {
          skip(
            "покупатель пишет только через шлюз",
            `не удалось завести позицию заказа: ${item.error.message}`
          );
        } else {
          // Сначала убеждаемся, что подготовка удалась: если покупка не
          // видна, оба отказа ниже ничего не докажут.
          const bought = await asServer.rpc("has_purchased_for", {
            p_product_id: productId,
            p_user_id: userId,
            p_email: email,
          });
          if (bought.data !== true) {
            skip(
              "покупатель пишет только через шлюз",
              "has_purchased_for() не увидел заказ — проверка не различит защиту и её отсутствие"
            );
          } else {
            const buyerComment = await asUser.from("product_comments").insert({
              product_id: productId,
              user_id: userId,
              body: "buyer writing straight into the table",
            });
            check(
              "даже КУПИВШИЙ не пишет комментарий из браузера (только через /api/comments)",
              buyerComment.error !== null,
              buyerComment.error === null
                ? "комментарий создался — политика insert own comment if bought вернулась"
                : ""
            );

            const buyerRating = await asUser
              .from("product_ratings")
              .insert({ product_id: productId, user_id: userId, stars: 4 });
            check(
              "даже КУПИВШИЙ не ставит оценку из браузера (только через /api/feedback)",
              buyerRating.error !== null,
              buyerRating.error === null
                ? "оценка встала — политика insert own rating if bought вернулась"
                : ""
            );
          }
        }
      }
    } else {
      skip("покупатель пишет только через шлюз", "нет временной карты");
    }

    // Функции шлюза: их зовёт только сервер. ⚠️ Postgres выдаёт execute
    // роли PUBLIC по умолчанию, и revoke в миграции — единственное, что
    // это снимает. Не сработай он, любой посетитель проверял бы чужие
    // покупки перебором и удалял бы чужие комментарии от чужого имени.
    const purchasedFor = await asUser.rpc("has_purchased_for", {
      p_product_id: productId ?? randomUUID(),
      p_user_id: randomUUID(),
      p_email: "someone@example.invalid",
    });
    check(
      "has_purchased_for из браузера не позвать",
      purchasedFor.error !== null,
      purchasedFor.error === null
        ? "функция выполнилась — execute у authenticated/public не отозван"
        : ""
    );

    const deleteFor = await asUser.rpc("soft_delete_comment_for", {
      p_comment_id: randomUUID(),
      p_actor: randomUUID(),
    });
    check(
      "soft_delete_comment_for из браузера не позвать",
      deleteFor.error !== null,
      deleteFor.error === null
        ? "функция выполнилась — execute у authenticated/public не отозван"
        : ""
    );

    const deleteOld = await asUser.rpc("soft_delete_comment", {
      p_comment_id: randomUUID(),
    });
    // ⚠️ Здесь мало «пришла ошибка»: функция отвечает ошибкой и на
    // несуществующий комментарий (comment_not_found). Нужна именно
    // ошибка ПРАВ, иначе проверка зелёная при открытой двери.
    const deniedOld =
      deleteOld.error !== null &&
      !`${deleteOld.error.message}`.includes("comment_not_found");
    check(
      "старую soft_delete_comment из браузера не позвать",
      deniedOld,
      deniedOld ? "" : "функция доступна authenticated — revoke из 20260921130000 не прогнан"
    );
  } finally {
    // -------------------------------------------------------
    // Уборка. В finally, чтобы временный человек, карты и файлы не
    // остались в базе даже если проверка упала посередине.
    //
    // ⚠️ ЗАКАЗ УБИРАЕТСЯ ПЕРВЫМ, и порядок здесь не косметика:
    // order_items ссылается на products с ON DELETE RESTRICT (заказ
    // нельзя обесценить, удалив товар, — иначе история покупок теряет
    // смысл). Пока позиция заказа жива, карта не удалится, и временная
    // карта осталась бы в базе навсегда. order_items уходит каскадом
    // вместе с заказом.
    // -------------------------------------------------------
    await asServer.from("orders").delete().eq("stripe_session_id", `cs_guard_${suffix}`);
    for (const id of productIds) {
      await asServer.from("product_comments").delete().eq("product_id", id);
      await asServer.from("product_reactions").delete().eq("product_id", id);
      await asServer.from("product_images").delete().eq("product_id", id);
      await asServer.from("products").delete().eq("id", id);
    }
    if (storedFiles.length > 0) {
      await asServer.storage.from(PRODUCT_FILES_BUCKET).remove(storedFiles);
    }
    if (storedImages.length > 0) {
      await asServer.storage.from("product-images").remove(storedImages);
    }
    if (storedAvatars.length > 0) {
      await asServer.storage.from("avatars").remove(storedAvatars);
    }
    await asServer.from("notifications").delete().eq("user_id", userId);
    await asServer.auth.admin.deleteUser(userId);
    if (otherUserId) await asServer.auth.admin.deleteUser(otherUserId);
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
