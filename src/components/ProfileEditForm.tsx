"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRefresh } from "@/lib/useRefresh";
import Link from "next/link";
import { UserCircle, Camera, Key, ImageSquare, Crop, Plus, Trash, PencilSimple } from "@phosphor-icons/react";
import { Unbounded } from "next/font/google";
import { Button, BUTTON_COLORS } from "@/components/Button";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { USERNAME_COOLDOWN_DAYS, type Profile } from "@/lib/profiles";
import { NameColorPicker } from "@/components/NameColorPicker";
import { uploadImage } from "@/lib/upload-client";
import { formatDayMonthYear } from "@/lib/dates";
import { revalidateProfile } from "@/app/(site)/settings/actions";
import { ImageCropper } from "@/components/ImageCropper";
import { ProfileLinks, PROFILE_LINK_ICONS } from "@/components/ProfileLinks";
import { Skeleton } from "@/components/Skeleton";
import {
  AVATAR_OUTPUT_SIZE,
  BANNER_ASPECT,
  BANNER_OUTPUT_WIDTH,
} from "@/lib/profile-media";
import { checkProfileLink, profileLinkLabel, type ProfileLink } from "@/lib/profile-links";
import { ProfileLinksDialog } from "@/components/ProfileLinksDialog";

// GIF уходит в шлюз как есть — обрезка через <canvas> убила бы анимацию.
// Поэтому у него прежние потолки: настоящий предел (IMAGE_MAX_BYTES)
// держит шлюз, здесь — удобство до загрузки.
const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 МБ
const BANNER_MAX_BYTES = 10 * 1024 * 1024; // 10 МБ — ровно потолок шлюза (IMAGE_MAX_BYTES)
// Остальное обрезается и пережимается в браузере, и в шлюз уходит уже
// маленький файл. Потолок исходника — только чтобы не раскодировать в
// памяти телефона снимок на сотню мегапикселей.
const SOURCE_MAX_BYTES = 25 * 1024 * 1024;

type CropTarget = "avatar" | "banner";

// Тот же шрифт имени, что на /@<username>: превью без него врало бы о
// главном — как выглядит имя.
const previewFont = Unbounded({ weight: "800", subsets: ["latin"] });

