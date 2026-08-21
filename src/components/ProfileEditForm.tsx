"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRefresh } from "@/lib/useRefresh";
import Link from "next/link";
import { UserCircle, Camera, Key } from "@phosphor-icons/react";
import { Button, BUTTON_COLORS } from "@/components/Button";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Profile } from "@/lib/profiles";
import { NameColorPicker } from "@/components/NameColorPicker";
import { formatDayMonthYear } from "@/lib/dates";
import { revalidateProfile } from "@/app/(site)/settings/actions";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 МБ

// Столько же, сколько в guard_username_change (миграция 20260821140000).
// ⚠️ Число живёт в двух местах, и это осознанно: здесь оно нужно, чтобы
// назвать дату ДО нажатия «Сохранить», а вычислять её запросом в базу
// ради подписи под полем — дороже, чем держать копию. Настоящее правило
// всё равно одно, и оно в триггере: разъедутся — сайт покажет неверную
// дату, но лишней смены не пропустит.
const USERNAME_COOLDOWN_DAYS = 30;

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

  // До какой даты username менять нельзя (30 дней с прошлой смены).
  // Считаем ЗДЕСЬ только для подписи под полем — настоящий запрет стоит
  // в триггере guard_username_change, и он же отказал бы, соври мы тут.
  // null — менять можно прямо сейчас (ни разу не меняли или месяц вышел).
  const lockedUntil = (() => {
    if (!initial.usernameChangedAt) return null;
    const until = new Date(initial.usernameChangedAt);
    until.setUTCDate(until.getUTCDate() + USERNAME_COOLDOWN_DAYS);
    return until > new Date() ? until : null;
  })();
  const [displayName, setDisplayName] = useState(initial.displayName);
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

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function pickAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Avatar must be an image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError("Avatar must be smaller than 2 MB.");
      return;
    }
    setError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createSupabaseBrowser();

    // Ник (display_name) больше НЕ проверяется на занятость: с
    // 2026-08-21 повторы разрешены, различает людей username.
    //
    // Форму адреса проверяем здесь только ради внятного сообщения —
    // настоящее правило стоит в базе (ограничение
    // profiles_username_format). Форма, повторяющая правило базы, ничего
    // не защищает: запись идёт из браузера прямо в profiles.
    const nextUsername = username.trim().toLowerCase();
    if (nextUsername !== initial.username) {
      if (!/^[a-z0-9_]{3,32}$/.test(nextUsername)) {
        setPending(false);
        setError(
          "Username can only use lowercase letters, numbers and underscores (3–32 characters)."
        );
        return;
      }

      const { data: available, error: rpcError } = await supabase.rpc(
        "username_available",
        { name: nextUsername }
      );
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

    // Новый аватар — заливаем в свою папку. Фиксированный путь + upsert:
    // новый файл перезаписывает старый, мусор в бакете не копится. ?v=…
    // сбивает кэш браузера/CDN, иначе после замены показался бы старый.
    let nextAvatarUrl = avatarUrl;
    if (avatarFile) {
      const path = `${userId}/avatar`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
        });
      if (uploadError) {
        setPending(false);
        setError(`Couldn't upload the avatar: ${uploadError.message}`);
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      nextAvatarUrl = `${data.publicUrl}?v=${Date.now()}`;
    }

    // RLS "own profile update" разрешает менять только свою строку.
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: nextUsername,
        display_name: displayName,
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
      setError(
        updateError.message.toLowerCase().includes("duplicate")
          ? "That username is already taken."
          : `Couldn't save: ${updateError.message}`
      );
      return;
    }

    // Дублируем ник и аватар в user_metadata: навбар читает их оттуда
    // (быстро, без запроса в БД на каждой странице). Без этого навбар
    // показывал бы старый ник после смены. updateUser поднимает событие
    // USER_UPDATED → useUser обновляет навбар сразу, без перезагрузки.
    await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        // Копия адреса — из неё навбар строит ссылку «мой профиль», не
        // ходя за ней в базу на каждой странице (см. Navbar).
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
    refresh();
    router.push("/settings");
  }

  const shownAvatar = avatarPreview ?? avatarUrl;

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-md rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 dark:border-zinc-800 dark:bg-zinc-950"
    >
      {/* Аватар + кнопка выбора файла */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="group relative h-24 w-24 cursor-pointer overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
          aria-label="Change avatar"
        >
          {shownAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shownAvatar}
              alt="Avatar"
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <UserCircle
              size={64}
              className="mx-auto text-zinc-300 dark:text-zinc-600"
            />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-zinc-950/0 text-transparent transition-colors group-hover:bg-zinc-950/50 group-hover:text-white">
            <Camera size={22} />
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          onChange={pickAvatar}
          className="hidden"
        />
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Click the avatar to change it (max 2 MB)
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {/* Ник и квадратик цвета — одной строкой. Цвет относится именно
            к нику, и стоять он должен рядом с ним, а не отдельной
            секцией ниже: так связь видна без подписи. */}
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <Field
              id="displayName"
              label="Display name"
              value={displayName}
              onChange={setDisplayName}
              required
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
              previewName={displayName}
            />
          )}
        </div>

        {/* Адрес профиля — отдельное поле с 2026-08-21 (миграция
            20260821120000). Раньше его роль тянул ник, и оттого смену
            ника приходилось бы запрещать: она уносила с собой адрес
            страницы, а освободившееся имя мог занять кто угодно.
            Теперь подпись меняется свободно, а адрес — осознанно.

            ⚠️ Ссылки на старый адрес после смены НЕ переезжают, и старое
            имя освобождается: пауза между сменами и резерв отпущенных
            имён обсуждены, но сознательно не сделаны (см. комментарий
            в самой миграции). Подпись под полем говорит об этом прямо. */}
        <div>
          <label
            htmlFor="username"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Username{" "}
            <span className="font-normal text-zinc-500 dark:text-zinc-400">
              — soucampus.online/creator/{username || "…"}
            </span>
          </label>
          <input
            id="username"
            type="text"
            value={username}
            // Приводим к нижнему регистру прямо при вводе, а не при
            // сохранении: иначе человек печатает «SouCampus», видит
            // «SouCampus», а сохраняется другое — и он вправе счесть это
            // поломкой.
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            required
            // Заблокировано, пока идёт месячная пауза. Это удобство, а не
            // защита: настоящий отказ даёт триггер guard_username_change,
            // и он же сработает, если поле разблокировать из инструментов
            // разработчика. Смысл блокировки в другом — не дать человеку
            // напечатать новое имя и узнать об отказе только после
            // нажатия «Сохранить».
            disabled={lockedUntil !== null}
            className="w-full rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
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
                Lowercase letters, numbers and underscores. This is your login
                and your profile link — you can change it once every{" "}
                {USERNAME_COOLDOWN_DAYS} days, and old links stop working.
              </>
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="firstName" label="First name" value={firstName} onChange={setFirstName} />
          <Field id="lastName" label="Last name" value={lastName} onChange={setLastName} />
        </div>

        {/* Bio — единственное публичное поле формы: оно показывается всем
            на /creator/<ник>, в отличие от имени/фамилии. Отдельная
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
