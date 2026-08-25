"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRefresh } from "@/lib/useRefresh";
import Link from "next/link";
import { EnvelopeSimple, Lock, User } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { PASSWORD_RULES, friendlyAuthError } from "@/lib/password";
import { PasswordChecklist } from "@/components/PasswordChecklist";
import { AuthField } from "@/components/AuthField";
import { safeNextPath } from "@/lib/site";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

type Mode = "login" | "signup";

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const router = useRouter();
  const refresh = useRefresh();
  const isSignup = mode === "signup";

  // Куда вести после успеха — через общую проверку (см. safeNextPath):
  // только относительный путь своего сайта, иначе /marketplace.
  const target = safeNextPath(next);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [username, setUsername] = useState("");
  const [pwTouched, setPwTouched] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentConfirm, setSentConfirm] = useState(false);

  const passwordOk = PASSWORD_RULES.every((r) => r.test(password));
  // Пароли совпадают? Пустое поле подтверждения — ещё не ошибка.
  const passwordsMatch = password === confirm;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createSupabaseBrowser();

    if (isSignup) {
      // Имя проверяем на занятость ДО регистрации: profiles аноним читать
      // не может (RLS), поэтому спрашиваем функцию username_available.
      // Так человек видит понятное «имя занято», а не сырую ошибку
      // триггера — и, главное, не теряет уже введённые пароль и почту.
      //
      // Настоящую уникальность держит индекс по lower(username): между
      // этой проверкой и вставкой имя может занять кто-то другой. Тогда
      // сработает он, и регистрация откатится целиком.
      const { data: available, error: rpcError } = await supabase.rpc(
        "username_available",
        { name: username }
      );
      if (rpcError) {
        setPending(false);
        setError("Couldn't check the username. Please try again.");
        return;
      }
      if (!available) {
        setPending(false);
        setError(`The username “${username}” is already taken.`);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          // Ссылка из письма ведёт в наш route handler /auth/callback,
          // который обменивает код на сессию и логинит (см. тот файл).
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      setPending(false);
      if (error) {
        setError(friendlyAuthError(error.message));
        return;
      }
      // Если подтверждение email выключено, Supabase сразу отдаёт сессию —
      // пользователь уже залогинен, письма нет, ведём в магазин. Если
      // включено — сессии нет, показываем «проверь почту».
      if (data.session) {
        refresh();
        router.push(target);
        return;
      }
      setSentConfirm(true);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setPending(false);
    if (error) {
      setError(friendlyAuthError(error.message));
      return;
    }
    refresh();
    router.push(target);
  }

  if (sentConfirm) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-lime-100 dark:bg-lime-950">
          <EnvelopeSimple
            size={24}
            className="text-lime-600 dark:text-lime-300"
            weight="bold"
          />
        </div>
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Check your inbox
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          We sent a confirmation link to{" "}
          <span className="font-medium text-zinc-950 dark:text-zinc-50">
            {email}
          </span>
          . Click it to activate your account — you&apos;ll be signed in
          automatically.
        </p>
        <div className="mt-6">
          <Button href="/login" variant="secondary" size="sm" className="w-full">
            Back to sign in
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
      {/* Google СВЕРХУ, до полей (решение владельца 25.08). Человек
          должен увидеть быстрый путь раньше, чем начнёт заполнять форму:
          увидев его после, он уже потратил силы и просто дозаполнит —
          то есть кнопка не сработает ни разу и будет выглядеть лишней. */}
      <div className="mb-6">
        <GoogleSignInButton mode={mode} />

        {/* Разделитель «or» — черта, прерванная словом. Слово лежит на
            фоне карточки (bg-[#fbfbff] / dark:bg-zinc-950), поэтому цвет
            здесь повторяет её дословно: разойдутся — под текстом
            проступит линия. */}
        <div className="relative mt-6" aria-hidden>
          <div className="h-px w-full bg-zinc-200 dark:bg-zinc-800" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#fbfbff] px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:bg-zinc-950 dark:text-zinc-500">
            or
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {isSignup && (
          <AuthField
            id="username"
            label="Username"
            icon={<User size={18} />}
            value={username}
            onChange={setUsername}
            type="text"
            placeholder="Your name on the site"
            autoComplete="username"
            required
          />
        )}
        <AuthField
          id="email"
          label="Email"
          icon={<EnvelopeSimple size={18} />}
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <div>
          <AuthField
            id="password"
            label="Password"
            icon={<Lock size={18} />}
            value={password}
            onChange={setPassword}
            onFocus={() => setPwTouched(true)}
            type="password"
            revealable
            placeholder={isSignup ? "Create a strong password" : "Your password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
          />
          {isSignup && (pwTouched || password.length > 0) && (
            <PasswordChecklist password={password} />
          )}
          {/* Только на входе: при регистрации сбрасывать нечего. */}
          {!isSignup && (
            <div className="mt-2 text-right">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-zinc-500 underline decoration-1 underline-offset-4 transition-colors hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400"
              >
                Forgot your password?
              </Link>
            </div>
          )}
        </div>

        {isSignup && (
          <div>
            <AuthField
              id="confirm"
              label="Confirm password"
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
        )}
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
          // При регистрации блокируем, пока пароль не прошёл все правила
          // И пароли не совпали.
          disabled={pending || (isSignup && (!passwordOk || !passwordsMatch))}
          className="w-full"
        >
          {pending
            ? "Please wait…"
            : isSignup
              ? "Create account"
              : "Sign in"}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        {isSignup ? "Already have an account? " : "New here? "}
        <Link
          href={`${isSignup ? "/login" : "/signup"}${
            next ? `?next=${encodeURIComponent(next)}` : ""
          }`}
          className="font-semibold text-orange-500 underline decoration-2 underline-offset-4 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-500"
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
