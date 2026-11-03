// ============================================================
// npm run check:uploads — проверка загрузки против живого Storage.
//
// Юнит-тесты отвечают, что делает разбор zip и пересборка картинки. Здесь
// вопрос другой: доходит ли это до бакета. Настоящий пользователь, настоящие
// обработчики, настоящие объекты. Вне CI, как check:guards: мок ответил бы
// то, что мы в него заложили.
//
// Нужен запущенный сайт на той же базе:
//   npm run dev
//   npm run check:uploads              (http://localhost:3000)
//   npm run check:uploads -- --base=http://localhost:3457
//   npm run check:uploads -- --with-scanner   (сайт запущен с SCANNER_URL:
//                                              проверить находку антивируса)
//
// На проде не гоняется намеренно: скрипт заводит пользователя и карту.
// ============================================================
import { deflateRawSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { loadEnv, pickTarget, projectRef } from "./db-target.mjs";

loadEnv();
const { url, anonKey, serviceKey, label } = pickTarget(false);
const baseArg = process.argv.find((a) => a.startsWith("--base="));
const WITH_SCANNER = process.argv.includes("--with-scanner");
const BASE = baseArg ? baseArg.slice("--base=".length) : "http://localhost:3000";

const asServer = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const asUser = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let passed = 0;
let failed = 0;
function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ok    ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

// Zip из одной-нескольких записей: скрипт — .mjs, из тестов его не взять.
function zip(entries) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const { name, data, stored } of entries) {
    const nameBytes = Buffer.from(name);
    const raw = Buffer.from(data);
    const body = stored ? raw : deflateRawSync(raw);
    const method = stored ? 0 : 8;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(method, 10);
    header.writeUInt32LE(body.length, 20);
    header.writeUInt32LE(raw.length, 24);
    header.writeUInt16LE(nameBytes.length, 28);
    header.writeUInt32LE(offset, 42);
    central.push(header, nameBytes);
    parts.push(local, nameBytes, body);
    offset += local.length + nameBytes.length + body.length;
  }
  const directory = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(directory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, directory, eocd]);
}

// Сессия в том виде, в каком её читает @supabase/ssr: кука base64-…, длинная
// режется на части .0, .1 (иначе браузер её не примет).
function sessionCookie(session) {
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  const name = `sb-${projectRef(url)}-auth-token`;
  const size = 3180;
  if (value.length <= size) return `${name}=${value}`;
  const chunks = [];
  for (let i = 0; i * size < value.length; i++) {
    chunks.push(`${name}.${i}=${value.slice(i * size, (i + 1) * size)}`);
  }
  return chunks.join("; ");
}

let cookie = "";
async function post(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
}

/** sign + загрузка в Storage. Возвращает выданный путь или null, если Storage отказал. */
async function signAndPut(route, bucket, extra, fileName, bytes, contentType) {
  const signed = await post(route, { action: "sign", fileName, size: bytes.length, ...extra });
  if (signed.status !== 200) throw new Error(`sign ${signed.status}: ${JSON.stringify(signed.json)}`);
  const { error } = await asUser.storage
    .from(bucket)
    .uploadToSignedUrl(signed.json.path, signed.json.token, new Blob([bytes], { type: contentType }), {
      contentType,
    });
  return { path: signed.json.path, stored: !error, storageError: error?.message };
}

const exists = async (bucket, path) => {
  const { data } = await asServer.storage.from(bucket).info(path);
  return Boolean(data);
};
const publicUrl = (bucket, path) => asServer.storage.from(bucket).getPublicUrl(path).data.publicUrl;

// Повторяет EMPTY_SPECS из src/lib/products.ts: .mjs не импортирует TypeScript.
const EMPTY_SPECS = {
  mcVersions: [],
  mapTypes: [],
  gameModes: [],
  themes: [],
  mapSize: null,
  fileFormats: [],
};

const TAIL = "<script>alert('tail')</script>";
const stamp = Date.now();
const email = `check-uploads-${stamp}@example.com`;
const password = `Check-${stamp}-uploads!`;
let userId = null;

console.log(`Проверяю загрузку: ${label} (${projectRef(url)}), сайт ${BASE}\n`);

