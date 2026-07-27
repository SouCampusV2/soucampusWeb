"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, Camera } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Profile } from "@/lib/profiles";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 МБ

export function ProfileEditForm({
  initial,
  userId,
}: {
  initial: Profile;
  userId: string;
}) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [firstName, setFirstName] = useState(initial.firstName ?? "");
  const [lastName, setLastName] = useState(initial.lastName ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");

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
    router.refresh();
    router.push("/profile");
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
        <Button href="/profile" variant="secondary" className="flex-1">
          Cancel
        </Button>
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