// Столько же, сколько в guard_username_change (миграция 20260821140000).
export function ProfileEditForm({
  initial,
  userId,
}: {
  initial: Profile;
  userId: string;
}) {
  const router = useRouter();
  const refresh = useRefresh();

  const [username, setUsername] = useState(initial.username);

  // До какой даты username менять нельзя (USERNAME_COOLDOWN_DAYS дней
  // с прошлой смены — числом не писать, оно уже менялось).
  // Считаем ЗДЕСЬ только для подписи под полем — настоящий запрет стоит
  // в триггере guard_username_change, и он же отказал бы, соври мы тут.
  // null — менять можно прямо сейчас (ни разу не меняли или месяц вышел).
  const lockedUntil = (() => {
    if (!initial.usernameChangedAt) return null;
    const until = new Date(initial.usernameChangedAt);
    until.setUTCDate(until.getUTCDate() + USERNAME_COOLDOWN_DAYS);
    return until > new Date() ? until : null;
  })();
  const [firstName, setFirstName] = useState(initial.firstName ?? "");
  const [lastName, setLastName] = useState(initial.lastName ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  // Цвет ника. Пустая строка — «не выбран»; в базу уходит null.
  const [nameColor, setNameColor] = useState(initial.nameColor ?? "");

  // Аватар: текущий URL из БД + опционально выбранный новый файл и его
  // локальный превью (object URL, живёт до сохранения).
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Баннер — та же тройка «что в базе / выбранный файл / превью».
  const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  // Ссылки — уже проверенные: правятся в окне (ProfileLinksDialog), и в
  // форму оно отдаёт только годный список. Проверка при сохранении
  // остаётся вторым рубежом.
  const [links, setLinks] = useState<ProfileLink[]>(initial.links);
  const [linksOpen, setLinksOpen] = useState(false);

  // Открытое окно обрезки: что режем и откуда картинка.
  const [crop, setCrop] = useState<{ target: CropTarget; src: string } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /**
   * Файл выбран — проверить и открыть обрезку. GIF обрезке не подлежит
   * (анимация не переживёт холст), он идёт как есть.
   */
  function pickImage(target: CropTarget, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Сброс значения: иначе тот же файл, выбранный после «Remove» или
    // «Cancel», не поднял бы onChange — браузер считает, что ничего не
    // изменилось.
    event.target.value = "";
    if (!file) return;
    const name = target === "avatar" ? "Avatar" : "Banner";
    if (!file.type.startsWith("image/")) {
      setError(`${name} must be an image.`);
      return;
    }
    setError(null);

    if (file.type === "image/gif") {
      const max = target === "avatar" ? AVATAR_MAX_BYTES : BANNER_MAX_BYTES;
      if (file.size > max) {
        setError(`${name} must be ${max / 1024 / 1024} MB or smaller.`);
        return;
      }
      applyImage(target, file);
      return;
    }

    if (file.size > SOURCE_MAX_BYTES) {
      setError(`${name} must be 25 MB or smaller.`);
      return;
    }
    setCrop({ target, src: URL.createObjectURL(file) });
  }

  function applyImage(target: CropTarget, file: File) {
    const preview = URL.createObjectURL(file);
    if (target === "avatar") {
      setAvatarFile(file);
      setAvatarPreview(preview);
    } else {
      setBannerFile(file);
      setBannerPreview(preview);
    }
  }


  /**
   * Убрать баннер. Файл в бакете остаётся лежать до следующей загрузки —
   * путь фиксированный, новый встанет на его место. Сам по себе он ни на
   * что не ссылается: профиль показывает то, что в banner_url.
   */
  function removeBanner() {
    setBannerFile(null);
    setBannerPreview(null);
    setBannerUrl(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    // Ссылки — до любой записи: отказ на третьей из пяти не должен
    // оставлять наполовину сохранённый профиль.
    const nextLinks: ProfileLink[] = [];
    for (const link of links) {
      const checked = checkProfileLink(link.kind, link.url);
      if (!checked.ok) {
        setPending(false);
        setError(checked.error);
        return;
      }
      nextLinks.push({ kind: link.kind, url: checked.url });
    }
    const linksChanged = JSON.stringify(nextLinks) !== JSON.stringify(initial.links);

    const supabase = createSupabaseBrowser();

    // Имя проверяем здесь только ради внятного сообщения — настоящие
    // правила стоят в базе: форма (profiles_username_format), занятость
    // (уникальный индекс по lower(username)), пауза
    // (guard_username_change) и зарезервированные имена
    // (guard_reserved_username). Форма, повторяющая правило базы, ничего
    // не защищает: запись идёт из браузера прямо в profiles.
    //
    // Регистр СОХРАНЯЕМ: имя видимое, и «SouCampus» должен остаться
    // «SouCampus». Уникальность при этом без учёта регистра — за неё
    // отвечает индекс, а не эта строка.
    const nextUsername = username.trim();
    const renamed = nextUsername.toLowerCase() !== initial.username.toLowerCase();

    if (nextUsername !== initial.username) {
      if (!/^[A-Za-z0-9_]{3,32}$/.test(nextUsername)) {
        setPending(false);
        setError(
          "Username can only use letters, numbers and underscores (3–32 characters)."
        );
        return;
      }

      // Только при настоящем переименовании: смена регистра своего же
      // имени («soucampus» → «SouCampus») занятой его не делает, а
      // проверка сказала бы, что имя занято — им самим.
      const { data: available, error: rpcError } = renamed
        ? await supabase.rpc("username_available", { name: nextUsername })
        : { data: true, error: null };
      if (rpcError) {
        setPending(false);
        setError("Couldn't check the username. Please try again.");
        return;
      }
      if (!available) {
        setPending(false);
        setError(`The username “${nextUsername}” is already taken.`);
        return;
      }
    }

    // Новый аватар — через шлюз (/api/creator/image, kind: "avatar").
    // Путь строит сервер, он же проверяет вес и первые байты уже
    // загруженного файла, и только потом ставит его на постоянное место
    // <user_id>/avatar. Отказ прежний аватар не трогает — разбор в
    // шапке обработчика. Готовая ссылка приезжает уже с ?v=…, которая
    // сбивает кэш браузера и CDN.
    let nextAvatarUrl = avatarUrl;
    if (avatarFile) {
      try {
        nextAvatarUrl = await uploadImage(avatarFile, "avatar");
      } catch (err) {
        setPending(false);
        setError(
          err instanceof Error ? err.message : "Couldn't upload the avatar."
        );
        return;
      }
    }

    // Баннер — тем же шлюзом, kind: "banner" (<user_id>/banner).
    let nextBannerUrl = bannerUrl;
    if (bannerFile) {
      try {
        nextBannerUrl = await uploadImage(bannerFile, "banner");
      } catch (err) {
        setPending(false);
        setError(
          err instanceof Error ? err.message : "Couldn't upload the banner."
        );
        return;
      }
    }

    // Какую СТРОКУ можно менять, решает RLS «own profile update» (свою).
    // Какие ПОЛЯ — права на колонки (миграция 20260915120000): браузеру
    // выдано ровно то, что отправляет эта форма. Добавишь сюда поле —
    // выдай на него право там же, иначе база ответит отказом прав.
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: nextUsername,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        // Пустое поле — это null, а не пустая строка: «биографии нет» и
        // «биография из нуля символов» на странице выглядели бы одинаково,
        // а в БД были бы разными состояниями.
        bio: bio.trim() || null,
        // Цвет отправляем ТОЛЬКО у покупателя. Не ради защиты — её
        // держит триггер protect_name_color в базе, и он молча вернёт
        // прежнее значение кому угодно ещё, — а чтобы не слать поле,
        // которого человек не видел: у обычного участника оно осталось
        // бы пустой строкой и стёрло бы цвет, если тот когда-то был.
        ...(initial.isClient ? { name_color: nameColor || null } : {}),
        avatar_url: nextAvatarUrl,
        // Право на колонку — 20261025130000. Отправляем, только если
        // баннер правда трогали: до прогона миграции база ответила бы
        // отказом прав на любое сохранение, даже на смену био.
        ...(nextBannerUrl !== initial.bannerUrl ? { banner_url: nextBannerUrl } : {}),
        // Право на колонку — 20261026120000; отправляем по той же
        // причине, что баннер, — только если трогали.
        ...(linksChanged ? { links: nextLinks } : {}),
      })
      .eq("id", userId);

    if (updateError) {
      setPending(false);

      // Пауза на смену username. Триггер guard_username_change кладёт
      // дату прямо в текст ошибки (`username_cooldown:2026-09-20`) —
      // разбираем её здесь, чтобы не считать то же самое второй раз и не
      // показать человеку сырую ошибку Postgres.
      //
      // Это НЕ дублирование блокировки поля выше: поле блокируется по
      // дате, прочитанной при загрузке страницы, а вкладка могла провисеть
      // открытой сутки. Последнее слово всегда за базой.
      const cooldown = /username_cooldown:(\d{4}-\d{2}-\d{2})/.exec(
        updateError.message
      );
      if (cooldown) {
        setError(
          `You can change your username again on ${formatDayMonthYear(cooldown[1])}.`
        );
        return;
      }

      // Уникальный индекс по username мог отклонить на гонке: между
      // проверкой выше и записью имя мог занять кто-то другой. Ровно
      // поэтому проверка в форме — удобство, а гарантия — индекс.
      const message = updateError.message.toLowerCase();
      if (message.includes("duplicate") || message.includes("username_reserved")) {
        setError("That username is already taken.");
        return;
      }

      // Текст ошибки базы наружу НЕ отдаём: он рассказывает о схеме —
      // имена колонок, ограничений, триггеров. В консоль пишем полностью,
      // человеку — что делать. Правило из CLAUDE.md, здесь оно нарушалось
      // с самого появления формы.
      console.warn(`Профиль не сохранился: ${updateError.message}`);
      setError("Couldn't save your changes. Please try again.");
      return;
    }

    // Дублируем ник и аватар в user_metadata: навбар читает их оттуда
    // (быстро, без запроса в БД на каждой странице). Без этого навбар
    // показывал бы старый ник после смены. updateUser поднимает событие
    // USER_UPDATED → useUser обновляет навбар сразу, без перезагрузки.
    await supabase.auth.updateUser({
      data: {
        // Копия имени — из неё навбар берёт и подпись, и ссылку «мой
        // профиль», не ходя за ними в базу на каждой странице.
        username: nextUsername,
        avatar_url: nextAvatarUrl,
      },
    });

    // Публичный профиль — заранее собранная статика с revalidate = 60, и
    // сбросить её после записи из браузера больше некому: наш сервер в
    // этом пути не участвует. Без этого человек до минуты видит на своей
    // странице старые данные и считает, что не сохранилось.
    //
    // Оба адреса: при смене username старая страница тоже должна
    // перестать показывать этот профиль.
    await revalidateProfile(nextUsername);
    if (initial.username && initial.username !== nextUsername) {
      await revalidateProfile(initial.username);
    }

    setPending(false);
    setAvatarUrl(nextAvatarUrl);
    setBannerUrl(nextBannerUrl);
    setAvatarFile(null);
    setBannerFile(null);
    setLinks(nextLinks);
    refresh();
    router.push("/settings");
  }

  const shownAvatar = avatarPreview ?? avatarUrl;
  const shownBanner = bannerPreview ?? bannerUrl;

  // Есть ли что сохранять. Сравнение с тем, как поле уйдёт в базу (после
  // trim), а не с сырым вводом: пробел в конце «о себе» сохранять нечего.
  // После сохранения refresh() приносит новый initial — и кнопка гаснет
  // сама.
  const dirty =
    username.trim() !== initial.username ||
    firstName.trim() !== (initial.firstName ?? "") ||
    lastName.trim() !== (initial.lastName ?? "") ||
    bio.trim() !== (initial.bio ?? "") ||
    (initial.isClient && (nameColor || null) !== initial.nameColor) ||
    avatarFile !== null ||
    bannerFile !== null ||
    bannerUrl !== initial.bannerUrl ||
    JSON.stringify(links) !== JSON.stringify(initial.links);

  return (
    // Форма слева, превью справа (просьба владельца 26.10). Колонки 5:7
    // внутри рамки страницы max-w-6xl (DESIGN.md): полям формы хватает
    // ~29rem, а превью нужна ширина, чтобы шапка легла так же, как на
    // профиле, — в ряд, а не столбиком.
    //
    // Фото правятся ПРЯМО В ПРЕВЬЮ (вечер 26.10): видишь баннер — на нём
    // и кнопки. Поэтому на телефоне превью стоит НАД формой (order-first),
    // а не прячется: без него фото было бы не поменять.
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-3xl border border-zinc-200 bg-[#fbfbff] p-6 dark:border-zinc-800 dark:bg-zinc-950 sm:p-8"
    >
      <div className="space-y-4">
        {/* ОДНО имя, и квадратик цвета рядом с ним.
            До вечера 21.08 здесь было два поля — «Display name» и
            «Profile address», — и это была ошибка: человеку незачем
            придумывать два имени. Второе поле убрано вместе с колонкой
            (миграция 20260821150000). */}
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="username"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Username{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">
                — soucampus.online/@{username.toLowerCase() || "…"}
              </span>
            </label>
            <input
              id="username"
              type="text"
              value={username}
              // Регистр НЕ трогаем: имя видимое, и «SouCampus» должен
              // остаться «SouCampus». Строчным его делает только адрес
              // (подпись выше), а уникальность и так без учёта регистра.
              onChange={(e) => setUsername(e.target.value)}
              required
              // Заблокировано, пока идёт месячная пауза. Это удобство, а
              // не защита: настоящий отказ даёт триггер
              // guard_username_change, и он сработает, даже если поле
              // разблокировать из инструментов разработчика. Смысл в
              // другом — не дать человеку напечатать новое имя и узнать
              // об отказе только после нажатия «Сохранить».
              disabled={lockedUntil !== null}
              className="w-full rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </div>

          {/* Тем, у кого права нет, квадратик не показывается вовсе:
              предлагать выбор, который база отвергнет, хуже, чем не
              предлагать. Настоящий запрет — триггер protect_name_color
              (миграция 20260820130000). */}
          {initial.isClient && (
            <NameColorPicker
              value={nameColor}
              onChange={setNameColor}
              previewName={username}
            />
          )}
        </div>

        {/* ⚠️ ЗДЕСЬ СОЗНАТЕЛЬНО ОСТАЁТСЯ UTC, хотя моменты по всему
            сайту показываются в поясе читателя (решение 22.08,
            компонент <LocalTime>). Причина в том, что ту же дату
            называют ДВА источника:

              • эта подпись — считается здесь из usernameChangedAt,
                то есть настоящий момент;
              • отказ базы — приходит строкой 'username_cooldown:2026-09-20',
                to_char по UTC, то есть уже СУТКИ без часа.

            Второй в местное время не перевести — час потерян ещё в
            базе. Переведём первый — и у человека восточнее Гринвича подпись
            под полем и текст ошибки назовут РАЗНЫЕ даты одного и того же
            события. Два ответа на один вопрос хуже, чем один ответ не в
            том поясе, тем более что «менять можно с такого-то числа» —
            утверждение про день, а не про час. */}
        <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {lockedUntil ? (
            <>
              You changed it recently — next change available on{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {formatDayMonthYear(lockedUntil)}
              </span>
              .
            </>
          ) : (
            <>
              Letters, numbers and underscores. This is your name, your login
              and your profile link at once — you can change it once every{" "}
              {USERNAME_COOLDOWN_DAYS} days, and the old one is then free for
              anyone else to take.
            </>
          )}
        </p>

        {/* Предупреждение ПЕРЕД сменой, а не после (просьба владельца
            23.08).

            Тот же текст уже стоит в серой подписи выше — и его не
            читают: он лежит там всегда, вперемешку с «letters, numbers
            and underscores», то есть в момент, когда ничего не решается.
            Человек узнавал о месячной паузе, уже сменив имя и получив
            заблокированное поле.

            Поэтому здесь не второй экземпляр правила, а тот же самый
            факт, показанный в ДРУГОЙ момент — когда в поле уже стоит
            новое имя и решение вот-вот будет принято. Появляется только
            тогда и исчезает, если вернуть прежнее.

            Сравнение без учёта регистра намеренно: смена только
            регистра паузы не стоит (guard_username_change), значит и
            пугать ею нечем. */}
        {!lockedUntil &&
          username.trim() !== "" &&
          username.trim().toLowerCase() !== initial.username.toLowerCase() && (
            <p className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
              Saving this locks your username for {USERNAME_COOLDOWN_DAYS} days,
              and{" "}
              <span className="font-semibold">{initial.username}</span> becomes
              free for anyone else to take.
            </p>
          )}
        {/* Две колонки — только с sm. На телефоне это были два поля по
            ~150px: имя влезает, фамилия обрезается на вводе, и набирать
            в них неудобно обеими руками. Правило из DESIGN.md → «Адаптив»:
            сетка, которая идёт в две колонки без sm-шага, подозрительна
            по умолчанию. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="firstName" label="First name" value={firstName} onChange={setFirstName} />
          <Field id="lastName" label="Last name" value={lastName} onChange={setLastName} />
        </div>

        {/* Bio — единственное публичное поле формы: оно показывается всем
            на /@<username>, в отличие от имени/фамилии. Отдельная
            подпись об этом, чтобы никто не написал сюда личное по
            привычке. */}
        <div>
          <label
            htmlFor="bio"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            About you{" "}
            <span className="font-normal text-zinc-500 dark:text-zinc-400">
              — shown publicly on your creator page
            </span>
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="What you build, what you're into…"
            className="w-full resize-y rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
          <p className="mt-1 text-right text-xs text-zinc-500 dark:text-zinc-400">
            {bio.length}/500
          </p>
        </div>

        {/* Ссылки — строкой иконок и кнопкой; правятся в окне
            (ProfileLinksDialog, вечер 26.10): восемь полей ввода прямо в
            форме растягивали её вдвое ради того, что меняют раз в
            полгода. */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Links{" "}
            <span className="font-normal text-zinc-500 dark:text-zinc-400">
              — Discord, X, YouTube and more
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {links.map((link, index) => {
              const IconFor = PROFILE_LINK_ICONS[link.kind];
              return (
                <span
                  key={`${link.kind}-${index}`}
                  title={profileLinkLabel(link)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
                >
                  <IconFor size={18} weight="fill" aria-hidden />
                  <span className="sr-only">{profileLinkLabel(link)}</span>
                </span>
              );
            })}
            <button
              type="button"
              onClick={() => setLinksOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-50"
            >
              {links.length > 0 ? (
                <>
                  <PencilSimple size={14} aria-hidden />
                  Edit links
                </>
              ) : (
                <>
                  <Plus size={14} aria-hidden />
                  Add links
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        {/* Неактивна, пока сохранять нечего (просьба владельца 26.10):
            активная кнопка на нетронутой форме обещает, что что-то
            изменилось. */}
        <Button type="submit" variant="primary" disabled={pending || !dirty} className="flex-1">
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button href="/purchases" variant="secondary" className="flex-1">
          Cancel
        </Button>
      </div>

      {/* Смена пароля — отдельным блоком, а не полем этой формы.
          Причина: пароль меняется через письмо-подтверждение (тот же
          флоу, что «забыл пароль»), то есть это другой процесс с другим
          результатом, а не ещё одно сохраняемое поле профиля. */}
      <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          Password
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          We&apos;ll email you a link to set a new one.
        </p>
        <Link
          href="/forgot-password"
          className={`mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors ${BUTTON_COLORS.secondary}`}
        >
          <Key size={16} weight="bold" />
          Change password
        </Link>
      </div>
    </form>

    <aside className="order-first lg:sticky lg:top-28 lg:order-none">
      <p className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Preview · edit photos here
      </p>
      <ProfilePreview
        username={username.trim() || initial.username}
        nameColor={initial.isClient ? nameColor : ""}
        avatar={shownAvatar}
        banner={shownBanner}
        bio={bio.trim()}
        // Только ссылки, которые пройдут проверку: недопечатанной на
        // профиле не будет, значит и в превью её нет.
        links={links.flatMap((link) => {
          const checked = checkProfileLink(link.kind, link.url);
          return checked.ok ? [{ kind: link.kind, url: checked.url }] : [];
        })}
        onPickBanner={() => bannerInput.current?.click()}
        onAdjustBanner={() => shownBanner && setCrop({ target: "banner", src: shownBanner })}
        onRemoveBanner={removeBanner}
        onPickAvatar={() => fileInput.current?.click()}
        onAdjustAvatar={() => shownAvatar && setCrop({ target: "avatar", src: shownAvatar })}
      />
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        Pick a file and crop it before saving. GIFs are kept as they are.
      </p>
      <input
        ref={bannerInput}
        type="file"
        accept="image/*"
        onChange={(event) => pickImage("banner", event)}
        className="hidden"
      />
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        onChange={(event) => pickImage("avatar", event)}
        className="hidden"
      />
    </aside>

    {linksOpen && (
      <ProfileLinksDialog
        value={links}
        onDone={(next) => {
          setLinks(next);
          setLinksOpen(false);
        }}
        onCancel={() => setLinksOpen(false)}
      />
    )}

    {crop && (
      <ImageCropper
        src={crop.src}
        aspect={crop.target === "avatar" ? 1 : BANNER_ASPECT}
        outputWidth={crop.target === "avatar" ? AVATAR_OUTPUT_SIZE : BANNER_OUTPUT_WIDTH}
        rounded={crop.target === "avatar"}
        title={crop.target === "avatar" ? "Crop avatar" : "Crop banner"}
        onCancel={() => setCrop(null)}
        onApply={(file) => {
          applyImage(crop.target, file);
          setCrop(null);
        }}
      />
    )}
    </div>
  );
}

// Кнопки поверх картинки — тёмная полупрозрачная подложка, чтобы читались
// на любом кадре, светлом и тёмном. Видны ВСЕГДА, а не по наведению: на
// тач-экране hover не наступает никогда (правило 26.08).
const ON_IMAGE =
  "inline-flex h-8 items-center gap-1.5 rounded-full bg-zinc-950/60 px-3 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-zinc-950/80";

/**
 * Как профиль будет выглядеть — и место, где правятся фото.
 *
 * Раскладка повторяет шапку /@<username> (вариант 8): аватар врезан в
 * баннер, рядом имя и строка «роль · Joined», справа ссылки, ниже «о
 * себе» и вкладки. Ряд или столбик решает ширина САМОЙ карточки
 * (@container), а не окна: превью уже страницы, и брейкпоинты окна здесь
 * соврали бы.
 *
 * Живое — то, что правится в форме: баннер, аватар, имя с цветом, «о
 * себе», ссылки. Роль, дата и карты — скелетами (решение владельца 26.10:
 * превью показывает изменения, а не данные).
 *
 * Два состояния — с баннером и без. Без баннера его место не держится
 * пустой полосой: профиль без баннера начинается сразу с аватара, и
 * превью обязано показать ровно это. Кнопка «Add banner» тогда — пилюля
 * в углу карточки, не занимающая места в раскладке.
 */
function ProfilePreview({
  username,
  nameColor,
  avatar,
  banner,
  bio,
  links,
  onPickBanner,
  onAdjustBanner,
  onRemoveBanner,
  onPickAvatar,
  onAdjustAvatar,
}: {
  username: string;
  nameColor: string;
  avatar: string | null;
  banner: string | null;
  bio: string;
  links: ProfileLink[];
  onPickBanner: () => void;
  onAdjustBanner: () => void;
  onRemoveBanner: () => void;
  onPickAvatar: () => void;
  onAdjustAvatar: () => void;
}) {
  // Лого из public/ ("/…") не режем: его показывают целиком.
  const avatarCroppable = avatar !== null && !avatar.startsWith("/");

  return (
    <div className="@container relative overflow-hidden rounded-3xl border border-zinc-200 bg-[#fbfbff] dark:border-zinc-800 dark:bg-zinc-950">
      {banner ? (
        // Пропорция рамки обрезки — ровно тот кадр, что вырезан. На самой
        // странице высота фиксированная, и края могут чуть срезаться.
        <div
          className="relative w-full bg-zinc-100 dark:bg-zinc-900"
          style={{ aspectRatio: String(BANNER_ASPECT) }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner} alt="" className="h-full w-full object-cover" />
          <div className="absolute right-3 top-3 flex gap-1.5">
            <button type="button" onClick={onAdjustBanner} className={ON_IMAGE}>
              <Crop size={14} aria-hidden />
              Adjust
            </button>
            <button type="button" onClick={onPickBanner} className={ON_IMAGE}>
              <Camera size={14} aria-hidden />
              Change
            </button>
            <button
              type="button"
              onClick={onRemoveBanner}
              aria-label="Remove banner"
              className={`${ON_IMAGE} hover:bg-red-600`}
            >
              <Trash size={14} aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPickBanner}
          className="absolute right-3 top-3 z-10 inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-zinc-300 px-3 text-xs font-medium text-zinc-600 transition-colors hover:border-orange-500 hover:text-orange-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-orange-400 dark:hover:text-orange-400"
        >
          <ImageSquare size={14} aria-hidden />
          Add banner
        </button>
      )}

      <div className="px-5 pb-6 @lg:px-6">
        <div
          className={`flex flex-col items-start gap-4 @lg:flex-row @lg:items-end @lg:gap-5 ${
            banner ? "" : "pt-6"
          }`}
        >
          {/* Аватар врезан в баннер на половину высоты — как на профиле.
              Клик по нему — выбрать файл; камера в углу говорит об этом
              без наведения. */}
          <div className={`relative shrink-0 ${banner ? "-mt-10 @lg:-mt-12" : ""}`}>
            <button
              type="button"
              onClick={onPickAvatar}
              aria-label="Change avatar"
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border-4 border-[#fbfbff] bg-zinc-100 dark:border-zinc-950 dark:bg-zinc-900 @lg:h-24 @lg:w-24"
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt=""
                  className={
                    avatar.startsWith("/")
                      ? "h-full w-full object-contain p-2"
                      : "h-full w-full object-cover"
                  }
                />
              ) : (
                <UserCircle size={52} weight="thin" className="text-zinc-300 dark:text-zinc-700" />
              )}
            </button>
            <button
              type="button"
              onClick={onPickAvatar}
              aria-label="Change avatar"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#fbfbff] bg-zinc-950 text-white dark:border-zinc-950 dark:bg-zinc-50 dark:text-zinc-950"
            >
              <Camera size={15} aria-hidden />
            </button>
            {avatarCroppable && (
              <button
                type="button"
                onClick={onAdjustAvatar}
                aria-label="Adjust avatar"
                className="absolute -bottom-1 -left-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#fbfbff] bg-zinc-950 text-white dark:border-zinc-950 dark:bg-zinc-50 dark:text-zinc-950"
              >
                <Crop size={15} aria-hidden />
              </button>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p
              className={`${previewFont.className} truncate text-2xl tracking-tight text-zinc-950 dark:text-zinc-50 @lg:text-3xl`}
              style={nameColor ? { color: nameColor } : undefined}
            >
              {username}
            </p>
            {/* Роль и чипы с цифрами — как на профиле, скелетами. */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
          </div>

          <ProfileLinks links={links} />
        </div>

        {bio && (
          <p className="mt-4 whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-400">
            {bio}
          </p>
        )}

        {/* Вкладки — как на профиле, первая выбрана; счётчики и карты —
            скелетами. */}
        <div className="mt-6 flex gap-5 border-b border-zinc-200 text-xs font-medium dark:border-zinc-800">
          {["Maps", "Reviews"].map((label, i) => (
            <span
              key={label}
              className={`-mb-px border-b-2 pb-2 ${
                i === 0
                  ? "border-orange-500 text-zinc-950 dark:border-orange-400 dark:text-zinc-50"
                  : "border-transparent text-zinc-400"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 @lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton
              key={i}
              className={`aspect-[4/3] w-full rounded-2xl ${i === 2 ? "hidden @lg:block" : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500"
      />
    </div>
  );
}
