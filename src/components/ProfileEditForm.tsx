"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRefresh } from "@/lib/useRefresh";
import Link from "next/link";
import { UserCircle, Camera, Key } from "@phosphor-icons/react";
import { Button, BUTTON_COLORS } from "@/components/Button";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Profile } from "@/lib/profiles";
import { NAME_COLORS } from "@/lib/name-colors";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 МБ

export function ProfileEditForm({
  initial,
  userId,
}: {
  initial: Profile;
  userId: string;
}) {
  const router = useRouter();
  const refresh = useRefresh();

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

    // Ник изменился — проверяем, что свободен (та же функция, что на
    // регистрации). Если не менялся, проверять незачем: он уже наш.
    if (displayName !== initial.displayName) {
      const { data: available, error: rpcError } = await supabase.rpc(
        "display_name_available",
        { name: displayName }
      );
      if (rpcError) {
        setPending(false);
        setError("Couldn't check the display name. Please try again.");
        return;
      }
      if (!available) {
        setPending(false);
        setError(`The display name “${displayName}” is already taken.`);
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
      // Уникальный индекс по нику мог отклонить на гонке — покажем по-людски.
      setError(
        updateError.message.toLowerCase().includes("duplicate")
          ? "That display name is already taken."
          : `Couldn't save: ${updateError.message}`
      );
      return;
    }

    // Дублируем ник и аватар в user_metadata: навбар читает их оттуда
    // (быстро, без запроса в БД на каждой странице). Без этого навбар
    // показывал бы старый ник после смены. updateUser поднимает событие
    // USER_UPDATED → useUser обновляет навбар сразу, без перезагрузки.
    await supabase.auth.updateUser({
      data: { display_name: displayName, avatar_url: nextAvatarUrl },
    });

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
              className="h-full w-full object-cover"
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
        <Field id="displayName" label="Display name" value={displayName} onChange={setDisplayName} required />
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

        {/* Цвет ника — только у купивших. Тем, у кого права нет, поле не
            показывается вовсе: предлагать выбор, который база отвергнет,
            хуже, чем не предлагать. Настоящий запрет — триггер
            protect_name_color (миграция 20260820130000).

            Выборка, а не пипетка (решение владельца 2026-08-20): в двух
            темах фон под ником противоположный, и свободный цвет легко
            выбрать так, что во второй теме он пропадёт. Почему именно
            эти восемь и какой у них контраст — в lib/name-colors.ts. */}
        {initial.isClient && (
          <div>
            <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Name colour{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">
                — yours because you bought a map
              </span>
            </span>

            {/* radiogroup, а не набор кнопок: выбор ОДИН из списка, и
                клавиатура со средством чтения должны понимать это сами. */}
            <div role="radiogroup" aria-label="Name colour" className="flex flex-wrap items-center gap-2">
              {/* «Без цвета» стоит первым и всегда доступен: отказаться
                  от украшения должно быть так же просто, как выбрать. */}
              <button
                type="button"
                role="radio"
                aria-checked={nameColor === ""}
                aria-label="Default"
                onClick={() => setNameColor("")}
                className={`h-9 w-9 rounded-full border-2 text-xs font-semibold transition ${
                  nameColor === ""
                    ? "border-zinc-950 dark:border-zinc-50"
                    : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                } bg-zinc-950/[0.06] text-zinc-600 dark:bg-zinc-50/[0.08] dark:text-zinc-300`}
              >
                A
              </button>

              {NAME_COLORS.map((colour) => (
                <button
                  key={colour.value}
                  type="button"
                  role="radio"
                  aria-checked={nameColor === colour.value}
                  aria-label={colour.label}
                  title={colour.label}
                  onClick={() => setNameColor(colour.value)}
                  className={`h-9 w-9 rounded-full border-2 transition ${
                    nameColor === colour.value
                      ? "border-zinc-950 dark:border-zinc-50"
                      : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                  style={{ backgroundColor: colour.value }}
                />
              ))}
            </div>

            {/* Предпросмотр на обоих фонах сразу. Палитра подобрана так,
                что читается в обеих темах, — но увидеть это своими
                глазами всё равно полезнее, чем поверить на слово. */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-[#fbfbff] px-3 py-1.5 text-sm font-semibold">
                <span style={nameColor ? { color: nameColor } : { color: "#09090b" }}>
                  {displayName || "Your name"}
                </span>
              </span>
              <span className="rounded-lg bg-zinc-950 px-3 py-1.5 text-sm font-semibold">
                <span style={nameColor ? { color: nameColor } : { color: "#fafafa" }}>
                  {displayName || "Your name"}
                </span>
              </span>
            </div>
          </div>
        )}
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
