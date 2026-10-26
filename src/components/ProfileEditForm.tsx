"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRefresh } from "@/lib/useRefresh";
import Link from "next/link";
import { UserCircle, Camera, Key, ImageSquare, Crop, Plus, X } from "@phosphor-icons/react";
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
import {
  checkProfileLink,
  PROFILE_LINK_KINDS,
  PROFILE_LINK_META,
  PROFILE_LINKS_MAX,
  type ProfileLink,
  type ProfileLinkKind,
} from "@/lib/profile-links";

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

  // Ссылки — строками, как их печатает человек. В вид, который примет
  // база, их приводит checkProfileLink при сохранении: проверять на
  // каждой букве значило бы ругаться на недопечатанный адрес.
  const [links, setLinks] = useState<ProfileLink[]>(initial.links);

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

  function updateLink(index: number, url: string) {
    setLinks((current) => current.map((link, i) => (i === index ? { ...link, url } : link)));
  }

  function addLink(kind: ProfileLinkKind) {
    setLinks((current) =>
      current.length >= PROFILE_LINKS_MAX ? current : [...current, { kind, url: "" }],
    );
  }

  function removeLink(index: number) {
    setLinks((current) => current.filter((_, i) => i !== index));
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
    setBannerFile(null);
    setLinks(nextLinks);
    refresh();
    router.push("/settings");
  }

  const shownAvatar = avatarPreview ?? avatarUrl;
  const shownBanner = bannerPreview ?? bannerUrl;

  return (
    // Форма слева, превью справа (просьба владельца 26.10). Превью только
    // с lg: на телефоне ему рядом места нет, а под формой оно повторяло
    // бы шапку, которая и так стоит в форме сверху.
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 dark:border-zinc-800 dark:bg-zinc-950"
    >
      {/* Баннер и аватар — одной шапкой, аватар поверх нижнего края
          баннера (просьба владельца 25.10). Пропорция 4:1 та же, что на
          профиле: превью обязано показать тот кадр, который увидят
          посетители, иначе человек подбирает картинку вслепую.

          Кнопки смены видны ВСЕГДА, а не по наведению: на тач-экране
          hover не наступает никогда (правило 26.08). */}
      <div className="relative mb-16">
        <button
          type="button"
          onClick={() => bannerInput.current?.click()}
          className="relative block aspect-[4/1] w-full cursor-pointer overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
          aria-label={shownBanner ? "Change banner" : "Add banner"}
        >
          {shownBanner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shownBanner} alt="Banner" className="h-full w-full object-cover" />
          ) : (
            // Подпись в правой части: по центру внизу её закрыл бы аватар.
            <span className="flex h-full w-full items-center justify-end gap-2 pr-4 text-xs text-zinc-400 dark:text-zinc-500">
              <ImageSquare size={18} />
              Add a banner · wide, 5:1
            </span>
          )}
        </button>

        {/* Угол баннера: сменить и убрать. Тёмная подложка — чтобы
            кнопки читались поверх любой картинки, светлой и тёмной. */}
        {shownBanner && (
          <div className="absolute right-2 top-2 flex gap-1.5">
            {/* Подправить кадр, не выбирая файл заново. Режется уже
                обрезанная картинка — значит, чуть мягче оригинала. */}
            <button
              type="button"
              onClick={() => setCrop({ target: "banner", src: shownBanner })}
              aria-label="Adjust banner"
              className="inline-flex items-center rounded-full bg-zinc-950/60 px-2 py-1 text-white backdrop-blur-sm transition-colors hover:bg-zinc-950/80"
            >
              <Crop size={14} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => bannerInput.current?.click()}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-950/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-zinc-950/80"
            >
              <Camera size={14} aria-hidden />
              Change
            </button>
            <button
              type="button"
              onClick={removeBanner}
              aria-label="Remove banner"
              className="inline-flex items-center rounded-full bg-zinc-950/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-red-600"
            >
              Remove
            </button>
          </div>
        )}
        <input
          ref={bannerInput}
          type="file"
          accept="image/*"
          onChange={(event) => pickImage("banner", event)}
          className="hidden"
        />

        {/* Аватар — квадрат со скруглением, как на профиле. Обводка
            цветом формы отделяет его от баннера под ним. */}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="absolute bottom-0 left-1/2 h-24 w-24 -translate-x-1/2 translate-y-1/2 cursor-pointer rounded-3xl bg-[#fbfbff] p-1 dark:bg-zinc-950"
          aria-label="Change avatar"
        >
          <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[1.25rem] bg-zinc-100 dark:bg-zinc-900">
            {shownAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shownAvatar}
                alt="Avatar"
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <UserCircle size={56} className="text-zinc-300 dark:text-zinc-600" />
            )}
          </span>
          <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#fbfbff] bg-zinc-950 text-white dark:border-zinc-950 dark:bg-zinc-50 dark:text-zinc-950">
            <Camera size={15} aria-hidden />
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          onChange={(event) => pickImage("avatar", event)}
          className="hidden"
        />
      </div>
      <p className="-mt-2 mb-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
        You can crop after picking a file
        {/* Лого из public/ ("/…") не режем: его показывают целиком. */}
        {shownAvatar && !shownAvatar.startsWith("/") && (
          <>
            {" · "}
            <button
              type="button"
              onClick={() => setCrop({ target: "avatar", src: shownAvatar })}
              className="font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
            >
              Adjust avatar
            </button>
          </>
        )}
      </p>

      <div className="mt-6 space-y-4">
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
            в них неудобно обеими руками. Правило из RESPONSIVE_PLAN:
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

        {/* Ссылки. Вид выбирается кнопкой, а не выпадашкой: нативного
            <select> на сайте нет (06.09), а одиннадцать иконок рядом
            выбираются быстрее любого списка. Домен у каждого вида свой —
            стережёт база, подсказка в поле называет его заранее. */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Links{" "}
            <span className="font-normal text-zinc-500 dark:text-zinc-400">
              — up to {PROFILE_LINKS_MAX}, shown on your profile
            </span>
          </p>

          {links.length > 0 && (
            <ul className="mb-3 space-y-2">
              {links.map((link, index) => {
                const IconFor = PROFILE_LINK_ICONS[link.kind];
                const meta = PROFILE_LINK_META[link.kind];
                return (
                  <li key={index} className="flex items-center gap-2">
                    <IconFor
                      size={20}
                      weight="fill"
                      className="shrink-0 text-zinc-500 dark:text-zinc-400"
                      aria-hidden
                    />
                    <input
                      type="text"
                      inputMode="url"
                      value={link.url}
                      onChange={(e) => updateLink(index, e.target.value)}
                      placeholder={meta.placeholder}
                      aria-label={`${meta.label} link`}
                      className="min-w-0 flex-1 rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      aria-label={`Remove ${meta.label} link`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40"
                    >
                      <X size={16} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {links.length < PROFILE_LINKS_MAX && (
            <div className="flex flex-wrap gap-1.5">
              {PROFILE_LINK_KINDS.map((kind) => {
                const IconFor = PROFILE_LINK_ICONS[kind];
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => addLink(kind)}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-50"
                  >
                    <Plus size={12} aria-hidden />
                    <IconFor size={14} weight="fill" aria-hidden />
                    {PROFILE_LINK_META[kind].label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <Button type="submit" variant="primary" disabled={pending} className="flex-1">
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

    <aside className="sticky top-28 hidden lg:block">
      <p className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Preview
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
      />
    </aside>

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

/**
 * Как профиль будет выглядеть — шапка в узкой колонке.
 *
 * Только то, что правится в этой форме: баннер, аватар, имя с цветом,
 * «о себе», ссылки. Цифры, роль и карты — скелетами (решение владельца
 * 26.10): превью показывает изменения, а не данные, и ходить за
 * продажами ради картинки-примера незачем.
 *
 * Раскладка — телефонная версия профиля (аватар над именем): колонка
 * шириной с телефон, и брейкпоинты страницы, считающие ширину ОКНА, здесь
 * всё равно не сработали бы.
 */
function ProfilePreview({
  username,
  nameColor,
  avatar,
  banner,
  bio,
  links,
}: {
  username: string;
  nameColor: string;
  avatar: string | null;
  banner: string | null;
  bio: string;
  links: ProfileLink[];
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-[#fbfbff] dark:border-zinc-800 dark:bg-zinc-950">
      {/* Пропорция рамки обрезки — ровно тот кадр, что вырезан. На самой
          странице высота фиксированная, и края могут чуть срезаться. */}
      <div
        className="w-full bg-zinc-100 dark:bg-zinc-900"
        style={{ aspectRatio: String(BANNER_ASPECT) }}
      >
        {banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="px-6 pb-6">
        <div
          className={`relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-[#fbfbff] bg-zinc-100 dark:border-zinc-950 dark:bg-zinc-900 ${
            banner ? "-mt-12" : "mt-6"
          }`}
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
            <UserCircle size={56} weight="thin" className="text-zinc-300 dark:text-zinc-700" />
          )}
        </div>

        <p
          className="mt-4 truncate text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50"
          style={nameColor ? { color: nameColor } : undefined}
        >
          {username}
        </p>
        <Skeleton className="mt-3 h-6 w-20 rounded-full" />
        <Skeleton className="mt-3 h-4 w-32" />

        {bio && (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{bio}</p>
        )}
        <ProfileLinks links={links} className="mt-4" />

        <div className="mt-6 flex gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <Skeleton className="h-3 w-14" />
              <Skeleton className="mt-2 h-5 w-8" />
            </div>
          ))}
        </div>

        <Skeleton className="mt-8 h-6 w-28" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
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
