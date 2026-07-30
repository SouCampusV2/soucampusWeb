"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { AuthField } from "@/components/AuthField";
import { PasswordChecklist } from "@/components/PasswordChecklist";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { passwordMeetsRules, friendlyAuthError } from "@/lib/password";

// Установка нового пароля после перехода по ссылке из письма.
//
// К моменту показа этой формы пользователь УЖЕ залогинен: одноразовый код
// из письма обменял на сессию /auth/callback. Поэтому смена пароля —
// обычный updateUser, никаких токенов руками мы не носим.
//
// Проверка сессии на клиенте, а не на сервере: сессия приезжает в cookie
// через callback, но страница может открыться и напрямую (кто-то сохранил
// адрес) — тогда менять нечего, и честнее сказать это сразу, чем показать
// форму, которая молча не сработает.
export function ResetPasswordForm() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  // Нужен не для показа, а для менеджеров паролей — см. скрытое поле
  // username в форме ниже.
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createSupabaseBrowser();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      setHasSession(Boolean(session));
      setEmail(session?.user.email ?? "");
      setChecking(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const passwordOk = passwordMeetsRules(password);
  const passwordsMatch = password === confirm;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createSupabaseBrowser();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setPending(false);
    if (updateError) {
      setError(friendlyAuthError(updateError.message));
      return;
    }
    setDone(true);
    // Сессия уже действующая — обновляем серверные компоненты, чтобы
    // навбар и защищённые страницы увидели вошедшего пользователя.
    router.refresh();
  }

  if (checking) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Checking your link…</p>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          This link doesn&apos;t work anymore
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Reset links can be used once and expire within the hour. Request a
          fresh one and try again.
        </p>
        <div className="mt-6">
          <Button href="/forgot-password" variant="primary" size="sm" className="w-full">
            Request a new link
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-lime-100 dark:bg-lime-950">
          <CheckCircle
            size={24}
            className="text-lime-600 dark:text-lime-300"
            weight="fill"
          />
        </div>
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Password updated
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          You&apos;re signed in with your new password.
        </p>
        <div className="mt-6">
          <Button href="/settings" variant="primary" size="sm" className="w-full">
            Go to settings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-md rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 dark:border-zinc-800 dark:bg-zinc-950"
    >
      {/* Скрытое поле с логином — обязательный приём для менеджеров
          паролей (и Chrome, и Safari, и 1Password): без него страница
          выглядит как форма «просто с двумя паролями», и новый пароль
          не привязывается к аккаунту — предложения сохранить не будет,
          либо запись создастся без имени пользователя. */}
      <input
        type="text"
        name="username"
        autoComplete="username"
        value={email}
        readOnly
        aria-hidden
        tabIndex={-1}
        className="hidden"
      />

      <div className="space-y-4">
        <div>
          <AuthField
            id="password"
            label="New password"
            icon={<Lock size={18} />}
            value={password}
            onChange={setPassword}
            type="password"
            revealable
            placeholder="Create a strong password"
            autoComplete="new-password"
            required
          />
          {password.length > 0 && <PasswordChecklist password={password} />}
        </div>

        <div>
          <AuthField
            id="confirm"
            label="Confirm new password"
            icon={<Lock size={18} />}
            value={confirm}
            onChange={setConfirm}
            type="password"
            revealable
            placeholder="Repeat your password"
            autoComplete="new-password"
            required
          />
          {confirm.length > 0 && !passwordsMatch && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              Passwords don&apos;t match.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-6">
        <Button
          type="submit"
          variant="primary"
          disabled={pending || !passwordOk || !passwordsMatch}
          className="w-full"
        >
          {pending ? "Saving…" : "Set new password"}
        </Button>
      </div>
    </form>
  );
}
