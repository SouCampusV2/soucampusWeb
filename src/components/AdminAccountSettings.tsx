"use client";

import { useEffect, useState } from "react";
import { EnvelopeSimple, Lock } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { AuthField } from "@/components/AuthField";
import { PasswordChecklist } from "@/components/PasswordChecklist";
import { AUTH_CARD } from "@/lib/auth-card";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { friendlyAuthError, passwordMeetsRules } from "@/lib/password";

// Настройки аккаунта админа: пароль, почта, выход на других устройствах
// (просьба владельца 17.11 — «в админке не хватает settings»).
//
// Всё через updateUser/signOut самого Supabase Auth от имени вошедшего:
// своих обработчиков и сервисного ключа здесь нет, база ничего не решает
// за Auth. Сюда пускает только гейт админки (layout), а с привязанным
// приложением — только сессия aal2, поэтому сменить пароль или почту
// одним украденным паролем нельзя: до этой страницы без кода не дойти.
//
// Почта меняется не сразу: Supabase шлёт письмо-подтверждение (при
// включённом «Secure email change» — на старый и на новый адрес), и
// новая почта начинает работать только после перехода по ссылке.

type Status = { kind: "ok" | "error"; text: string } | null;

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p
      className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
        status.kind === "ok"
          ? "bg-lime-50 text-lime-800 dark:bg-lime-950/40 dark:text-lime-300"
          : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
      }`}
    >
      {status.text}
    </p>
  );
}

export function AdminAccountSettings() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    let active = true;
    createSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        if (active) setEmail(data.user?.email ?? "");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PasswordCard email={email} />
      <EmailCard email={email} />
      <SessionsCard />
    </div>
  );
}

function PasswordCard({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const matches = password === confirm;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    const { error } = await createSupabaseBrowser().auth.updateUser({ password });
    setPending(false);
    if (error) {
      setStatus({ kind: "error", text: friendlyAuthError(error.message) });
      return;
    }
    setPassword("");
    setConfirm("");
    setStatus({ kind: "ok", text: "Password changed. Use it the next time you sign in." });
  }

  return (
    <form onSubmit={submit} className={AUTH_CARD}>
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Password</h2>
      <div className="mt-4 space-y-4">
        {/* Видимое поле с логином — для менеджеров паролей: скрытое
            (display:none) они игнорируют, разбор в ResetPasswordForm. */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Account</span>
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            className="w-full cursor-default rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-3 text-sm text-zinc-500 focus:outline-none dark:border-zinc-50/[0.08] dark:text-zinc-400"
          />
        </div>
        <div>
          <AuthField
            id="admin-new-password"
            label="New password"
            icon={<Lock size={18} />}
            value={password}
            onChange={setPassword}
            type="password"
            revealable
            autoComplete="new-password"
            required
          />
          {password.length > 0 && <PasswordChecklist password={password} />}
        </div>
        <div>
          <AuthField
            id="admin-confirm-password"
            label="Confirm new password"
            icon={<Lock size={18} />}
            value={confirm}
            onChange={setConfirm}
            type="password"
            revealable
            autoComplete="new-password"
            required
          />
          {confirm.length > 0 && !matches && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">Passwords don&apos;t match.</p>
          )}
        </div>
      </div>
      <StatusLine status={status} />
      <div className="mt-6">
        <Button
          type="submit"
          variant="primary"
          loading={pending} disabled={pending || !passwordMeetsRules(password) || !matches}
          className="w-full"
        >
          {pending ? "Saving…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}

function EmailCard({ email }: { email: string }) {
  const [next, setNext] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    const { error } = await createSupabaseBrowser().auth.updateUser({ email: next.trim() });
    setPending(false);
    if (error) {
      setStatus({ kind: "error", text: friendlyAuthError(error.message) });
      return;
    }
    setStatus({
      kind: "ok",
      text: "Check your inbox: the change takes effect after you open the confirmation link.",
    });
  }

  return (
    <form onSubmit={submit} className={AUTH_CARD}>
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Email</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Now: <span className="font-medium text-zinc-950 dark:text-zinc-50">{email || "…"}</span>
      </p>
      <div className="mt-4">
        <AuthField
          id="admin-new-email"
          label="New email"
          icon={<EnvelopeSimple size={18} />}
          value={next}
          onChange={setNext}
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <StatusLine status={status} />
      <div className="mt-6">
        <Button
          type="submit"
          variant="primary"
          loading={pending} disabled={pending || !next.includes("@") || next.trim() === email}
          className="w-full"
        >
          {pending ? "Sending…" : "Change email"}
        </Button>
      </div>
    </form>
  );
}

// scope "others" — выйти везде, кроме этого браузера: на случай, если
// пароль мог утечь или остался вход на чужом компьютере.
function SessionsCard() {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function signOutOthers() {
    setPending(true);
    setStatus(null);
    const { error } = await createSupabaseBrowser().auth.signOut({ scope: "others" });
    setPending(false);
    setStatus(
      error
        ? { kind: "error", text: friendlyAuthError(error.message) }
        : { kind: "ok", text: "Signed out everywhere except this browser." }
    );
  }

  return (
    <div className={AUTH_CARD}>
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Other devices</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Signed in somewhere you no longer use, or worried someone has your password? End every other
        session — this browser stays signed in.
      </p>
      <StatusLine status={status} />
      <div className="mt-6">
        <Button type="button" variant="secondary" onClick={signOutOthers} loading={pending} disabled={pending} className="w-full">
          {pending ? "Signing out…" : "Sign out other devices"}
        </Button>
      </div>
    </div>
  );
}
