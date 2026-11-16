import type { Metadata } from "next";
import Link from "next/link";
import { AdminAccountSettings } from "@/components/AdminAccountSettings";
import { INLINE_LINK } from "@/components/Button";

export const metadata: Metadata = {
  title: "Account settings",
  robots: { index: false, follow: false },
};

// Настройки аккаунта админа (17.11): пароль, почта, другие устройства.
// Внутри /admin — значит, за гейтом layout (и за кодом из приложения, если
// оно привязано). Разбор — в AdminAccountSettings.
export default function AdminAccountPage() {
  return (
    <div className="px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Account settings
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Password, email and devices for this admin. The code from your phone lives in{" "}
          <Link href="/admin/security" className={INLINE_LINK}>
            Two-step sign-in
          </Link>
          .
        </p>
      </div>
      <div className="mt-10">
        <AdminAccountSettings />
      </div>
    </div>
  );
}