try {
  const created = await asServer.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw new Error(`пользователь: ${created.error.message}`);
  userId = created.data.user.id;
  const { error: creatorError } = await asServer
    .from("profiles")
    .update({ is_creator: true })
    .eq("id", userId);
  if (creatorError) throw new Error(`статус креатора: ${creatorError.message}`);
  const signedIn = await asUser.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw new Error(`вход: ${signedIn.error.message}`);
  cookie = sessionCookie(signedIn.data.session);

  const png = await sharp({
    create: { width: 16, height: 16, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .png()
    .toBuffer();
  const jpeg = await sharp(png)
    .jpeg()
    .withExif({ IFD0: { ImageDescription: "SECRET-LOCATION" } })
    .toBuffer();

  console.log("Картинки");

  // Аватар с дописанным хвостом
  {
    const bytes = Buffer.concat([png, Buffer.from(TAIL)]);
    const { path } = await signAndPut("/api/creator/image", "avatars", { kind: "avatar" }, "a.png", bytes, "image/png");
    check("токен выдан на pending-путь", path.startsWith(`${userId}/pending-`), path);
    const confirmed = await post("/api/creator/image", { action: "confirm", kind: "avatar", path, fileName: "a.png" });
    check("аватар принят и лёг на постоянное имя", confirmed.status === 200 && confirmed.json.path === `${userId}/avatar`, JSON.stringify(confirmed));
    check("временный файл убран", !(await exists("avatars", path)));
    const served = await fetch(publicUrl("avatars", `${userId}/avatar`));
    const body = Buffer.from(await served.arrayBuffer());
    check("хвост в отданном файле исчез", served.ok && !body.includes(TAIL), `status ${served.status}`);
    check("отдаётся как image/png", (served.headers.get("content-type") ?? "").startsWith("image/png"), served.headers.get("content-type"));

    // Второй аватар поверх первого: запись upsert обязана заменить, а не упасть.
    const again = await signAndPut("/api/creator/image", "avatars", { kind: "avatar" }, "b.png", png, "image/png");
    const second = await post("/api/creator/image", { action: "confirm", kind: "avatar", path: again.path, fileName: "b.png" });
    check("новый аватар заменяет старый", second.status === 200, JSON.stringify(second));
  }

  // Обложка: EXIF и настоящее расширение
  let coverUrl = null;
  {
    const { path } = await signAndPut("/api/creator/image", "product-images", { kind: "product" }, "photo.png", jpeg, "image/jpeg");
    const confirmed = await post("/api/creator/image", { action: "confirm", kind: "product", path, fileName: "photo.png" });
    check("картинка карты принята", confirmed.status === 200, JSON.stringify(confirmed));
    const finalPath = confirmed.json.path ?? "";
    check("JPEG под именем .png получил .jpg", finalPath.endsWith(".jpg") && !finalPath.includes("pending-"), finalPath);
    const served = await fetch(publicUrl("product-images", finalPath));
    const body = Buffer.from(await served.arrayBuffer());
    check("EXIF исчез", served.ok && !body.includes("SECRET-LOCATION"));
    coverUrl = publicUrl("product-images", finalPath);
  }

  // Заголовок PNG, за ним HTML
  {
    const fake = Buffer.concat([png.subarray(0, 12), Buffer.from(TAIL)]);
    const { path } = await signAndPut("/api/creator/image", "product-images", { kind: "product" }, "x.png", fake, "image/png");
    const confirmed = await post("/api/creator/image", { action: "confirm", kind: "product", path, fileName: "x.png" });
    check("подделка отклонена", confirmed.status === 400, JSON.stringify(confirmed));
    check("подделка удалена из бакета", !(await exists("product-images", path)));
  }

  // Тип text/html: после миграции откажет Storage, до неё — confirm
  {
    const { path, stored } = await signAndPut("/api/creator/image", "product-images", { kind: "product" }, "x.png", png, "text/html");
    if (stored) {
      const confirmed = await post("/api/creator/image", { action: "confirm", kind: "product", path, fileName: "x.png" });
      check("тип text/html отклонён в confirm", confirmed.status === 400, JSON.stringify(confirmed));
      console.log("        (Storage принял text/html: миграция 20261101120000 здесь ещё не прогнана)");
    } else {
      check("тип text/html отклонён самим Storage", true);
    }
  }

  // Чужой файл через confirm и готовая картинка через confirm
  {
    const confirmed = await post("/api/creator/image", {
      action: "confirm",
      kind: "avatar",
      path: `${userId}/avatar`,
      fileName: "a.png",
    });
    check("готовый аватар нельзя выдать за новую загрузку", confirmed.status === 404, JSON.stringify(confirmed));
  }

  console.log("\nФайл карты");
  const cleanZip = zip([
    { name: "World/level.dat", data: "data" },
    { name: "README.txt", data: "Have fun" },
  ]);

  let finalMapPath = null;
  {
    const { path } = await signAndPut("/api/creator/upload", "product-files", {}, "world.zip", cleanZip, "application/zip");
    check("токен выдан на pending-путь", path.startsWith(`${userId}/pending-`), path);

    // Обход: карта со ссылкой на файл, для которого confirm не вызывали.
    const map = (patch) => ({
      action: "create",
      map: {
        title: `Check uploads ${stamp}`,
        summary: "Temporary map from check:uploads",
        description: "<p>Temporary.</p>",
        coverUrl,
        galleryUrls: [],
        priceCents: 0,
        category: "building",
        filePath: path,
        specs: EMPTY_SPECS,
        reactionOptionId: null,
        ...patch,
      },
    });
    const skipped = await post("/api/creator/map", map({}));
    check(
      "карту с непроверенным файлом создать нельзя",
      skipped.status === 400 && /didn't arrive/.test(skipped.json.error ?? ""),
      JSON.stringify(skipped)
    );
    const pendingCover = await post(
      "/api/creator/map",
      map({ coverUrl: publicUrl("product-images", `${userId}/pending-1.jpg`) })
    );
    check("непроверенной картинкой обложку не сделать", pendingCover.status === 400, JSON.stringify(pendingCover));

    const confirmed = await post("/api/creator/upload", { action: "confirm", path, fileName: "world.zip" });
    check("чистый архив принят", confirmed.status === 200, JSON.stringify(confirmed));
    finalMapPath = confirmed.json.path ?? "";
    check("файл переехал на постоянный путь", !finalMapPath.includes("pending-") && (await exists("product-files", finalMapPath)), finalMapPath);
    check("временный файл убран", !(await exists("product-files", path)));

    // Та же карта с проверенным файлом: отказ выше был из-за файла, а не формы.
    const accepted = await post("/api/creator/map", map({ filePath: finalMapPath }));
    check("та же карта с проверенным файлом принята", accepted.status === 200, JSON.stringify(accepted));
  }

  for (const [title, entries] of [
    ["exe в архиве", [{ name: "tool.exe", data: "x" }]],
    ["программа под чужим именем", [{ name: "region/r.0.0.mca", data: Buffer.from([0x4d, 0x5a, 0x90, 0x00]) }]],
    ["путь наружу", [{ name: "../evil.txt", data: "x" }]],
  ]) {
    const { path } = await signAndPut("/api/creator/upload", "product-files", {}, "bad.zip", zip(entries), "application/zip");
    const confirmed = await post("/api/creator/upload", { action: "confirm", path, fileName: "bad.zip" });
    check(`${title}: отказ с текстом`, confirmed.status === 400 && /can't be accepted/.test(confirmed.json.error ?? ""), JSON.stringify(confirmed));
    check(`${title}: файл удалён`, !(await exists("product-files", path)));
  }

  // Находка антивируса: сервис сказал infected, сайт отказал и удалил файл.
  // EICAR — безвредная строка, которую обязан ловить любой антивирус. Собрана
  // при запуске, чтобы сам этот файл не помечали как заражённый.
  if (WITH_SCANNER) {
    const eicar = ["X5O!P%@AP[4\PZX54(P^)7CC)7}$", "EICAR-STANDARD-ANTIVIRUS-TEST-FILE!", "$H+H*"].join("");
    const file = zip([{ name: "eicar.txt", data: eicar, stored: true }]);
    const { path } = await signAndPut("/api/creator/upload", "product-files", {}, "eicar.zip", file, "application/zip");
    const confirmed = await post("/api/creator/upload", { action: "confirm", path, fileName: "eicar.zip" });
    check("антивирус: заражённый файл отклонён", confirmed.status === 400 && /antivirus/.test(confirmed.json.error ?? ""), JSON.stringify(confirmed));
    check("антивирус: файл удалён", !(await exists("product-files", path)));
  }

  // Правило базы про профиль: только после миграции
  {
    const pendingUrl = publicUrl("avatars", `${userId}/pending-x.png`);
    const { error } = await asServer.from("profiles").update({ avatar_url: pendingUrl }).eq("id", userId);
    if (error) {
      check("база не примет pending-адрес аватара", /not_pending/.test(error.message), error.message);
    } else {
      console.log("  skip  база не примет pending-адрес аватара\n        миграция 20261101120000 здесь ещё не прогнана");
      await asServer.from("profiles").update({ avatar_url: null }).eq("id", userId);
    }
  }
} catch (err) {
  check("прогон дошёл до конца", false, err instanceof Error ? err.message : String(err));
} finally {
  if (userId) {
    // Карта держит ссылку на автора: снести раньше пользователя.
    await asServer.from("products").delete().eq("creator_id", userId);
    for (const bucket of ["avatars", "product-images", "product-files"]) {
      const { data } = await asServer.storage.from(bucket).list(userId, { limit: 1000 });
      if (data?.length) {
        await asServer.storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
      }
    }
    const { error } = await asServer.auth.admin.deleteUser(userId);
    if (error) console.log(`\n  ⚠️  пользователь ${email} не удалился: ${error.message}`);
  }
}

console.log(`\nИтог: ${passed} ok, ${failed} fail`);
process.exit(failed ? 1 : 0);
