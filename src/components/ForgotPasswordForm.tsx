"use client";

import { useState } from "react";
import Link from "next/link";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { AuthField } from "@/components/AuthField";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

// Запрос ссылки на сброс пароля.
//
// Важное поведение: об успехе сообщаем ОДИНАКОВО независимо от того,
// зарегистрирован такой адрес или нет. Разный ответ («письмо отправлено»
// против «такого пользователя нет») превратил бы форму в проверялку
// чужих адресов — можно было бы перебором выяснить, кто зарегистрирован
// на сайте. Supabase по той же причине и сам не сообщает об этом.
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createSupabaseBrowser();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      // Ссылка из письма ведёт в тот же route handler, что подтверждение
      // регистрации: он обменивает одноразовый код на сессию и уже с ней
      // отправляет на страницу смены пароля. Без сессии обновить пароль
      // нечем — updateUser работает только от имени пользователя.
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setPending(false);

    // Ошибку показываем только техническую (сеть/лимит). «Нет такого
    // пользователя» сюда не приходит — см. комментарий к компоненту.
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
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
          If{" "}
          <span className="font-medium text-zinc-950 dark:text-zinc-50">
            {email}
          </span>{" "}
          has an account, a reset link is on its way. The link works once and
          expires within the hour.
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

      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-6">
        <Button type="submit" variant="primary" disabled={pending} className="w-full">
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-semibold text-orange-500 underline decoration-2 underline-offset-4 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-500"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
