"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Key } from "@phosphor-icons/react";
import { useRefresh } from "@/lib/useRefresh";
import { Button } from "@/components/Button";
import { AuthField } from "@/components/AuthField";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { safeNextPath } from "@/lib/site";
import { AUTH_CARD } from "@/lib/auth-card";

// Ввод кода двухшагового входа (аудит 2026-11, S-25).
//
// Сюда уводит layout админки, когда пароль уже принят, а код из
// приложения в этой сессии ещё не вводили. Успешная проверка поднимает
// уровень сессии до aal2 — это делает сам Supabase Auth, наш сервер в
// обмене не участвует, — и только после этого /admin открывается.
//
// ⚠️ Пускает не эта форма. Она лишь помогает получить нужный уровень
// сессии; спрашивает его сервер на каждом запросе к админке
// (getAdminGate), и открыть /admin мимо формы не получится.


export function TwoStepChallenge({ next }: { next?: string }) {
  const router = useRouter();
  const refresh = useRefresh();
  // Куда вести после кода — через общую проверку: `next` приходит из
  // адреса, и чужой адрес туда подставить не должно быть возможно.
  const target = safeNextPath(next, "/admin");

  const [factorId, setFactorId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createSupabaseBrowser();
      const { data } = await supabase.auth.mfa.listFactors();
      if (!active) return;
      const verified = (data?.totp ?? []).find((factor) => factor.status === "verified");
      setFactorId(verified?.id ?? null);
      setChecking(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!factorId) return;
    setError(null);
    setPending(true);
    const supabase = createSupabaseBrowser();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.trim(),
    });
    setPending(false);
    if (verifyError) {
      setError("That code didn't match. Wait for a new one in the app and try again.");
      setCode("");
      return;
    }
    refresh();
    router.push(target);
  }

  if (checking) {
    return (
      <div className={`${AUTH_CARD} text-center`}>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Checking…</p>
      </div>
    );
  }

  // Не вошёл или приложение не привязано: спрашивать код не у кого.
  if (!factorId) {
    return (
      <div className={`${AUTH_CARD} text-center`}>
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Nothing to confirm here
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This account has no two-step sign-in, or you&apos;re signed out.
        </p>
        <div className="mt-6">
          <Button href="/login" size="sm" className="w-full">
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={AUTH_CARD}>
      <AuthField
        id="two-step-code"
        label="Code from your authenticator app"
        icon={<Key size={18} />}
        type="text"
        value={code}
        onChange={setCode}
        placeholder="123456"
        autoComplete="one-time-code"
        required
      />

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6">
        <Button type="submit" size="sm" loading={pending} disabled={pending} className="w-full">
          {pending ? "Checking…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
