"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  EnvelopeSimple,
  Lock,
  User,
  CheckCircle,
  Circle,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Mode = "login" | "signup";

// Требования к паролю при регистрации. Каждое правило — подпись + функция
// проверки. Держим их списком, чтобы одним и тем же массивом и рисовать
// подсказки-чеклист, и решать, можно ли отправлять форму.
const PASSWORD_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "A number", test: (p) => /[0-9]/.test(p) },
  { label: "A symbol (!?@#…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

// Переводим технические сообщения Supabase в человеческие. Заодно
// страхуемся от пустого/мусорного текста (был случай, когда ошибка
// триггера БД приходила как "{}").
function friendlyAuthError(message?: string): string {
  const m = (message ?? "").toLowerCase();
  if (
    m.includes("already registered") ||
    m.includes("already exists") ||
    m.includes("user already")
  ) {
    return "This email is already registered — try signing in instead.";
  }
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "Wrong email or password.";
  }
  return message && message !== "{}"
    ? message
    : "Something went wrong. Please try again.";
}

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const router = useRouter();
  const isSignup = mode === "signup";

  // Куда вести после успеха. Только относительный путь на своём сайте:
  // "//..." (протокол-относительный) и абсолютные URL отсекаем, иначе
  // ?next=//evil.com стал бы open redirect на чужой домен.
  const target =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/shop";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
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
      // Заранее проверяем, свободен ли ник — таблицу profiles аноним
      // читать не может (RLS), поэтому спрашиваем функцию из БД
      // display_name_available (см. миграцию). Так пользователь видит
      // понятное «ник занят», а не сырую ошибку триггера.
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

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
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
        router.refresh();
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
    router.refresh();
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
      <div className="space-y-4">
        {isSignup && (
          <Field
            id="displayName"
            label="Display name"
            icon={<User size={18} />}
            value={displayName}
            onChange={setDisplayName}
            type="text"
            placeholder="How others will see you"
            autoComplete="nickname"
            required
          />
        )}
        <Field
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
          <Field
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
            <ul className="mt-2.5 space-y-1">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(password);
                return (
                  <li
                    key={rule.label}
                    className={`flex items-center gap-1.5 text-xs ${
                      ok
                        ? "text-lime-600 dark:text-lime-400"
                        : "text-zinc-500 dark:text-zinc-500"
                    }`}
                  >
                    {ok ? (
                      <CheckCircle size={14} weight="fill" />
                    ) : (
                      <Circle size={14} />
                    )}
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {isSignup && (
          <div>
            <Field
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

// Одно поле формы: подпись + иконка внутри рамки + сам input.
// `revealable` добавляет кнопку-глаз справа (показать/скрыть) и сам
// переключает type между password и text — состояние живёт внутри поля.
function Field({
  id,
  label,
  icon,
  value,
  onChange,
  onFocus,
  type,
  revealable = false,
  placeholder,
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  type: string;
  revealable?: boolean;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  // Если поле раскрываемое и показ включён — показываем текст, иначе
  // остаёмся тем типом, что передали (обычно "password").
  const effectiveType = revealable && show ? "text" : type;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
          {icon}
        </span>
        <input
          id={id}
          type={effectiveType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={`w-full rounded-2xl border border-zinc-950/[0.08] bg-transparent py-3 pl-11 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500 ${
            revealable ? "pr-11" : "pr-4"
          }`}
        />
        {revealable && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            {show ? <EyeSlash size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}
