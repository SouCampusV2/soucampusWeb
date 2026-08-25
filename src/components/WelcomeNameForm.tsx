"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { AuthField } from "@/components/AuthField";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { markNameClaimed } from "@/app/(site)/welcome/actions";

// Выбор имени после первого входа через Google.
//
// ⚠️ ЭТО НЕ ЗАПОЛНЕНИЕ ПУСТОГО ПОЛЯ, А СМЕНА ИМЕНИ. Состояния «профиль
// без имени» у нас не существует: handle_new_user назначает имя всегда и
// без метаданных берёт локальную часть почты. Поэтому здесь идёт
// обычный update, и вся разница — в колонке username_claimed: пока она
// false, guard_username_change пропускает смену бесплатно и не начинает
// месячную паузу (миграция 20260825120000).
//
// Из этого следует важное: бесплатна ровно ОДНА такая смена. Дальше
// человек попадает под общее правило, как и все.

export function WelcomeNameForm({ suggested }: { suggested: string }) {
  const router = useRouter();
  const [username, setUsername] = useState(suggested);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const name = username.trim();
    if (!name || pending) return;

    setPending(true);
    setError(null);

    const supabase = createSupabaseBrowser();

    // Проверка занятости — тем же RPC, что и форма регистрации. Она знает
    // и про зарезервированные имена (починено 21.08, до этого проверка и
    // запрет отвечали на один вопрос по-разному).
    const { data: available, error: rpcError } = await supabase.rpc(
      "username_available",
      { name }
    );
    if (rpcError) {
      setPending(false);
      setError("Couldn't check that name. Please try again.");
      return;
    }
    if (!available) {
      setPending(false);
      setError(`The name “${name}” is already taken.`);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ username: name })
      .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");

    if (updateError) {
      setPending(false);
      // Гонка: между проверкой выше и записью имя мог занять другой.
      // Проверка — удобство, гарантия — уникальный индекс.
      const message = updateError.message.toLowerCase();
      if (
        message.includes("duplicate") ||
        message.includes("username_reserved")
      ) {
        setError("That name is already taken.");
        return;
      }
      // Текст ошибки базы наружу не отдаём — он рассказывает о схеме.
      console.warn(`Имя не сохранилось: ${updateError.message}`);
      setError("Couldn't save that name. Please try again.");
      return;
    }

    // Навбар читает ник из user_metadata, а не из БД (быстро, без запроса
    // на каждой странице). Без этой строки он показывал бы имя,
    // придуманное базой, до следующего входа.
    await supabase.auth.updateUser({ data: { username: name } });

    // Ставим признак «имя заявлено» для гейта в proxy.ts — чтобы он
    // перестал ходить в базу на каждый переход. Разбор — в самом proxy.
    await markNameClaimed();

    router.replace("/marketplace");
    router.refresh();
  }

  return (
    <form
      onSubmit={save}
      className="mx-auto max-w-md rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <AuthField
        id="username"
        label="Your name on the site"
        icon={<User size={18} />}
        value={username}
        onChange={setUsername}
        type="text"
        placeholder="How people will know you"
        autoComplete="username"
        required
      />

      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
        Letters, numbers and underscores. This is the name on your profile,
        your comments and your maps — and your address here:{" "}
        <span className="font-medium text-zinc-950 dark:text-zinc-50">
          /@{username.trim() || "yourname"}
        </span>
      </p>

      {/* Про паузу говорим ЗДЕСЬ, а не после сохранения — тот же приём,
          что в настройках профиля (правка 24.08): правило, показанное в
          момент решения, читают; то же правило в общей серой подписи —
          нет. Разница в том, что здесь смена бесплатна, и сказать надо
          не «ты потратишь», а «дальше будет дороже». */}
      <p className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
        Choosing now is free. After this, changing your name is limited to
        once every 30 days.
      </p>

      {error && (
        <p
          className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="mt-6">
        <Button
          type="submit"
          variant="primary"
          disabled={pending || username.trim() === ""}
          className="w-full"
        >
          {pending ? "Saving…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
