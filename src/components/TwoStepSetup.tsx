"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Key, Trash } from "@phosphor-icons/react";
import { useRefresh } from "@/lib/useRefresh";
import { Button, BUTTON_PILL, DANGER_COLORS } from "@/components/Button";
import { AuthField } from "@/components/AuthField";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { AUTH_CARD } from "@/lib/auth-card";

// Включение и выключение двухшагового входа (аудит 2026-11, S-25).
//
// Как это устроено у Supabase, коротко:
//   1) enroll — сервер заводит «фактор» и отдаёт секрет: строкой и
//      картинкой-QR. Приложение-аутентификатор (Google Authenticator,
//      1Password, Authy…) запоминает секрет и дальше само считает из него
//      шестизначный код, который меняется раз в 30 секунд;
//   2) challenge + verify — человек вводит код, сервер считает тот же код
//      из того же секрета и сравнивает. Совпало — фактор «подтверждён», а
//      сессия получает уровень aal2;
//   3) с этого момента /admin пускает только сессию aal2 (lib/admin.ts).
//
// Весь обмен идёт из браузера прямо в Supabase Auth — это формы Auth, им
// разрешено (инвариант 1). Секрет через наш сервер не проходит и у нас
// не хранится.
//
// ⚠️ Решает не этот компонент. Он только привязывает приложение; требует
// код сервер, и обойти это, не открывая страницу, нельзя.

type Factor = { id: string; friendlyName: string | null; createdAt: string };

type Enrolling = { factorId: string; qr: string; secret: string };


/** Привязанные приложения. Только подтверждённые: брошенная привязка кодов не даёт. */
async function fetchFactors(): Promise<{ factors: Factor[]; error: string | null }> {
  const { data, error } = await createSupabaseBrowser().auth.mfa.listFactors();
  if (error) return { factors: [], error: error.message };
  return {
    error: null,
    factors: (data?.totp ?? [])
      .filter((factor) => factor.status === "verified")
      .map((factor) => ({
        id: factor.id,
        friendlyName: factor.friendly_name ?? null,
        createdAt: factor.created_at,
      })),
  };
}

export function TwoStepSetup() {
  const refresh = useRefresh();
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const result = await fetchFactors();
    if (result.error) setError(result.error);
    else setFactors(result.factors);
  }

  // Первая загрузка. Состояние ставится ПОСЛЕ await и только если
  // компонент ещё на странице — тот же приём, что в ResetPasswordForm.
  useEffect(() => {
    let active = true;
    (async () => {
      const result = await fetchFactors();
      if (!active) return;
      if (result.error) setError(result.error);
      else setFactors(result.factors);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function start() {
    setError(null);
    setPending(true);
    const supabase = createSupabaseBrowser();

    // Брошенные попытки убираем: у фактора имя уникально, и вторая
    // привязка с тем же именем иначе упёрлась бы в первую, недоделанную.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const factor of existing?.all ?? []) {
      if (factor.status !== "verified") {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      // Имя — чтобы два приложения (телефон и запасное) различались в списке.
      friendlyName: `Authenticator ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    });
    setPending(false);
    if (enrollError || !data) {
      setError(enrollError?.message ?? "Couldn't start the setup. Try again.");
      return;
    }
    setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    if (!enrolling) return;
    setError(null);
    setPending(true);
    const supabase = createSupabaseBrowser();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolling.factorId,
      code: code.trim(),
    });
    setPending(false);
    if (verifyError) {
      setError("That code didn't match. Wait for a new one in the app and try again.");
      return;
    }
    setEnrolling(null);
    setCode("");
    await load();
    // Серверная часть страницы (плашка в шапке админки) перечитывает сессию.
    refresh();
  }

  async function remove(factorId: string) {
    setError(null);
    setPending(true);
    const supabase = createSupabaseBrowser();
    const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId });
    setPending(false);
    if (removeError) {
      setError(removeError.message);
      return;
    }
    await load();
    refresh();
  }

  if (loading) {
    return (
      <div className={`${AUTH_CARD} text-center`}>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Checking…</p>
      </div>
    );
  }

  if (enrolling) {
    return (
      <form onSubmit={confirm} className={AUTH_CARD}>
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Scan this in your authenticator app
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Google Authenticator, 1Password, Authy, any of them. Then type the
          six digits it shows.
        </p>

        {/* QR — картинка data:, её отдаёт сам Supabase Auth. Обычный <img>,
            не next/image: оптимизатору data-адрес не нужен, а секрет в
            адресе запроса к /_next/image — как раз то, чего не должно быть.
            Белая подложка обязательна и в тёмной теме: чёрный QR на тёмном
            фоне камера не читает. */}
        <div className="mt-5 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrolling.qr}
            alt="QR code for your authenticator app"
            width={200}
            height={200}
            // #fbfbff, как весь «белый» сайта (DESIGN.md): камера читает
            // код на нём так же, как на чистом белом (отчёт 16.11).
            className="rounded-2xl bg-[#fbfbff] p-3"
          />
        </div>

        <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Can&apos;t scan? Enter this key by hand:
        </p>
        <p className="mt-1 break-all text-center font-mono text-sm text-zinc-950 dark:text-zinc-50">
          {enrolling.secret}
        </p>

        <div className="mt-6">
          <AuthField
            id="two-step-code"
            label="Code from the app"
            icon={<Key size={18} />}
            type="text"
            value={code}
            onChange={setCode}
            placeholder="123456"
            autoComplete="one-time-code"
            required
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <Button type="submit" size="sm" loading={pending} disabled={pending} className="flex-1">
            {pending ? "Checking…" : "Turn on"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setEnrolling(null);
              setCode("");
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className={AUTH_CARD}>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            factors.length
              ? "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300"
              : "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
          }`}
        >
          <ShieldCheck size={22} weight="fill" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {factors.length ? "Two-step sign-in is on" : "Two-step sign-in is off"}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {factors.length
              ? "The admin asks for a code from your app in every new session."
              : "A password alone opens the admin."}
          </p>
        </div>
      </div>

      {factors.length > 0 && (
        <ul className="mt-6 space-y-2">
          {factors.map((factor) => (
            <li
              key={factor.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <span className="min-w-0 truncate text-sm text-zinc-950 dark:text-zinc-50">
                {factor.friendlyName ?? "Authenticator app"}
              </span>
              <button
                type="button"
                onClick={() => remove(factor.id)}
                disabled={pending}
                className={`${BUTTON_PILL} ${DANGER_COLORS.quiet}`}
              >
                <Trash size={16} weight="bold" />
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6">
        <Button type="button" size="sm" onClick={start} loading={pending} disabled={pending} className="w-full">
          {pending ? "Starting…" : factors.length ? "Add another app" : "Turn on two-step sign-in"}
        </Button>
      </div>

      {/* Запасное приложение — вместо резервных кодов, которых у Supabase
          нет: потеряли единственный телефон — в админку не войти, пока
          фактор не удалят в панели Supabase. */}
      <p className="mt-4 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        Add a second app on another device as a spare. If the only phone is
        lost, the way back in is through the Supabase dashboard.
      </p>
    </div>
  );
}
