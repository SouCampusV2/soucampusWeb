"use client";

import { useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

// Одно поле формы авторизации: подпись + иконка внутри рамки + сам input.
// `revealable` добавляет кнопку-глаз справа (показать/скрыть) и сам
// переключает type между password и text — состояние живёт внутри поля.
//
// Вынесено из AuthForm, когда появились формы сброса пароля: рамка,
// отступы и поведение «глаза» обязаны совпадать во всех формах входа.
export function AuthField({
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
  name,
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
  /** Имя поля. Менеджеры паролей опознают поля не только по
   *  autocomplete, но и по name — без него сохранение часто не
   *  предлагается вовсе. По умолчанию совпадает с id. */
  name?: string;
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
          name={name ?? id}
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
